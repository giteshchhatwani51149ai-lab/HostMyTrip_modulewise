import sequelize from './src/config/database';
import { User } from './src/models';
import bcrypt from 'bcrypt';

async function reset() {
  try {
    await sequelize.authenticate();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Infy@123', salt);
    
    await User.update({ password: hash }, { where: { email: 'emp.infy@hostmytrip.com' } });
    await User.update({ password: hash }, { where: { email: 'corpadmin.infy@hostmytrip.com' } });
    console.log("Passwords updated for Infy users to Infy@123");

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
reset();
