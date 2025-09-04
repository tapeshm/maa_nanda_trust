#!/usr/bin/env node

import { hash } from 'bcryptjs';
import { execSync } from 'child_process';

const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'trustee', password: 'trustee123', role: 'trustee' }
];

async function seedUsers() {
  console.log('🔐 Generating password hashes and seeding users...');
  
  for (const user of users) {
    const passwordHash = await hash(user.password, 12);
    
    const sql = `INSERT OR REPLACE INTO admin_users (username, password_hash, role) VALUES ('${user.username}', '${passwordHash}', '${user.role}');`;
    
    try {
      execSync(`npx wrangler d1 execute DB --command="${sql}"`, { stdio: 'inherit' });
      console.log(`✅ User '${user.username}' with role '${user.role}' seeded successfully`);
    } catch (error) {
      console.error(`❌ Failed to seed user '${user.username}':`, error.message);
    }
  }
  
  console.log('🎉 User seeding complete!');
}

seedUsers().catch(console.error);