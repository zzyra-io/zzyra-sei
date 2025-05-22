import { useQuery } from '@tanstack/react-query';
import { useMagicAuth } from '@/lib/hooks/use-magic-auth';

export interface UserProfile {
  id: string;
  full_name: string;
  email_notifications: boolean;
  telegram_handle: string;
  discord_webhook: string;
  dark_mode: boolean;
  subscription_tier: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  monthly_execution_quota: number;
  monthly_executions_used: number;
  updated_at: string;
}

/**
 * Hook to fetch and manage user profile data
 * Uses React Query for data fetching and caching
 */
export const useUserProfile = () => {
  const { user, isAuthenticated } = useMagicAuth();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery<UserProfile>({
    queryKey: ['userProfile', user?.issuer],
    queryFn: async () => {
      if (!isAuthenticated || !user?.issuer) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch user profile');
      }

      return response.json();
    },
    enabled: !!isAuthenticated && !!user?.issuer,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
  };
};
