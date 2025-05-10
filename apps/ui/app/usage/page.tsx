"use client"

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

interface UsageData {
  monthly_execution_quota: number;
  monthly_executions_used: number;
}

export default function UsagePage() {
  const { data, error, isLoading } = useQuery<UsageData, Error>({
    queryKey: ["usage"],
    queryFn: async () => {
      const res = await fetch("/api/usage");
      if (!res.ok) throw new Error("Failed to fetch usage");
      return (await res.json()) as UsageData;
    },
  });

  if (isLoading) return <div>Loading usage...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const { monthly_execution_quota: quota, monthly_executions_used: used } = data!;
  const percent = Math.min(100, Math.floor((used / quota) * 100));

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Monthly Usage</h1>
      <Card className="p-4 max-w-md">
        <div className="mb-2">
          {used} of {quota} executions used ({percent}%)
        </div>
        <progress value={used} max={quota} className="w-full h-4" />
      </Card>
    </main>
  );
}
