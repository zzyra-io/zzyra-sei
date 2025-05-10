import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Test endpoint to generate notifications for testing
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  
  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  // Use service role client to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // First check if user exists in profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .limit(1);

    if (profileError) {
      console.error(`Error checking user profile: ${profileError.message}`);
      return NextResponse.json(
        { error: `Error checking user profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    // Create profile if it doesn't exist
    if (!profileData || profileData.length === 0) {
      console.warn(`User profile not found for ${userId}, attempting to create`);
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({ id: userId });
      
      if (insertError) {
        console.error(`Failed to create user profile: ${insertError.message}`);
        return NextResponse.json(
          { error: `Failed to create user profile: ${insertError.message}` },
          { status: 500 }
        );
      }
      console.log(`Created profile for user ${userId}`);
    }

    // Generate test notifications of different types
    const notifications = [
      {
        user_id: userId,
        type: 'info',
        title: 'Information Notification',
        message: 'This is a test information notification.',
        data: { 
          originalType: 'workflow_info',
          timestamp: new Date().toISOString() 
        },
        read: false,
      },
      {
        user_id: userId,
        type: 'success',
        title: 'Success Notification',
        message: 'Your workflow completed successfully!',
        data: { 
          originalType: 'workflow_completed',
          timestamp: new Date().toISOString() 
        },
        read: false,
      },
      {
        user_id: userId,
        type: 'warning',
        title: 'Warning Notification',
        message: 'Your workflow is approaching quota limits.',
        data: { 
          originalType: 'quota_alert',
          timestamp: new Date().toISOString() 
        },
        read: false,
      },
      {
        user_id: userId,
        type: 'error',
        title: 'Error Notification',
        message: 'An error occurred in your workflow execution.',
        data: { 
          originalType: 'workflow_failed',
          timestamp: new Date().toISOString(),
          error: 'Mock error for testing'
        },
        read: false,
      }
    ];

    // Insert notifications one by one
    for (const notification of notifications) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .insert(notification);

      if (error) {
        console.error(`Failed to insert notification: ${error.message}`);
        return NextResponse.json(
          { error: `Failed to insert notification: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Created ${notifications.length} test notifications for user ${userId}` 
    });
  } catch (err) {
    const error = err as Error;
    console.error(`Unexpected error: ${error.message}`);
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    );
  }
}
