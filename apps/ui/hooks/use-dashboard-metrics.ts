import { useQuery } from '@tanstack/react-query';

// Define the DashboardMetrics type based on the API response
export interface DashboardMetrics {
  successRate: number;
  totalExecutions: number;
  averageDuration: string;
  rawAverageDurationMs: number;
  activeWorkflows: number;
  changeFromLastWeek: {
    successRate: number;
    totalExecutions: number;
    averageDuration: number;
  };
}

/**
 * Hook for fetching dashboard metrics
 * @param options Optional configuration options
 * @returns Query result with dashboard metrics data
 */
export function useDashboardMetrics(options?: { 
  enabled?: boolean;
  refetchInterval?: number | false;
}) {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }
      return response.json();
    },
    // Default to enabled, but allow override
    enabled: options?.enabled !== undefined ? options.enabled : true,
    // Default to no refetch interval, but allow override
    refetchInterval: options?.refetchInterval || false,
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
}
