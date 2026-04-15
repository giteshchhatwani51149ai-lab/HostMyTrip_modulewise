import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Bookmark extends Model {
  public id!: number;
  public userId!: number;
  public hotelId!: number;
}

Bookmark.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    hotelId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    modelName: 'Bookmark',
    tableName: 'bookmarks',
    timestamps: true,
    // Note: MSSQL supports unique constraints on column pairs via indexes
    indexes: [{ unique: true, fields: ['userId', 'hotelId'] }],
  }
);
