/**
 * Authentication Middleware
 * 
 * This module provides middleware functions for authenticating API requests.
 * It integrates with the JWT authentication system and injects user context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtService } from '../auth/jwt.service';
import { AuthService } from '../auth/auth.service';
import { PolicyContext } from '../policies/policy.service';
import { createPolicyContext } from '../policies/policy-utils';

// Initialize services
const jwtService = new JwtService();
const authService = new AuthService();

/**
 * Authentication error response
 * @param message The error message
 * @param status The HTTP status code
 * @returns The error response
 */
function authError(message: string, status: number = 401) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * Extract the authorization token from a request
 * @param req The request object
 * @returns The token or null
 */
function extractToken(req: NextRequest): string | null {
  // Check for Authorization header
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check for token in cookies
  const tokenCookie = req.cookies.get('token');
  if (tokenCookie) {
    return tokenCookie.value;
  }
  
  return null;
}

/**
 * Verify authentication for a request
 * @param req The request object
 * @returns The user ID or null
 */
export async function verifyAuth(req: NextRequest): Promise<string | null> {
  const token = extractToken(req);
  if (!token) return null;
  
  return authService.verifySession(token);
}

/**
 * Authentication middleware for Next.js API routes
 * @param req The request object
 * @returns The response or null if authentication is successful
 */
export async function authMiddleware(req: NextRequest) {
  const userId = await verifyAuth(req);
  
  if (!userId) {
    return authError('Unauthorized: Invalid or missing token');
  }
  
  // Add user ID to request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', userId);
  
  // Create policy context and add admin status to headers
  const context = await createPolicyContext(userId);
  if (context.isAdmin) {
    requestHeaders.set('x-user-admin', 'true');
  }
  
  // Continue to the next middleware or API route
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Get the user ID from a request
 * @param req The request object
 * @returns The user ID or null
 */
export function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id');
}

/**
 * Get the policy context from a request
 * @param req The request object
 * @returns The policy context or null
 */
export async function getPolicyContext(req: NextRequest): Promise<PolicyContext | null> {
  const userId = getUserId(req);
  if (!userId) return null;
  
  const isAdmin = req.headers.get('x-user-admin') === 'true';
  
  // Create a basic context with the information we have
  return {
    userId,
    isAdmin,
  };
}

/**
 * Get the user from a request
 * @param req The request object
 * @returns The user or null
 */
export async function getUser(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return null;
  
  return authService.getUserById(userId);
}

/**
 * Express middleware for authenticating requests
 * This is for use with the NestJS worker
 */
export function expressAuthMiddleware() {
  return async (req: any, res: any, next: any) => {
    // Extract token from request
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    
    // Verify token
    const userId = authService.verifySession(token);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    // Add user ID to request
    req.userId = userId;
    
    // Create policy context and add to request
    const context = await createPolicyContext(userId);
    req.policyContext = context;
    
    // Continue to the next middleware
    next();
  };
}
