import { useQuery } from "@tanstack/react-query";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";

export interface WalletTransaction {
  id: string;
  userId: string;
  walletAddress: string;
  txHash: string;
  chainId: number;
  value: string;
  status: string;
  blockNumber?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch wallet transactions
 * Uses React Query for data fetching and caching
 */
export const useWalletTransactions = (
  walletAddress?: string,
  limit: number = 10
) => {
  const { user, isLoggedIn } = useDynamicAuth();

  const {
    data: transactions,
    isLoading,
    error,
    refetch,
  } = useQuery<WalletTransaction[]>({
    queryKey: ["walletTransactions", user?.userId, walletAddress, limit],
    queryFn: async () => {
      if (!isLoggedIn || !user?.userId) {
        throw new Error("User not authenticated");
      }

      const url = walletAddress
        ? `/api/user/wallets/transactions?address=${walletAddress}&limit=${limit}`
        : `/api/user/wallets/transactions?limit=${limit}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch wallet transactions"
        );
      }

      return response.json();
    },
    enabled: !!isLoggedIn && !!user?.userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    transactions,
    isLoading,
    error,
    refetch,
  };
};
