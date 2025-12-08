import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import after dotenv config
import { query } from '../src/config/database';

/**
 * Script to create admin user
 * Run: npx ts-node backend/scripts/createAdminUser.ts
 */

const createAdminUser = async () => {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  const email = process.argv[4] || 'admin@focusshield.com';
  const fullName = process.argv[5] || 'System Administrator';

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Check if user exists
    const existing = await query(
      `SELECT id FROM admin_users WHERE username = ? OR email = ?`,
      [username, email]
    );

    if (existing.rows.length > 0) {
      // Update existing user
      await query(
        `UPDATE admin_users 
         SET password_hash = ?, full_name = ?, is_active = true 
         WHERE username = ? OR email = ?`,
        [passwordHash, fullName, username, email]
      );
      console.log(`✅ Updated admin user: ${username}`);
    } else {
      // Create new user
      await query(
        `INSERT INTO admin_users (username, email, password_hash, full_name, role) 
         VALUES (?, ?, ?, ?, 'super_admin')`,
        [username, email, passwordHash, fullName]
      );
      console.log(`✅ Created admin user: ${username}`);
    }

    console.log(`\n📝 Login credentials:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
    console.log(`\n⚠️  Please change password after first login!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();

