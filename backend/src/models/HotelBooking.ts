import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class HotelBooking extends Model {
  public id!: number;
  public bookingId!: number;
  public hotelName!: string | null;
  public location!: string | null;
  public checkIn!: Date;
  public checkOut!: Date;
  public rooms!: number;
  public guests!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

HotelBooking.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false },
    hotelName: { type: DataTypes.STRING(255), allowNull: true },
    location: { type: DataTypes.STRING(255), allowNull: true },
    checkIn: { type: DataTypes.DATEONLY, allowNull: false },
    checkOut: { type: DataTypes.DATEONLY, allowNull: false },
    rooms: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
    guests: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'HotelBooking',
    tableName: 'hotel_bookings',
    timestamps: true,
  }
);
