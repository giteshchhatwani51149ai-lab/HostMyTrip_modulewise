import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Payment extends Model {
  public id!: number;
  public bookingId!: number;
  public amount!: number;
  public gateway!: string;
  public gatewayPaymentId!: string | null;
  public status!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    gateway: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'stripe',
    },
    gatewayPaymentId: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'success', 'failed']] },
    },
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
  }
);
