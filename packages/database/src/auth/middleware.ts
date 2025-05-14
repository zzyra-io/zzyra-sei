/**
 * Authentication Middleware
 * 
 * This module provides middleware functions for protecting API routes.
 * It verifies JWT tokens and adds user information to the request context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtService } from './jwt.service';
import { AuthService } from './auth.service';

const jwtService = new JwtService();
const authService = new AuthService();

/**
 * Middleware for Next.js API routes to verify authentication
 * @param req The Next.js request object
 * @returns The Next.js response object or null if authentication is successful
 */
export async function verifyAuth(req: NextRequest) {
  // Get the authorization header
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing or invalid token' },
      { status: 401 }
    );
  }

  // Extract the token
  const token = authHeader.split(' ')[1];
  
  // Verify the token
  const userId = authService.verifySession(token);
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or expired token' },
      { status: 401 }
    );
  }

  // Add the user ID to the request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', userId);
  
  // Return the modified request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Get the user ID from the request
 * @param req The Next.js request object
 * @returns The user ID or null if not authenticated
 */
export function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id');
}

/**
 * Get the user from the request
 * @param req The Next.js request object
 * @returns The user or null if not authenticated
 */
export async function getUser(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return null;
  
  return authService.getUserById(userId);
}

/**
 * Express middleware for verifying authentication
 * This is for use with the NestJS worker
 */
export function expressAuthMiddleware() {
  return (req: any, res: any, next: any) => {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const userId = authService.verifySession(token);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    // Add the user ID to the request
    req.userId = userId;
    
    // Continue to the next middleware
    next();
  };
}
