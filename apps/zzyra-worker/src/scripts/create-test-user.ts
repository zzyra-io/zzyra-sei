#!/usr/bin/env ts-node

import { config } from 'dotenv';
import * as path from 'path';
import { prisma } from '@zzyra/database';

// Load environment variables
config({ path: path.join(__dirname, '../../../.env') });

async function createTestUser() {
  const testUserId = 'fcd603d5-73c3-4cac-8694-4af332370482';
  const testEmail = 'test@sei-network.com';

  try {
    console.log('🔧 Creating test user...');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: testUserId },
    });

    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.email);
      return testUserId;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        email: testEmail,
      },
    });

    // Create profile for the user
    await prisma.profile.create({
      data: {
        id: testUserId,
        email: testEmail,
        fullName: 'Sei Test User',
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive',
        monthlyExecutionQuota: 1000,
        monthlyExecutionCount: 0,
      },
    });

    console.log('✅ Test user created successfully:', user.email);
    return testUserId;
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('🎉 Test user setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test user setup failed:', error);
      process.exit(1);
    });
}

export { createTestUser };
