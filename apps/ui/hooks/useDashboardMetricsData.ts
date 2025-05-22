"use client";

import { useQuery } from "@tanstack/react-query";

export interface DashboardMetrics {
  successRate: number;
  totalExecutions: number;
  averageDuration: string;
  rawAverageDurationMs: number;
  activeWorkflows: number;
  changeFromLastWeek?: {
    successRate?: number;
    totalExecutions?: number;
    averageDuration?: number;
  };
}

/**
 * Custom hook for fetching dashboard metrics
 */
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const response = await fetch('/api/dashboard/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }
      return response.json();
    },
    // Refresh every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
