import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

type ColumnSpec = {
  type: any;
  allowNull?: boolean;
  defaultValue?: any;
};

async function ensureColumn(
  tableName: string,
  tableDef: Record<string, any>,
  columnName: string,
  spec: ColumnSpec
) {
  if (tableDef[columnName]) return;
  await sequelize.getQueryInterface().addColumn(tableName, columnName, spec as any);
  console.log(`Added column ${tableName}.${columnName}`);
}

async function migrateTable(tableName: string, columns: Record<string, ColumnSpec>) {
  try {
    const tableDef = await sequelize.getQueryInterface().describeTable(tableName);
    for (const [columnName, spec] of Object.entries(columns)) {
      await ensureColumn(tableName, tableDef, columnName, spec);
    }
  } catch (err: any) {
    console.error(`Failed migrating table "${tableName}":`, err?.message || err);
    throw err;
  }
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected. Running legacy schema migration...');

    await migrateTable('bookings', {
      userId: { type: DataTypes.INTEGER, allowNull: true },
      roomId: { type: DataTypes.INTEGER, allowNull: true },
      hotelId: { type: DataTypes.INTEGER, allowNull: true },
      checkIn: { type: DataTypes.DATEONLY, allowNull: true },
      checkOut: { type: DataTypes.DATEONLY, allowNull: true },
      guests: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
      totalAmount: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
      paidAmount: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
      paymentType: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'full' },
      paymentStatus: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'pending' },
      status: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'pending' },
      stripePaymentIntentId: { type: DataTypes.STRING(255), allowNull: true },
      guestName: { type: DataTypes.STRING(255), allowNull: true },
      guestEmail: { type: DataTypes.STRING(255), allowNull: true },
      guestPhone: { type: DataTypes.STRING(50), allowNull: true },
      externalHotelName: { type: DataTypes.STRING(255), allowNull: true },
      externalRoomType: { type: DataTypes.STRING(100), allowNull: true },
      externalCity: { type: DataTypes.STRING(100), allowNull: true },
      amadeusOfferId: { type: DataTypes.STRING(500), allowNull: true },
      amadeusBookingRef: { type: DataTypes.STRING(100), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    });

    await migrateTable('reviews', {
      userId: { type: DataTypes.INTEGER, allowNull: true },
      hotelId: { type: DataTypes.INTEGER, allowNull: true },
      bookingId: { type: DataTypes.INTEGER, allowNull: true },
      rating: { type: DataTypes.FLOAT, allowNull: true },
      comment: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    });

    await migrateTable('hotels', {
      images: { type: DataTypes.TEXT, allowNull: true },
      rating: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
      city: { type: DataTypes.STRING(100), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    });

    await migrateTable('rooms', {
      hotelId: { type: DataTypes.INTEGER, allowNull: true },
      type: { type: DataTypes.STRING(100), allowNull: true },
      pricePerNight: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
      maxOccupancy: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 2 },
      images: { type: DataTypes.TEXT, allowNull: true },
      available: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    });

    console.log('Legacy schema migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Legacy migration failed:', err);
    process.exit(1);
  }
}

run();
