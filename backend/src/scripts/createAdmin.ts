/**
 * Create Admin User for Production
 * 
 * Usage:
 *   npm run create-admin -- email=admin@yourdomain.com password=YourStrongPassword123
 * 
 * Or with npx ts-node:
 *   npx ts-node src/scripts/createAdmin.ts admin@yourdomain.com YourStrongPassword123
 * 
 * In production (Render Shell):
 *   node dist/scripts/createAdmin.js admin@yourdomain.com YourStrongPassword123
 */

import sequelize from '../config/database';
import { User } from '../models';
import bcrypt from 'bcrypt';

async function createAdmin() {
  const args = process.argv.slice(2);
  
  // Parse args: either --email=x --password=y or positional
  let email = '';
  let password = '';
  
  args.forEach(arg => {
    if (arg.startsWith('email=')) email = arg.split('=')[1];
    if (arg.startsWith('password=')) password = arg.split('=')[1];
  });
  
  // If not found with =, try positional
  if (!email && args[0]) email = args[0];
  if (!password && args[1]) password = args[1];
  
  if (!email || !password) {
    console.error('❌ Usage: npm run create-admin -- email=admin@domain.com password=StrongPass123');
    console.error('   Or:    node dist/scripts/createAdmin.js admin@domain.com StrongPass123');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if user already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log(`⚠️  User ${email} already exists`);
      const role = (existing as any).role;
      if (role !== 'admin') {
        console.log(`   Current role: ${role}. Run update to admin?`);
        console.log(`   To upgrade: Set role to 'admin' in database or create new admin email`);
      } else {
        console.log(`   Role: admin (already set)`);
      }
      process.exit(0);
    }

    // Validate password strength
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12); // Higher rounds for production
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = await User.create({
      email,
      password: hashedPassword,
      role: 'admin',
      isVerified: true, // Admin is pre-verified
      name: 'Administrator',
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('┌─────────────────────────────────────┐');
    console.log('│  ADMIN LOGIN CREDENTIALS            │');
    console.log('├─────────────────────────────────────┤');
    console.log(`│  Email:    ${email.padEnd(30)}│`);
    console.log(`│  Password: ${'*'.repeat(password.length).padEnd(30)}│`);
    console.log('│                                     │');
    console.log('│  Login URL: /login (admin portal)   │');
    console.log('└─────────────────────────────────────┘');
    console.log('');
    console.log('⚠️  Save these credentials securely!');
    console.log('🔒 You can also create employee users with role=employee');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
    process.exit(1);
  }
}

createAdmin();
