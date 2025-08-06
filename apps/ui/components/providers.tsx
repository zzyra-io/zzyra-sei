"use client";

import { ReactNode } from "react";
import { DynamicProvider } from "../lib/dynamic-provider";

/**
 * Root providers component that provides Dynamic wallet authentication
 *
 * This setup provides Direct Dynamic wallet integration without compatibility layers
 */
export function Providers({ children }: { children: ReactNode }) {
  return <DynamicProvider>{children}</DynamicProvider>;
}
