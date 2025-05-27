import { useQuery } from '@tanstack/react-query';
import { useMagicAuth } from '@/lib/hooks/use-magic-auth';

export interface UserUsage {
  monthly_execution_quota: number;
  monthly_executions_used: number;
  subscription_tier: string;
}

/**
 * Hook to fetch and manage user usage data
 * Uses React Query for data fetching and caching
 */
export const useUserUsage = () => {
  const { user, isAuthenticated } = useMagicAuth();

  const {
    data: usage,
    isLoading,
    error,
    refetch,
  } = useQuery<UserUsage>({
    queryKey: ['userUsage', user?.issuer],
    queryFn: async () => {
      if (!isAuthenticated || !user?.issuer) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/user/usage');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch usage data');
      }

      return response.json();
    },
    enabled: !!isAuthenticated && !!user?.issuer,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    usage,
    isLoading,
    error,
    refetch,
  };
};
