"use client";

import { AuthGate } from "@/components/auth-gate";
import React from "react";

const layout = ({ children }: { children: React.ReactNode }) => {
  return <AuthGate>{children}</AuthGate>;
};

export default layout;
