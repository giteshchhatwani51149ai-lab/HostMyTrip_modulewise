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
  public bookingSource!: string;
  public corporateId!: number | null;
  public bookedByUserId!: number | null;
  public approvalStatus!: string;
  public approvedByUserId!: number | null;
  public approvedAt!: Date | null;
  public creditDebited!: number;
  public bookingReference!: string | null;
  public currency!: string;
  public origin!: string | null;
  public destination!: string | null;
  public departureDate!: Date | null;
  public returnDate!: Date | null;
  public passengers!: string | null;
  public airline!: string | null;
  public pnr!: string | null;
  public rooms!: number;
  public internalNotes!: string | null;
  public cancelReason!: string | null;
  public cancelledAt!: Date | null;
  // Refund tracking
  public refundStatus!: 'none' | 'initiated' | 'processing' | 'completed' | 'failed';
  public refundAmount!: number | null;
  public cancellationFee!: number | null;
  public refundId!: string | null;
  public refundInitiatedAt!: Date | null;
  public refundCompletedAt!: Date | null;
  public refundFailureReason!: string | null;
  public paymentGateway!: string | null;
  public paymentTxnId!: string | null;
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
    bookingReference: { type: DataTypes.STRING(50), allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'INR' },
    origin: { type: DataTypes.STRING(100), allowNull: true },
    destination: { type: DataTypes.STRING(100), allowNull: true },
    departureDate: { type: DataTypes.DATE, allowNull: true },
    returnDate: { type: DataTypes.DATE, allowNull: true },
    passengers: { type: DataTypes.TEXT, allowNull: true },
    airline: { type: DataTypes.STRING(100), allowNull: true },
    pnr: { type: DataTypes.STRING(50), allowNull: true },
    rooms: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
    internalNotes: { type: DataTypes.TEXT, allowNull: true },
    cancelReason:  { type: DataTypes.STRING(500), allowNull: true },
    cancelledAt:   { type: DataTypes.DATE, allowNull: true },
    bookingSource: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'direct',
      validate: { isIn: [['direct', 'corporate', 'admin']] },
    },
    corporateId: { type: DataTypes.INTEGER, allowNull: true },
    bookedByUserId: { type: DataTypes.INTEGER, allowNull: true },
    approvalStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'not_required',
      validate: { isIn: [['not_required', 'pending', 'approved', 'rejected']] },
    },
    approvedByUserId: { type: DataTypes.INTEGER, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    creditDebited: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    // Refund tracking
    refundStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'none',
      validate: { isIn: [['none', 'initiated', 'processing', 'completed', 'failed']] },
    },
    refundAmount:        { type: DataTypes.FLOAT,    allowNull: true },
    cancellationFee:     { type: DataTypes.FLOAT,    allowNull: true },
    refundId:            { type: DataTypes.STRING(255), allowNull: true },
    refundInitiatedAt:   { type: DataTypes.DATE,     allowNull: true },
    refundCompletedAt:   { type: DataTypes.DATE,     allowNull: true },
    refundFailureReason: { type: DataTypes.STRING(500), allowNull: true },
    paymentGateway:      { type: DataTypes.STRING(20),  allowNull: true },
    paymentTxnId:        { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    sequelize,
    modelName: 'Booking',
    tableName: 'bookings',
    timestamps: true,
  }
);
