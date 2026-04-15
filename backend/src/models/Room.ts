import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Room extends Model {
  public id!: number;
  public hotelId!: number;
  public type!: string;
  public pricePerNight!: number;
  public maxOccupancy!: number;
  public description!: string;
  public images!: string;
  public available!: boolean;
}

Room.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    hotelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'hotels', key: 'id' },
    },
    type: { type: DataTypes.STRING(100), allowNull: false },
    pricePerNight: { type: DataTypes.FLOAT, allowNull: false },
    maxOccupancy: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    description: { type: DataTypes.TEXT, allowNull: true },
    images: { type: DataTypes.TEXT, defaultValue: '[]' },
    available: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, modelName: 'Room', tableName: 'rooms', timestamps: true }
);
