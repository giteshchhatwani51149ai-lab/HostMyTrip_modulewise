import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Booking extends Model {
  public id!: number;
  public userId!: number | null;
  public roomId!: number;
  public hotelId!: number;
  public checkIn!: Date;
  public checkOut!: Date;
  public guests!: number;
  public totalAmount!: number;
  public paidAmount!: number;
  public paymentType!: string;
  public paymentStatus!: string;
  public status!: string;
  public stripePaymentIntentId!: string | null;
  public guestName!: string;
  public guestEmail!: string;
  public guestPhone!: string | null;
  public externalHotelName!: string | null;
  public externalRoomType!: string | null;
  public externalCity!: string | null;
  public amadeusOfferId!: string | null;
  public amadeusBookingRef!: string | null;
}

Booking.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    roomId: { type: DataTypes.INTEGER, allowNull: true },
    hotelId: { type: DataTypes.INTEGER, allowNull: true },
    checkIn: { type: DataTypes.DATEONLY, allowNull: false },
    checkOut: { type: DataTypes.DATEONLY, allowNull: false },
    guests: { type: DataTypes.INTEGER, defaultValue: 1 },
    totalAmount: { type: DataTypes.FLOAT, allowNull: false },
    paidAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
    // Using STRING instead of ENUM for MSSQL compatibility
    paymentType: {
      type: DataTypes.STRING(20),
      defaultValue: 'full',
      validate: { isIn: [['partial', 'full']] },
    },
    paymentStatus: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'partial', 'paid', 'failed']] },
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'confirmed', 'cancelled', 'completed', 'failed']] },
    },
    stripePaymentIntentId: { type: DataTypes.STRING(255), allowNull: true },
    guestName: { type: DataTypes.STRING(255), allowNull: false },
    guestEmail: { type: DataTypes.STRING(255), allowNull: false },
    guestPhone: { type: DataTypes.STRING(50), allowNull: true },
    externalHotelName: { type: DataTypes.STRING(255), allowNull: true },
    externalRoomType: { type: DataTypes.STRING(100), allowNull: true },
    externalCity: { type: DataTypes.STRING(100), allowNull: true },
    amadeusOfferId: { type: DataTypes.STRING(500), allowNull: true },
    amadeusBookingRef: { type: DataTypes.STRING(100), allowNull: true },
  },
  {
    sequelize,
    modelName: 'Booking',
    tableName: 'bookings',
    timestamps: true,
  }
);
