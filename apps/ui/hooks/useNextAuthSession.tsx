'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useMagic } from '@/lib/magic-provider';

/**
 * Hook to access the NextAuth.js session
 * This complements our existing Magic Link authentication
 */
export function useNextAuthSession() {
  const { data: session, status } = useSession();
  const { isAuthenticated: isMagicAuthenticated } = useMagic();
  
  // For debugging
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('NextAuth Session:', { session, status, isMagicAuthenticated });
    }
  }, [session, status, isMagicAuthenticated]);
  
  // If Magic Link is authenticated, we should consider NextAuth authenticated too
  // This prevents authentication loops when both systems are used together
  const isAuthenticated = status === 'authenticated' || isMagicAuthenticated;
  
  return {
    session,
    isLoading: status === 'loading',
    isAuthenticated,
  };
}
