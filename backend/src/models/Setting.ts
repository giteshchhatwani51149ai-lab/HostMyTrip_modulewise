import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Setting extends Model {
  public key!: string;
  public val!: string;
}

Setting.init(
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    val: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Setting',
    tableName: 'settings',
    timestamps: true,
  }
);
