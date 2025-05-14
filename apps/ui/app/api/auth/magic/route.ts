import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { MagicAuthPayload, MagicAuthResponse, MagicAuthError } from '@/lib/supabase/magic-auth-types';

/**
 * API route to handle Magic Link authentication with Supabase
 * This server-side approach improves security by keeping token exchange
 * away from the client
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body as MagicAuthPayload
    const payload = await req.json() as MagicAuthPayload;
    
    if (!payload.didToken) {
      const errorResponse: MagicAuthError = { error: 'Missing DID token' };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.log('Received DID token for Supabase authentication');
    
    // Create admin client with persistSession: false for server-side
    const supabase = createClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    
    // Sign in with Supabase using the Magic token
    console.log(`Attempting to sign in with IdToken using provider: ${payload.provider || 'magic'}`);
    
    // Use the provider if specified (for OAuth flows), otherwise default to 'magic'
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: payload.provider || 'magic',  // Default to 'magic' if no provider specified
      token: payload.didToken,
      nonce: crypto.randomUUID(),
    });
    
    if (error) {
      console.error('Supabase auth error:', error);
      const errorResponse: MagicAuthError = { 
        error: error.message,
        code: error.code 
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }
    
    console.log('Successfully authenticated with Supabase');
    
    // Return the session data to the client as MagicAuthResponse
    const authResponse: MagicAuthResponse = {
      session: data.session,
      user: data.user
    };
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Server authentication error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    const errorResponse: MagicAuthError = { error: errorMessage };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
