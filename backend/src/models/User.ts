import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class User extends Model {
  public id!: number;
  public email!: string;
  public password!: string;
  public role!: string;
  public isVerified!: boolean;
  public verificationToken!: string | null;
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
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(20),
      defaultValue: 'customer',
      validate: { isIn: [['customer', 'admin', 'employee']] },
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationToken: {
      type: DataTypes.STRING(255),
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
