/**
 * Policy Utilities
 * 
 * This module provides utility functions for policy enforcement.
 */

import { PolicyContext, PolicyService } from './policy.service';
import { AccessDeniedError } from '../repositories/base.repository';

/**
 * Policy enforcer function type
 */
export type PolicyEnforcer<T> = (id: string, context: PolicyContext) => Promise<T | null>;

/**
 * Create a policy context from a user ID
 * @param userId The user ID
 * @returns The policy context
 */
export async function createPolicyContext(userId: string): Promise<PolicyContext> {
  const policyService = new PolicyService();
  return policyService.createContext(userId);
}

/**
 * Enforce a policy for a specific resource
 * @param id The resource ID
 * @param userId The user ID
 * @param enforcer The policy enforcer function
 * @param errorMessage The error message to display if access is denied
 * @returns The resource if access is allowed
 * @throws AccessDeniedError if access is denied
 */
export async function enforcePolicy<T>(
  id: string,
  userId: string,
  enforcer: PolicyEnforcer<T>,
  errorMessage: string = 'Access denied'
): Promise<T> {
  const context = await createPolicyContext(userId);
  const resource = await enforcer(id, context);
  
  if (!resource) {
    throw new AccessDeniedError(errorMessage);
  }
  
  return resource;
}

/**
 * Create a where clause for filtering resources by user access
 * @param userId The user ID
 * @param isAdmin Whether the user is an admin
 * @returns The where clause
 */
export function createAccessWhereClause(userId: string, isAdmin: boolean = false) {
  if (isAdmin) {
    return {};
  }
  
  return {
    OR: [
      { userId },
      { isPublic: true },
      
      // {
      //   team: {
      //     members: {
      //       some: {
      //         userId,
      //       },
      //     },
      //   },
      // },
    ],
  };
}

/**
 * Log an audit event
 * @param action The action performed
 * @param tableName The table name
 * @param userId The user ID
 */
export async function logAuditEvent(
  action: string,
  tableName: string,
  userId: string
): Promise<void> {
  const policyService = new PolicyService();
  await policyService.logAuditEvent(action, tableName, userId);
}
