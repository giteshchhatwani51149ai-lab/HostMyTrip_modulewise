import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Hotel extends Model {
  public id!: number;
  public name!: string;
  public city!: string;
  public address!: string;
  public description!: string;
  public images!: string;
  public rating!: number;
  public reviewCount!: number;
  public amenities!: string;
  public starRating!: number;
}

Hotel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    city: { type: DataTypes.STRING(100), allowNull: false },
    address: { type: DataTypes.STRING(500), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    images: { type: DataTypes.TEXT, defaultValue: '[]' },       // JSON string
    rating: { type: DataTypes.FLOAT, defaultValue: 0 },
    reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    amenities: { type: DataTypes.TEXT, defaultValue: '[]' },    // JSON string
    starRating: { type: DataTypes.INTEGER, defaultValue: 3 },
  },
  { sequelize, modelName: 'Hotel', tableName: 'hotels', timestamps: true }
);
