import bcrypt from 'bcryptjs';
import { User } from './models/User.js';

export async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@raptor.local').toLowerCase().trim();
  const exists = await User.findOne({ email });
  if (!exists) {
    const plain = process.env.ADMIN_PASSWORD || 'raptor123';
    const passwordHash = await bcrypt.hash(plain, 10);
    await User.create({ email, passwordHash, displayName: 'Admin' });
    console.log(`[seed] Admin user created: ${email}`);
  }
}
