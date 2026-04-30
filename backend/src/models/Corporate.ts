import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Corporate extends Model {
  public id!: number;
  public name!: string;
  public taxId!: string;
  public creditLimit!: number;
  public creditUsed!: number;
  public status!: string;
  // Margin settings - can use either percent OR amount (amount takes priority if set)
  public flightMarginPercent!: number | null;
  public flightMarginAmount!: number | null;
  public hotelMarginPercent!: number | null;
  public hotelMarginAmount!: number | null;
}

Corporate.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    taxId: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    creditLimit: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    creditUsed: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: { isIn: [['active', 'disabled']] },
    },
    // Flight margins - if amount is set, it takes priority over percent
    flightMarginPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      field: 'flight_margin_percent',
      comment: 'Percentage margin for flights (e.g., 10 for 10%). Amount takes priority if set.',
    },
    flightMarginAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      field: 'flight_margin_amount',
      comment: 'Fixed amount margin for flights in INR (e.g., 50 for ₹50). Takes priority over percent.',
    },
    // Hotel margins - if amount is set, it takes priority over percent
    hotelMarginPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      field: 'hotel_margin_percent',
      comment: 'Percentage margin for hotels (e.g., 15 for 15%). Amount takes priority if set.',
    },
    hotelMarginAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      field: 'hotel_margin_amount',
      comment: 'Fixed amount margin for hotels in INR (e.g., 500 for ₹500). Takes priority over percent.',
    },
  },
  {
    sequelize,
    modelName: 'Corporate',
    tableName: 'corporates',
    timestamps: true,
  }
);
