import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class User extends Model {
  public id!: number;
  public email!: string;
  public password!: string | null;
  public googleId!: string | null;
  public name!: string | null;
  public avatar!: string | null;
  public role!: string;
  public corporateId!: number | null;
  public canBookHotels!: boolean;
  public canBookFlights!: boolean;
  public isVerified!: boolean;
  public verificationToken!: string | null;
  public resetPasswordToken!: string | null;
  public resetPasswordExpires!: Date | null;
  public phone!: string | null;
  public dateOfBirth!: Date | null;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    googleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(20),
      defaultValue: 'customer',
      validate: { isIn: [['customer', 'admin', 'employee', 'corporate_admin', 'corporate_employee']] },
    },
    corporateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    canBookHotels: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    canBookFlights: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
  }
);
