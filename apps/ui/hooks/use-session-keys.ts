import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SessionKeyData,
  CreateSessionKeyRequest,
  SessionUsageStats,
  SessionKeyValidationResult,
} from "@zzyra/types";
import api from "@/lib/services/api";
import { toast } from "@/hooks/use-toast";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";

/**
 * Hook for managing session keys
 * Provides CRUD operations and real-time updates
 */
export function useSessionKeys() {
  const queryClient = useQueryClient();

  // Fetch all session keys for current user
  const {
    data: sessionKeys,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["session-keys"],
    queryFn: async (): Promise<SessionKeyData[]> => {
      const response = await api.get("/session-keys");
      return response.data.sessionKeys || [];
    },
    staleTime: 30000, // 30 seconds
  });

  // Create new session key
  const createSessionKeyMutation = useMutation({
    mutationFn: async (params: {
      request: CreateSessionKeyRequest;
      signature: string;
    }) => {
      const response = await api.post("/session-keys", {
        ...params.request,
        signature: params.signature,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["session-keys"] });
      toast({
        title: "Session Key Created",
        description:
          "Your blockchain session has been authorized successfully.",
      });
      return data;
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Session Key",
        description:
          error.response?.data?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      throw error;
    },
  });

  // Revoke session key
  const revokeSessionKeyMutation = useMutation({
    mutationFn: async (sessionKeyId: string) => {
      await api.delete(`/session-keys/${sessionKeyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-keys"] });
      queryClient.invalidateQueries({ queryKey: ["session-usage"] });
      toast({
        title: "Session Revoked",
        description: "The session key has been revoked successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Revoke Session",
        description:
          error.response?.data?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  return {
    sessionKeys: sessionKeys || [],
    isLoading,
    error,
    refetch,
    createSessionKey: createSessionKeyMutation.mutateAsync,
    revokeSessionKey: revokeSessionKeyMutation.mutateAsync,
    isCreating: createSessionKeyMutation.isPending,
    isRevoking: revokeSessionKeyMutation.isPending,
  };
}

/**
 * Hook for session key usage statistics
 */
export function useSessionKeyUsage(sessionKeyId?: string) {
  return useQuery({
    queryKey: ["session-usage", sessionKeyId],
    queryFn: async (): Promise<SessionUsageStats> => {
      if (!sessionKeyId) throw new Error("Session key ID required");
      const response = await api.get(`/session-keys/${sessionKeyId}/usage`);
      return response.data;
    },
    enabled: !!sessionKeyId,
    staleTime: 10000, // 10 seconds
  });
}

/**
 * Hook for validating session key transactions
 */
export function useSessionKeyValidation() {
  return useMutation({
    mutationFn: async (params: {
      sessionKeyId: string;
      operation: string;
      amount: string;
      toAddress: string;
      metadata?: Record<string, unknown>;
    }): Promise<SessionKeyValidationResult> => {
      const response = await api.post(
        `/session-keys/${params.sessionKeyId}/validate`,
        {
          operation: params.operation,
          amount: params.amount,
          toAddress: params.toAddress,
          metadata: params.metadata,
        }
      );
      return response.data;
    },
  });
}

/**
 * Hook for session key security metrics (admin)
 */
export function useSessionKeyMetrics() {
  return useQuery({
    queryKey: ["session-metrics"],
    queryFn: async () => {
      const response = await api.get("/session-keys/admin/metrics");
      return response.data;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for creating session keys with Dynamic SDK integration
 * FIXED: Now uses real wallet signatures for proper encryption
 */
export function useSessionKeyCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const { createSessionKey } = useSessionKeys();
  const { isLoggedIn, getCurrentUser, primaryWallet } = useDynamicAuth();

  const createWithDynamic = useCallback(
    async (request: CreateSessionKeyRequest) => {
      setIsCreating(true);
      try {
        const currentUser = getCurrentUser();
        if (!isLoggedIn || !currentUser?.walletAddress || !primaryWallet) {
          throw new Error("Wallet not properly connected");
        }

        // Create delegation message for signing
        const delegationMessage = {
          userAddress: currentUser.walletAddress,
          chainId: request.chainId,
          securityLevel: request.securityLevel,
          validUntil: request.validUntil.toISOString(),
          permissions: request.permissions,
          timestamp: new Date().toISOString(),
          purpose: "zyra_session_key_delegation",
        };

        // Sign the delegation message with the user's REAL wallet
        const messageToSign = JSON.stringify(delegationMessage, null, 2);
        const userSignature = await primaryWallet.signMessage(messageToSign);
        
        if (!userSignature) {
          throw new Error("User signature required for session key creation");
        }

        console.log("Real wallet signature obtained for session key", {
          messageLength: messageToSign.length,
          signatureLength: userSignature.length,
          walletAddress: currentUser.walletAddress
        });

        // Create session key via API with REAL signature
        const result = await createSessionKey({
          request: {
            ...request,
            walletAddress: currentUser.walletAddress,
          },
          signature: userSignature, // REAL cryptographic signature
        });

        return result;
      } catch (error) {
        console.error("Failed to create session key with real signature:", error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [createSessionKey, isLoggedIn, getCurrentUser, primaryWallet]
  );

  return {
    createWithDynamic,
    isCreating,
  };
}
