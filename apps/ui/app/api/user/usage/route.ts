import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-utils';

/**
 * GET /api/user/usage
 * Retrieves the user's usage statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile with usage data
    const profile = await prisma.profile.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        monthly_execution_quota: true,
        monthly_executions_used: true,
        subscription_tier: true,
      }
    });

    // If no profile exists, return default usage data
    if (!profile) {
      return NextResponse.json({
        monthly_execution_quota: 100, // Default quota for free tier
        monthly_executions_used: 0,
        subscription_tier: 'free'
      });
    }

    return NextResponse.json({
      monthly_execution_quota: profile.monthly_execution_quota || 100,
      monthly_executions_used: profile.monthly_executions_used || 0,
      subscription_tier: profile.subscription_tier || 'free'
    });
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
