/**
 * @zyra/database
 * 
 * This package provides a centralized database access layer for the Zyra platform.
 * It exports the Prisma client, repositories, authentication services, and utility functions.
 */

// Export Prisma client
export { default as prisma } from './client';

// Export all types
export * from './types';

// Export repositories
export * from './repositories/base.repository';
export * from './repositories/user.repository';
export * from './repositories/workflow.repository';
export * from './repositories/execution.repository';
export * from './repositories/wallet.repository';
export * from './repositories/notification.repository';

// Export authentication
export * from './auth/types';
export * from './auth/jwt.service';
export * from './auth/auth.service';
export * from './auth/middleware';

// Export utilities
export * from './utils/validation';
export * from './utils/pagination';
export * from './utils/migration';
