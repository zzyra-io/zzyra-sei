/**
 * UI Authentication Example
 *
 * This example demonstrates how to use the authentication system in a Next.js API route.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  AuthService,
  WorkflowRepository,
  authMiddleware,
  getUserId,
  getPolicyContext,
} from "@zzyra/database";
import { BlockType } from "@zzyra/types";

// Initialize services
const authService = new AuthService();
const workflowRepository = new WorkflowRepository();

/**
 * Middleware configuration for protected routes
 */
export const config = {
  matcher: ["/api/workflows/:path*", "/api/executions/:path*"],
};

/**
 * Middleware for protected routes
 */
export async function middleware(req: NextRequest) {
  return authMiddleware(req);
}

/**
 * Example API route handler for creating a workflow
 */
export async function POST(req: NextRequest) {
  try {
    // Get user ID from request (set by middleware)
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await req.json();

    // Create workflow with user ID for policy enforcement
    const workflow = await workflowRepository.create(
      {
        name: body.name,
        description: body.description,
        definition: body.definition,
        nodes: body.nodes,
        edges: body.edges,
        isPublic: body.isPublic || false,
        tags: body.tags || [],
        version: 1,
      },
      userId
    );

    return NextResponse.json(workflow);
  } catch (error: any) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create workflow" },
      { status: 500 }
    );
  }
}

/**
 * Example API route handler for getting workflows
 */
export async function GET(req: NextRequest) {
  try {
    // Get user ID from request (set by middleware)
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get policy context for additional checks
    const policyContext = await getPolicyContext(req);

    // Get workflows for the user
    const workflows = await workflowRepository.findByUserId(userId);

    return NextResponse.json(workflows);
  } catch (error: any) {
    console.error("Error getting workflows:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get workflows" },
      { status: 500 }
    );
  }
}

/**
 * Example authentication route handler
 */
export async function authenticateWithDynamic(
  authToken: string,
  email: string,
  walletAddress: string
) {
  try {
    // In a real implementation, you would validate the Dynamic JWT token
    // For this example, we're just using the provided data

    // Authenticate with Dynamic wallet
    const authResult = await authService.authenticateWithWallet(
      walletAddress,
      "1329", // SEI Network chain ID
      "evm"
    );

    return authResult;
  } catch (error: any) {
    console.error("Dynamic authentication error:", error);
    throw error;
  }
}

/**
 * Example wallet authentication handler
 */
export async function authenticateWithWallet(
  walletAddress: string,
  chainId: string,
  chainType: string
) {
  try {
    // Authenticate with wallet
    const authResult = await authService.authenticateWithWallet(
      walletAddress,
      chainId,
      chainType
    );

    return authResult;
  } catch (error: any) {
    console.error("Wallet authentication error:", error);
    throw error;
  }
}

/**
 * Example sign out handler
 */
export async function signOut(userId: string) {
  try {
    await authService.signOut(userId);
    return { success: true };
  } catch (error: any) {
    console.error("Sign out error:", error);
    throw error;
  }
}
