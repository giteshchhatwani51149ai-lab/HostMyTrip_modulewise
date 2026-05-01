import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Use DATABASE_URL for production (PostgreSQL on Render)
// Fall back to local config for development
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 1,
      acquire: 60000,
      idle: 30000,
      evict: 15000,
    },
  })
  : new Sequelize(
    process.env.DB_NAME || 'hostmytrip',
    process.env.DB_USER || 'hostmytrip_user',
    process.env.DB_PASS || 'HostMyTrip@2026',
    {
      host: process.env.DB_SERVER || 'localhost',
      port: 1433,
      dialect: 'mssql',
      logging: false,
      dialectOptions: {
        authentication: {
          type: 'default',
          options: {
            userName: process.env.DB_USER || 'hostmytrip_user',
            password: process.env.DB_PASS || 'HostMyTrip@2026',
          },
        },
        options: {
          trustServerCertificate: true,
          encrypt: false,
          requestTimeout: 60000,
          connectTimeout: 60000,
          cancelTimeout: 10000,
        },
      },
      pool: {
        max: 5,
        min: 1,
        acquire: 60000,
        idle: 30000,
        evict: 15000,
      },
    }
  );

export default sequelize;