"use client";

import { ProtectedRoute } from "@/components/guards/protected-route";

const layout = ({ children }: { children: React.ReactNode }) => {
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default layout;
