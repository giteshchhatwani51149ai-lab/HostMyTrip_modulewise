import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
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
        requestTimeout: 60000,   // 60s per query (was 30s — too short for slow local MSSQL)
        connectTimeout: 60000,   // 60s to establish TCP connection
        cancelTimeout: 10000,
      },
    },
    pool: {
      max: 5,          // Reduced from 10 — local MSSQL gets overwhelmed with too many parallel connections
      min: 1,          // Keep 1 connection alive so we don't reconnect on every request
      acquire: 60000,  // Max time (ms) to wait for a free connection from pool
      idle: 30000,     // Release idle connections after 30s
      evict: 15000,    // Check for dead connections every 15s
    },
  }
);

export default sequelize;
