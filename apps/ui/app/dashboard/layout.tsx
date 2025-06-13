"use client";

import { ProtectedRoute } from "@/components/guards/protected-route";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    // <ProtectedRoute>
    <div className='flex flex-col min-h-screen'>
      <main className='flex-grow'>{children}</main>
    </div>
    // </ProtectedRoute>
  );
};

export default layout;
