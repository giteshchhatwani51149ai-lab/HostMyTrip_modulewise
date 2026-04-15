import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Review extends Model {
  public id!: number;
  public userId!: number;
  public hotelId!: number;
  public bookingId!: number;
  public rating!: number;
  public comment!: string;
}

Review.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    hotelId: { type: DataTypes.INTEGER, allowNull: false },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'Review', tableName: 'reviews', timestamps: true }
);
