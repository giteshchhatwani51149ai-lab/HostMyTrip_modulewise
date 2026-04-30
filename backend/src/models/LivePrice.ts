import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface LivePriceAttributes {
  id: number;
  type: 'hotel' | 'flight';
  externalId: string;
  source: string;
  searchParams: Record<string, any>;
  actualPrice: number;
  marginPercent: number;
  finalPrice: number;
  currency: string;
  capturedAt: Date;
  expiresAt: Date;
}

export interface LivePriceCreationAttributes extends Optional<LivePriceAttributes, 'id' | 'capturedAt' | 'expiresAt'> {}

export class LivePrice extends Model<LivePriceAttributes, LivePriceCreationAttributes> implements LivePriceAttributes {
  public id!: number;
  public type!: 'hotel' | 'flight';
  public externalId!: string;
  public source!: string;
  public searchParams!: Record<string, any>;
  public actualPrice!: number;
  public marginPercent!: number;
  public finalPrice!: number;
  public currency!: string;
  public capturedAt!: Date;
  public expiresAt!: Date;
}

LivePrice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('hotel', 'flight'),
      allowNull: false,
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'external_id',
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'API source: serpapi, amadeus, kiwi, travelpayouts, etc.',
    },
    searchParams: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'search_params',
    },
    actualPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'actual_price',
      comment: 'Original price from live API',
    },
    marginPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: 'margin_percent',
      defaultValue: 10,
    },
    finalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'final_price',
      comment: 'Price shown to end user (actual + margin)',
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'INR',
    },
    capturedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'captured_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
  },
  {
    sequelize,
    modelName: 'LivePrice',
    tableName: 'live_prices',
    timestamps: false,
    indexes: [
      { fields: ['type', 'external_id'] },
      { fields: ['source'] },
      { fields: ['captured_at'] },
      { fields: ['expires_at'] },
    ],
  }
);

export default LivePrice;
