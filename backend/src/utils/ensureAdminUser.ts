import bcrypt from 'bcrypt';
import { User } from '../models';

export async function ensureAdminUser() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('ℹ️  Skipping auto-admin creation (INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD not set)');
    return;
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log(`ℹ️  Admin user ${email} already exists.`);
      return;
    }

    console.log(`🚀 Creating initial admin user: ${email}`);
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      email,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      name: 'Primary Administrator',
    });

    console.log('✅ Initial admin user created successfully!');
  } catch (error) {
    console.error('❌ Error in ensureAdminUser:', error);
  }
}
