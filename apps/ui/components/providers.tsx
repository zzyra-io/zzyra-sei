"use client";

import { ReactNode } from "react";
import { DynamicProvider } from "@/lib/dynamic-provider";

/**
 * Root providers component that provides Dynamic wallet authentication
 *
 * This setup follows the official Dynamic + NextJS integration guide
 */
export function Providers({ children }: { children: ReactNode }) {
  return <DynamicProvider>{children}</DynamicProvider>;
}
