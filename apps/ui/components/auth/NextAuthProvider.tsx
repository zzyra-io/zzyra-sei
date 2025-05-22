'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

/**
 * NextAuth.js provider component
 * This wraps the application to provide session context
 * while maintaining compatibility with our existing Magic Link auth
 */
export function NextAuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
