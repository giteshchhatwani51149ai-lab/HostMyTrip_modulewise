import sequelize from './src/config/database';
import { User, Corporate } from './src/models';

async function listUsers() {
  try {
    await sequelize.authenticate();
    const corporates = await Corporate.findAll();
    console.log("Corporates:", JSON.stringify(corporates, null, 2));
    
    const users = await User.findAll();
    console.log("Users:", JSON.stringify(users.map(u => ({ id: u.id, email: u.email, role: u.role, corporateId: u.corporateId })), null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listUsers();
