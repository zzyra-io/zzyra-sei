import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMagicAuth } from "@/lib/hooks/use-magic-auth";
import { toast as showToast } from "@/components/ui/use-toast";
import { useWalletClient } from "wagmi";

export interface UserWallet {
  id: string;
  userId: string;
  chainId: string;
  walletAddress: string;
  walletType?: string;
  chainType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletInput {
  walletAddress: string;
  chainId: string;
  walletType?: string;
  chainType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook to fetch and manage user wallets
 * Uses React Query for data fetching and caching
 */
export const useUserWallets = () => {
  const { user, isAuthenticated } = useMagicAuth();

  const {
    data: wallets,
    isLoading,
    error,
    refetch,
  } = useQuery<UserWallet[]>({
    queryKey: ["user-wallets"],
    queryFn: async () => {
      console.log("Fetching user wallets, auth status:", {
        isAuthenticated,
        userId: user?.issuer,
        userEmail: user?.email,
        timestamp: new Date().toISOString(),
      });

      if (!isAuthenticated) {
        console.log("User not authenticated, returning empty wallet list");
        return [];
      }

      // Implement retry logic for fetching wallets
      let attempts = 0;
      const maxAttempts = 3;
      let lastError;

      while (attempts < maxAttempts) {
        try {
          console.log(
            `Fetching wallets attempt ${attempts + 1}/${maxAttempts}`
          );
          const response = await fetch("/api/user/wallets", {
            // Add cache-busting to prevent stale data
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Error fetching wallets:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
            });

            if (response.status === 401) {
              console.error("Authentication error fetching wallets");
              return [];
            }

            throw new Error(`Failed to fetch wallets: ${response.statusText}`);
          }

          const data = await response.json();
          console.log("Wallets fetched successfully:", {
            count: data.length,
            wallets: data.map((w: UserWallet) => ({
              id: w.id,
              address: w.walletAddress,
              type: w.walletType,
              chainId: w.chainId,
            })),
          });

          return data;
        } catch (error) {
          console.error(
            `Error in wallet fetch attempt ${attempts + 1}:`,
            error
          );
          lastError = error;
          attempts++;

          if (attempts < maxAttempts) {
            // Wait before retry with exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, attempts))
            );
          }
        }
      }

      // If we've reached here, all attempts failed
      console.error("All wallet fetch attempts failed");

      // Show an error toast to the user
      showToast({
        title: "Wallet data unavailable",
        description:
          "We couldn't retrieve your wallet information. Please try again later.",
        variant: "destructive",
      });

      throw lastError;
    },
    enabled: !!isAuthenticated,
    // Refresh wallets periodically to ensure up-to-date data
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retryOnMount: true,
  });

  // Mutation to save a wallet
  const saveWallet = useMutation({
    mutationFn: async (data: CreateWalletInput) => {
      console.log("Saving wallet:", {
        address: data.walletAddress,
        chainId: data.chainId,
        walletType: data.walletType,
      });

      if (!isAuthenticated) {
        console.error("Cannot save wallet: User not authenticated");
        showToast({
          title: "Authentication required",
          description: "Please log in to save your wallet.",
          variant: "destructive",
        });
        throw new Error("User not authenticated");
      }

      // Add retry logic for saving wallet
      let attempts = 0;
      const maxAttempts = 3;
      let lastError;

      while (attempts < maxAttempts) {
        try {
          console.log(`Saving wallet attempt ${attempts + 1}/${maxAttempts}`);

          const response = await fetch("/api/user/wallets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Error saving wallet:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
            });

            if (response.status === 401) {
              showToast({
                title: "Authentication error",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              throw new Error("Authentication failed");
            }

            throw new Error(
              errorData.message ||
                `Failed to save wallet: ${response.statusText}`
            );
          }

          const savedWallet = await response.json();
          console.log("Wallet saved successfully:", savedWallet);
          return savedWallet;
        } catch (error) {
          console.error(`Error in wallet save attempt ${attempts + 1}:`, error);
          lastError = error;
          attempts++;

          if (attempts < maxAttempts) {
            // Wait before retry with exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, attempts))
            );
          }
        }
      }

      // If we've reached here, all attempts failed
      console.error("All wallet save attempts failed");
      showToast({
        title: "Wallet not saved",
        description:
          "We couldn't save your wallet information. Please try again later.",
        variant: "destructive",
      });
      throw lastError;
    },
    onSuccess: (data) => {
      console.log("Wallet saved successfully, invalidating queries");
      // Invalidate and refetch with proper query key
      queryClient.invalidateQueries({ queryKey: ["user-wallets"] });
      // Force refetch
      refetch();

      showToast({
        title: "Wallet saved",
        description: `Wallet ${data.walletAddress.substring(
          0,
          6
        )}...${data.walletAddress.substring(
          data.walletAddress.length - 4
        )} has been saved.`,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Mutation error in saveWallet:", error);
    },
  });

  // Mutation to delete a wallet
  const deleteWallet = useMutation({
    mutationFn: async (walletId: string): Promise<{ success: boolean }> => {
      if (!isAuthenticated || !user?.issuer) {
        console.error("Cannot delete wallet: User not authenticated");
        throw new Error("User not authenticated");
      }

      console.log("Deleting wallet with ID:", walletId);
      const response = await fetch(`/api/user/wallets?id=${walletId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error deleting wallet:", errorData);
        throw new Error(errorData.message || "Failed to delete wallet");
      }

      const result = await response.json();
      console.log("Wallet deleted successfully:", result);
      return result;
    },
    onSuccess: (data, walletId) => {
      // Invalidate and refetch wallet queries
      console.log(
        `Invalidating wallet queries after deleting wallet ID ${walletId}`
      );
      // Use the correct query key - should be "user-wallets" not "userWallets"
      queryClient.invalidateQueries({
        queryKey: ["user-wallets"],
      });
      // Force refetch
      refetch();
    },
    onError: (error) => {
      console.error("Error deleting wallet:", error);
      showToast({
        title: "Couldn't remove wallet",
        description:
          "There was an error removing the wallet. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    wallets,
    isLoading, 
    isLoadingWallets: isLoading, // Include both names for compatibility
    error,
    refetch,
    saveWallet,
    deleteWallet,
  };
};
