import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

type ColumnSpec = {
  type: any;
  allowNull?: boolean;
  defaultValue?: any;
  unique?: boolean;
};

async function ensureTable(tableName: string, columns: Record<string, ColumnSpec>) {
  const qi = sequelize.getQueryInterface();
  const tables = await qi.showAllTables();
  const hasTable = tables.map((t: any) => String(t).toLowerCase()).includes(tableName.toLowerCase());
  if (!hasTable) {
    await qi.createTable(tableName, {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      ...columns,
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    });
    console.log(`Created table ${tableName}`);
  }
}

async function ensureColumn(tableName: string, tableDef: Record<string, any>, columnName: string, spec: ColumnSpec) {
  if (tableDef[columnName]) return;
  await sequelize.getQueryInterface().addColumn(tableName, columnName, spec as any);
  console.log(`Added column ${tableName}.${columnName}`);
}

async function migrateTable(tableName: string, columns: Record<string, ColumnSpec>) {
  const qi = sequelize.getQueryInterface();
  const tableDef = await qi.describeTable(tableName);
  for (const [name, spec] of Object.entries(columns)) {
    await ensureColumn(tableName, tableDef, name, spec);
  }
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected. Running corporate schema migration...');

    await ensureTable('corporates', {
      name: { type: DataTypes.STRING(255), allowNull: false },
      taxId: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      creditLimit: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      creditUsed: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    });

    await ensureTable('corporate_booking_approvals', {
      bookingId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      requesterUserId: { type: DataTypes.INTEGER, allowNull: false },
      approverUserId: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
      note: { type: DataTypes.TEXT, allowNull: true },
    });

    await migrateTable('users', {
      corporateId: { type: DataTypes.INTEGER, allowNull: true },
      canBookHotels: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      canBookFlights: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    });

    await migrateTable('bookings', {
      bookingSource: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'direct' },
      corporateId: { type: DataTypes.INTEGER, allowNull: true },
      bookedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      approvalStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'not_required' },
      approvedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      approvedAt: { type: DataTypes.DATE, allowNull: true },
      creditDebited: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    });

    console.log('Corporate schema migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Corporate schema migration failed:', error);
    process.exit(1);
  }
}

run();
