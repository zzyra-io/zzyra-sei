"use client";

import api from "@/lib/services/api";
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
      const response = await api.get("/dashboard/metrics");
      return response.data;
    },
    // Refresh every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
