import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class NewsletterSubscriber extends Model {
  public id!: number;
  public email!: string;
  public subscribedAt!: Date;
}

NewsletterSubscriber.init(
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
    subscribedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'newsletter_subscribers',
    timestamps: false,
  }
);
