import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class FlightBooking extends Model {
  public id!: number;
  public bookingId!: number;
  public origin!: string;
  public destination!: string;
  public departureDate!: Date;
  public returnDate!: Date | null;
  public passengers!: string | null;
  public airline!: string | null;
  public pnr!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FlightBooking.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false },
    origin: { type: DataTypes.STRING(100), allowNull: false },
    destination: { type: DataTypes.STRING(100), allowNull: false },
    departureDate: { type: DataTypes.DATE, allowNull: false },
    returnDate: { type: DataTypes.DATE, allowNull: true },
    passengers: { type: DataTypes.TEXT, allowNull: true },
    airline: { type: DataTypes.STRING(100), allowNull: true },
    pnr: { type: DataTypes.STRING(50), allowNull: true },
  },
  {
    sequelize,
    modelName: 'FlightBooking',
    tableName: 'flight_bookings',
    timestamps: true,
  }
);
