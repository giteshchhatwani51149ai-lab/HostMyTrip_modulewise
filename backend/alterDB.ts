import sequelize from './src/config/database';

async function alterDB() {
  try {
    await sequelize.authenticate();
    await sequelize.query('ALTER TABLE bookings ALTER COLUMN roomId INT NULL;');
    await sequelize.query('ALTER TABLE bookings ALTER COLUMN hotelId INT NULL;');
    console.log("Altered bookings table to allow NULL for roomId and hotelId.");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
alterDB();
