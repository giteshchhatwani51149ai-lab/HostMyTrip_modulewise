import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class CorporateBookingApproval extends Model {
  public id!: number;
  public bookingId!: number;
  public requesterUserId!: number;
  public approverUserId!: number | null;
  public status!: string;
  public note!: string | null;
}

CorporateBookingApproval.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    requesterUserId: { type: DataTypes.INTEGER, allowNull: false },
    approverUserId: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'approved', 'rejected']] },
    },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'CorporateBookingApproval',
    tableName: 'corporate_booking_approvals',
    timestamps: true,
  }
);
