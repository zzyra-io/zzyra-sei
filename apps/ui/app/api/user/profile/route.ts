import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-utils';

/**
 * GET /api/user/profile
 * Retrieves the user's profile information
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

    // Get user profile from database
    const profile = await prisma.profile.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    // If no profile exists, return a default profile
    if (!profile) {
      return NextResponse.json({
        id: session.user.id,
        full_name: '',
        email_notifications: true,
        telegram_handle: '',
        discord_webhook: '',
        dark_mode: false,
        subscription_tier: 'free',
        subscription_status: 'active',
        subscription_expires_at: null,
        monthly_execution_quota: 100, // Default quota
        monthly_executions_used: 0,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { message: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Updates the user's profile information
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        full_name: data.full_name,
        email_notifications: data.email_notifications,
        telegram_handle: data.telegram_handle,
        discord_webhook: data.discord_webhook,
        dark_mode: data.dark_mode,
        updated_at: new Date(),
      },
      create: {
        userId: session.user.id,
        full_name: data.full_name,
        email_notifications: data.email_notifications,
        telegram_handle: data.telegram_handle,
        discord_webhook: data.discord_webhook,
        dark_mode: data.dark_mode,
        subscription_tier: 'free',
        subscription_status: 'active',
        monthly_execution_quota: 100, // Default quota
        monthly_executions_used: 0,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { message: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
