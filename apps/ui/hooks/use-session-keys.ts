import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SessionKeyData,
  CreateSessionKeyRequest,
  SessionUsageStats,
  SessionKeyValidationResult,
  SecurityLevel,
} from "@zyra/types";
import api from "@/lib/services/api";
import { toast } from "@/hooks/use-toast";

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
 * Hook for creating session keys with Magic SDK integration
 */
export function useSessionKeyCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const { createSessionKey } = useSessionKeys();

  const createWithMagic = useCallback(
    async (
      request: CreateSessionKeyRequest,
      magic: any // Magic SDK instance
    ) => {
      setIsCreating(true);
      try {
        // Get user metadata from Magic
        const userMetadata = await magic.user.getInfo();
        if (!userMetadata?.publicAddress) {
          throw new Error("No wallet address found");
        }

        // Create delegation message
        const delegationMessage = {
          userAddress: request.walletAddress,
          chainId: request.chainId,
          securityLevel: request.securityLevel,
          validUntil: request.validUntil.toISOString(),
          permissions: request.permissions,
          timestamp: new Date().toISOString(),
        };

        // Sign the delegation message with the user's wallet using Magic SDK
        // Use Magic's RPC provider directly to avoid network detection issues
        const messageToSign = JSON.stringify(delegationMessage);

        // Convert message to hex for signing
        const messageHex = `0x${Buffer.from(messageToSign, "utf8").toString("hex")}`;

        // Use Magic's RPC provider directly with personal_sign
        // This avoids ethers.js network detection issues while still showing Magic's UI
        const signature = await magic.rpcProvider.request({
          method: "personal_sign",
          params: [messageHex, userMetadata.publicAddress],
        });

        // Create session key via API
        const result = await createSessionKey({
          request: {
            ...request,
            walletAddress: userMetadata.publicAddress,
          },
          signature,
        });

        return result;
      } finally {
        setIsCreating(false);
      }
    },
    [createSessionKey]
  );

  return {
    createWithMagic,
    isCreating,
  };
}
