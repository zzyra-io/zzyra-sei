import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Configure axios instance
const userApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

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
  const { user, isLoggedIn } = useDynamicAuth();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery<UserProfile>({
    queryKey: ["userProfile", user?.userId],
    queryFn: async () => {
      if (!isLoggedIn || !user?.userId) {
        throw new Error("User not authenticated");
      }

      try {
        const response = await userApi.get("/user/profile");
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(
            error.response?.data?.message || "Failed to fetch user profile"
          );
        }
        throw new Error("Failed to fetch user profile");
      }
    },
    enabled: !!isLoggedIn && !!user?.userId,
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
