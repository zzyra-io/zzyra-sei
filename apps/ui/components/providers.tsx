'use client';

import { ReactNode } from 'react';
import MagicProvider from '@/lib/magic-provider';
import { NextAuthProvider } from './auth/NextAuthProvider';

/**
 * Root providers component that combines Magic Link and NextAuth.js
 * 
 * This setup allows both authentication systems to work together:
 * - Magic Link handles the actual authentication flow
 * - NextAuth.js provides session management and middleware capabilities
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MagicProvider>
      <NextAuthProvider>
        {children}
      </NextAuthProvider>
    </MagicProvider>
  );
}
