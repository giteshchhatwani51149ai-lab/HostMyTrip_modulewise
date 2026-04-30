import sequelize from '../config/database';
import { Corporate, User } from '../models';
import bcrypt from 'bcrypt';

async function seedCorporate() {
  try {
    await sequelize.authenticate();
    console.log('DB Connected...');

    // 1. Create corporate account
    const [corp] = await Corporate.findOrCreate({
      where: { taxId: 'CORP001TAX' },
      defaults: {
        name: 'TechCorp India Pvt Ltd',
        taxId: 'CORP001TAX',
        creditLimit: 500000,
        creditUsed: 0,
        status: 'active',
      },
    });
    console.log(`Corporate: ${corp.name} (id=${corp.id})`);

    // 2. Create corporate_admin user
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Corporate@123', salt);

    const [corpAdmin, created1] = await User.findOrCreate({
      where: { email: 'corp.admin@techcorp.com' },
      defaults: {
        email: 'corp.admin@techcorp.com',
        password: adminHash,
        name: 'Corporate Admin',
        role: 'corporate_admin',
        corporateId: corp.id,
        canBookHotels: true,
        canBookFlights: true,
        isVerified: true,
      },
    });
    console.log(`Corporate Admin: ${corpAdmin.email} (${created1 ? 'created' : 'already exists'})`);

    // 3. Create corporate_employee user
    const empHash = await bcrypt.hash('CorpEmp@123', salt);
    const [corpEmp, created2] = await User.findOrCreate({
      where: { email: 'corp.employee@techcorp.com' },
      defaults: {
        email: 'corp.employee@techcorp.com',
        password: empHash,
        name: 'Corporate Employee',
        role: 'corporate_employee',
        corporateId: corp.id,
        canBookHotels: true,
        canBookFlights: true,
        isVerified: true,
      },
    });
    console.log(`Corporate Employee: ${corpEmp.email} (${created2 ? 'created' : 'already exists'})`);

    console.log('\n✅ Corporate seed complete!');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│  Corporate Admin                                │');
    console.log('│  Email:    corp.admin@techcorp.com              │');
    console.log('│  Password: Corporate@123                        │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log('│  Corporate Employee                             │');
    console.log('│  Email:    corp.employee@techcorp.com           │');
    console.log('│  Password: CorpEmp@123                          │');
    console.log('└─────────────────────────────────────────────────┘');
    process.exit(0);
  } catch (error) {
    console.error('Corporate seed failed:', error);
    process.exit(1);
  }
}

seedCorporate();
