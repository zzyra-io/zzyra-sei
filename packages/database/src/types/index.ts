/**
 * Database Types
 *
 * This module exports types for the database package.
 * It integrates with the @zyra/types package to ensure consistency.
 */

import { BlockType, NodeCategory } from "@zyra/types";

// Re-export types from @zyra/types for consistency
export { BlockType, NodeCategory };

// Export Prisma types
export * from "@prisma/client";

// Export repository types
export * from "../repositories/workflow.repository";
export * from "../repositories/user.repository";
export * from "../repositories/execution.repository";

// Export auth types
export * from "../auth/types";
