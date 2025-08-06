import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import { UserProfile } from "./useUserProfile";

export interface UpdateProfileData {
  full_name?: string;
  email_notifications?: boolean;
  telegram_handle?: string;
  discord_webhook?: string;
  dark_mode?: boolean;
}

/**
 * Hook to update user profile data
 * Uses React Query for data mutations and cache invalidation
 */
export const useUpdateUserProfile = () => {
  const { user, isLoggedIn } = useDynamicAuth();
  const queryClient = useQueryClient();

  const {
    mutate: updateProfile,
    isPending,
    error,
    isSuccess,
    reset,
  } = useMutation({
    mutationKey: ["updateUserProfile", user?.userId],
    mutationFn: async (
      profileData: UpdateProfileData
    ): Promise<UserProfile> => {
      if (!isLoggedIn || !user?.userId) {
        throw new Error("User not authenticated");
      }

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user profile");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch user profile query
      queryClient.invalidateQueries({
        queryKey: ["userProfile", user?.userId],
      });

      // Optionally update the cache directly
      queryClient.setQueryData(["userProfile", user?.userId], data);
    },
  });

  return {
    updateProfile,
    isPending,
    error,
    isSuccess,
    reset,
  };
};
