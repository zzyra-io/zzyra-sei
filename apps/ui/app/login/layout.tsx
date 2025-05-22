"use client";

import { GuestRoute } from "@/components/guards/guest-route";
import React from "react";

const layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default layout;
