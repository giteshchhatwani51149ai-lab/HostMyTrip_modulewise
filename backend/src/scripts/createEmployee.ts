/**
 * Create Employee User for Production
 * 
 * Usage:
 *   npm run create-employee -- email=emp@company.com password=Pass123 name="John Doe"
 * 
 * In production (Render Shell):
 *   node dist/scripts/createEmployee.js emp@company.com Pass123 "John Doe"
 */

import sequelize from '../config/database';
import { User } from '../models';
import bcrypt from 'bcrypt';

async function createEmployee() {
  const args = process.argv.slice(2);
  
  let email = '';
  let password = '';
  let name = '';
  
  args.forEach(arg => {
    if (arg.startsWith('email=')) email = arg.split('=')[1];
    if (arg.startsWith('password=')) password = arg.split('=')[1];
    if (arg.startsWith('name=')) name = arg.split('=')[1];
  });
  
  if (!email && args[0]) email = args[0];
  if (!password && args[1]) password = args[1];
  if (!name && args[2]) name = args[2];
  
  if (!email || !password) {
    console.error('❌ Usage: npm run create-employee -- email=emp@domain.com password=Pass123 name="John"');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log(`⚠️  User ${email} already exists`);
      process.exit(0);
    }

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      email,
      password: hashedPassword,
      role: 'employee',
      isVerified: true,
      name: name || 'Staff Member',
    });

    console.log('✅ Employee user created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Role: employee`);
    console.log(`   Can book hotels/flights for customers via admin portal`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create employee:', error);
    process.exit(1);
  }
}

createEmployee();
