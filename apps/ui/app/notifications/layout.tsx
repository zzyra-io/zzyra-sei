import { AuthGate } from "@/components/auth-gate";
import { DashboardHeader } from "@/components/dashboard-header";
import React from "react";

const layout = ({ children }) => {
  return (
    <AuthGate>
      <div className='flex min-h-screen flex-col'>
        <DashboardHeader />
        <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
          {children}
        </main>
      </div>
    </AuthGate>
  );
};

export default layout;
