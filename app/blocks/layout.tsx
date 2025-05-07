import { DashboardHeader } from "@/components/dashboard-header";
import React from "react";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <DashboardHeader />
      {children}
    </div>
  );
};

export default layout;
