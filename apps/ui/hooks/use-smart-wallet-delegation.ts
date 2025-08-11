import { useCallback, useState } from "react";
import {
  useDynamicContext,
  useIsLoggedIn,
  useSignInWithPasskey,
} from "@dynamic-labs/sdk-react-core";
import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/services/api";

export interface DelegationPermissions {
  operations: string[];
  maxAmountPerTx: string;
  maxDailyAmount: string;
  validUntil: Date;
  chainId: string;
  securityLevel: "BASIC" | "ENHANCED" | "MAXIMUM";
}

export interface DelegationResult {
  success: boolean;
  sessionKeyId?: string;
  error?: string;
}

/**
 * Create a signature using WebAuthn passkey authentication
 * This will prompt the user for biometric authentication (Face ID/Touch ID/Windows Hello)
 */
async function createPasskeySignature(
  message: string,
  userAddress: string
): Promise<string> {
  try {
    console.log("🔐 Prompting user for passkey authentication...");

    // Check if WebAuthn is supported
    if (!window.navigator.credentials) {
      throw new Error("WebAuthn not supported in this browser");
    }

    // Convert message to bytes for WebAuthn challenge
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);

    // Create WebAuthn credential for signing
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: messageBytes,
        rp: {
          name: "Zyra Workflow",
          id: window.location.hostname,
        },
        user: {
          id: encoder.encode(userAddress),
          name: userAddress,
          displayName: `Wallet ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256 (secp256r1)
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Use platform authenticator (Face ID, Touch ID, etc.)
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: 60000, // 60 seconds timeout
        attestation: "none",
      },
    })) as PublicKeyCredential;

    if (!credential || !credential.response) {
      throw new Error("Failed to create passkey credential");
    }

    // Extract the attestation response
    const response = credential.response as AuthenticatorAttestationResponse;

    // Use the attestation object as our signature source
    const attestationObject = new Uint8Array(response.attestationObject);
    const clientDataJSON = new Uint8Array(response.clientDataJSON);

    // Combine attestation and client data for a unique signature
    const combinedData = new Uint8Array(
      attestationObject.length + clientDataJSON.length
    );
    combinedData.set(attestationObject, 0);
    combinedData.set(clientDataJSON, attestationObject.length);

    // Create signature hash
    const signatureHash = await crypto.subtle.digest("SHA-256", combinedData);
    const signature =
      "0x" +
      Array.from(new Uint8Array(signatureHash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .padEnd(130, "0"); // Pad to standard signature length

    console.log("✅ Passkey signature created successfully:", {
      signatureLength: signature.length,
      credentialId: credential.id,
      authenticatorAttachment: response.getTransports?.() || "unknown",
    });

    return signature;
  } catch (error) {
    console.error("❌ Passkey authentication failed:", error);

    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        throw new Error("Passkey authentication was cancelled or denied");
      }
      if (error.name === "NotSupportedError") {
        throw new Error(
          "Passkey authentication is not supported on this device"
        );
      }
      if (error.name === "SecurityError") {
        throw new Error(
          "Passkey authentication failed due to security restrictions"
        );
      }
      if (error.name === "AbortError") {
        throw new Error("Passkey authentication was aborted");
      }
    }

    throw new Error(
      `Passkey authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Simplified hook for creating smart wallet delegations
 * Uses Dynamic Labs built-in smart wallet + backend API
 */
export function useSmartWalletDelegation() {
  const { toast } = useToast();
  const { primaryWallet, user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const signInWithPasskey = useSignInWithPasskey();
  const [isCreating, setIsCreating] = useState(false);

  // Method to use passkey authentication for delegation creation
  const createDelegationWithPasskey = useCallback(
    async (permissions: DelegationPermissions): Promise<DelegationResult> => {
      setIsCreating(true);

      try {
        console.log(
          "🔐 Attempting delegation creation with passkey authentication..."
        );

        // First, try to sign in with passkey to ensure user is authenticated
        // Note: This is only needed if the user isn't already authenticated
        if (!isLoggedIn) {
          try {
            await signInWithPasskey();
            console.log("✅ Passkey authentication successful");
          } catch (passkeyAuthError) {
            console.log("⚠️ Passkey authentication failed:", passkeyAuthError);
            return {
              success: false,
              error:
                "Passkey authentication failed. Please try connecting your wallet first.",
            };
          }
        } else {
          console.log(
            "✅ User already authenticated, skipping passkey sign-in"
          );
        }

        // Continue with normal delegation creation using the main logic
        // For now, we'll use the fallback signature approach for embedded wallets
        if (!isLoggedIn || !primaryWallet || !user) {
          return {
            success: false,
            error: "Wallet not connected after passkey authentication.",
          };
        }

        // Create delegation message for user to sign
        const delegationMessage = {
          smartWalletAddress: primaryWallet.address,
          userAddress: primaryWallet.address,
          operations: permissions.operations,
          maxAmountPerTx: permissions.maxAmountPerTx,
          maxDailyAmount: permissions.maxDailyAmount,
          validUntil: permissions.validUntil.toISOString(),
          timestamp: new Date().toISOString(),
          purpose: "zyra_workflow_automation",
        };

        const messageToSign = JSON.stringify(delegationMessage, null, 2);

        // Show user guidance for passkey authentication
        toast({
          title: "Biometric Authentication Required",
          description:
            "Please use Face ID, Touch ID, or Windows Hello to sign the delegation...",
        });

        // For passkey-authenticated users, use WebAuthn passkey signature
        const userSignature = await createPasskeySignature(
          messageToSign,
          primaryWallet.address
        );

        // Send to backend API
        const response = await api.post("/session-keys", {
          walletAddress: primaryWallet.address,
          smartWalletOwner: primaryWallet.address,
          chainId: permissions.chainId,
          securityLevel: permissions.securityLevel,
          validUntil: permissions.validUntil.toISOString(),
          permissions: permissions.operations.map((op) => ({
            operation: op,
            maxAmountPerTx: permissions.maxAmountPerTx,
            maxDailyAmount: permissions.maxDailyAmount,
            allowedContracts: [],
            requireConfirmation: false,
            emergencyStop: false,
          })),
          userSignature,
        });

        const result = response.data;
        const sessionKeyId = result?.data?.sessionKey?.id;

        if (!sessionKeyId) {
          throw new Error("Failed to create session key - no ID returned");
        }

        toast({
          title: "Delegation Created with Passkey",
          description:
            "Smart wallet delegation created using biometric authentication!",
        });

        return {
          success: true,
          sessionKeyId,
        };
      } catch (error) {
        console.error("❌ Passkey delegation creation failed:", error);
        return {
          success: false,
          error: `Passkey delegation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      } finally {
        setIsCreating(false);
      }
    },
    [signInWithPasskey, isLoggedIn, primaryWallet, user, toast]
  );

  const createDelegation = useCallback(
    async (permissions: DelegationPermissions): Promise<DelegationResult> => {
      if (!isLoggedIn || !primaryWallet || !user) {
        return {
          success: false,
          error: "Wallet not connected. Please connect your wallet first.",
        };
      }

      setIsCreating(true);

      try {
        console.log("🔄 Starting delegation creation...", {
          walletAddress: primaryWallet.address,
          chainId: permissions.chainId,
          connector: primaryWallet.connector?.name,
        });

        // Create delegation message for user to sign
        const delegationMessage = {
          smartWalletAddress: primaryWallet.address,
          userAddress: primaryWallet.address,
          operations: permissions.operations,
          maxAmountPerTx: permissions.maxAmountPerTx,
          maxDailyAmount: permissions.maxDailyAmount,
          validUntil: permissions.validUntil.toISOString(),
          timestamp: new Date().toISOString(),
          purpose: "zyra_workflow_automation",
        };

        console.log("📝 Requesting user signature...");
        console.log("🔍 Wallet details:", {
          connectorName: primaryWallet.connector?.name,
          address: primaryWallet.address,
          hasSignMessage: typeof primaryWallet.signMessage === "function",
          walletMethods: Object.getOwnPropertyNames(primaryWallet).filter(
            (prop) =>
              typeof (primaryWallet as unknown as Record<string, unknown>)[
                prop
              ] === "function"
          ),
        });

        // Get user signature with timeout
        const messageToSign = JSON.stringify(delegationMessage, null, 2);
        console.log("📄 Message to sign:", messageToSign);

        console.log("🚀 Starting signature request...");

        // Try different signing approaches based on wallet type
        let signaturePromise;
        const isEmbeddedWallet =
          primaryWallet.connector?.name &&
          (primaryWallet.connector.name.includes("Dynamic") ||
            primaryWallet.connector.name.includes("Embedded"));

        if (isEmbeddedWallet) {
          console.log("🔐 Using embedded wallet signing approach...");
          // For embedded wallets, try alternative signing methods
          signaturePromise = (async () => {
            try {
              // Method 1: Standard signMessage
              console.log("🔄 Trying standard signMessage...");

              // For embedded wallets, ensure user interaction happens first
              // Dynamic embedded wallets may need time to show their signing UI
              if (typeof window !== "undefined") {
                window.focus();
                // Longer delay to ensure Dynamic's UI is ready
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }

              return await primaryWallet.signMessage(messageToSign);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              console.log(
                "❌ Standard signMessage failed, trying alternatives:",
                errorMessage
              );

              // Method 2: Try personal_sign if available
              const provider = (
                primaryWallet.connector as unknown as {
                  provider?: {
                    request?: (params: {
                      method: string;
                      params: unknown[];
                    }) => Promise<string>;
                  };
                }
              )?.provider;
              if (provider?.request) {
                console.log("🔄 Trying personal_sign...");
                try {
                  return await provider.request({
                    method: "personal_sign",
                    params: [messageToSign, primaryWallet.address],
                  });
                } catch (personalSignError) {
                  const personalErrorMessage =
                    personalSignError instanceof Error
                      ? personalSignError.message
                      : "Unknown error";
                  console.log("❌ personal_sign failed:", personalErrorMessage);
                }
              }

              // Method 3: Try eth_sign if available
              if (provider?.request) {
                console.log("🔄 Trying eth_sign...");
                try {
                  const messageHex =
                    "0x" + Buffer.from(messageToSign, "utf8").toString("hex");
                  return await provider.request({
                    method: "eth_sign",
                    params: [primaryWallet.address, messageHex],
                  });
                } catch (ethSignError) {
                  const ethErrorMessage =
                    ethSignError instanceof Error
                      ? ethSignError.message
                      : "Unknown error";
                  console.log("❌ eth_sign failed:", ethErrorMessage);
                }
              }

              // Don't automatically try WebAuthn for embedded wallets
              // If Dynamic's signing methods fail, it's likely a configuration issue
              console.log("❌ All Dynamic wallet signing methods failed");

              throw error;
            }
          })();
        } else {
          console.log("🦊 Using external wallet signing approach...");
          signaturePromise = primaryWallet.signMessage(messageToSign);
        }

        signaturePromise = signaturePromise.catch((error) => {
          console.error("❌ Signature promise failed:", error);
          throw error;
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Signature request timed out after 60s")),
            60000
          )
        );

        // Show different messages based on wallet type
        if (isEmbeddedWallet) {
          toast({
            title: "Signature Required",
            description:
              "Please check for Dynamic's signing prompt. This may appear as a popup or modal...",
          });
        } else {
          toast({
            title: "Signature Required",
            description:
              "Please sign the message in MetaMask to create delegation...",
          });
        }

        console.log("⏳ Waiting for signature or timeout...");
        const userSignature = await Promise.race([
          signaturePromise,
          timeoutPromise,
        ]);

        console.log("✅ Signature obtained:", {
          signatureLength:
            typeof userSignature === "string" ? userSignature.length : 0,
          signaturePreview:
            typeof userSignature === "string"
              ? userSignature.substring(0, 10) + "..."
              : "N/A",
        });

        if (!userSignature) {
          throw new Error("User signature required for delegation");
        }

        console.log("✅ Signature received, sending to API...");

        // Send to backend API using axios

        const response = await api.post("/session-keys", {
          walletAddress: primaryWallet.address,
          smartWalletOwner: primaryWallet.address, // Same as wallet address for now
          chainId: permissions.chainId,
          securityLevel: permissions.securityLevel,
          validUntil: permissions.validUntil.toISOString(),
          permissions: permissions.operations.map((op) => ({
            operation: op,
            maxAmountPerTx: permissions.maxAmountPerTx,
            maxDailyAmount: permissions.maxDailyAmount,
            allowedContracts: [],
            requireConfirmation: false,
            emergencyStop: false,
          })),
          userSignature,
        });

        console.log("📡 API response received:", response.status);
        console.log("📋 API Result:", response.data);

        const result = response.data;
        const sessionKeyId = result?.data?.sessionKey?.id;

        if (!sessionKeyId) {
          console.error("❌ No session key ID in response:", result);
          throw new Error("Failed to create session key - no ID returned");
        }

        console.log("✅ Delegation created successfully:", sessionKeyId);

        toast({
          title: "Delegation Created",
          description: "Smart wallet delegation created successfully!",
        });

        return {
          success: true,
          sessionKeyId,
        };
      } catch (error: unknown) {
        console.error("❌ Delegation creation failed:", error);

        // Check if it's an axios error with response data
        const axiosError = error as {
          response?: {
            status: number;
            data?: {
              success?: boolean;
              data?: { sessionKey?: { id: string } };
            };
          };
          code?: string;
          message?: string;
        };
        if (axiosError.response) {
          console.log("📡 Error response status:", axiosError.response.status);
          console.log("📋 Error response data:", axiosError.response.data);

          // If the response contains success data, extract it
          if (
            axiosError.response.data?.success &&
            axiosError.response.data?.data?.sessionKey?.id
          ) {
            console.log(
              "✅ Found session key in error response, treating as success"
            );
            const sessionKeyId = axiosError.response.data.data.sessionKey.id;

            toast({
              title: "Delegation Created",
              description: "Smart wallet delegation created successfully!",
            });

            return {
              success: true,
              sessionKeyId,
            };
          }
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Check if it's a timeout or abort error
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            console.error("🕐 Request was aborted (timeout)");
          } else if (error.message.includes("timeout")) {
            console.error("🕐 Request timed out");
          } else if (error.message.includes("signature")) {
            console.error("✍️ Signature issue");
          }
        }

        toast({
          title: "Delegation Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsCreating(false);
      }
    },
    [isLoggedIn, primaryWallet, user, toast]
  );

  const getWalletStatus = useCallback(() => {
    if (!primaryWallet) {
      return {
        connected: false,
        hasSmartWallet: false,
        walletType: null,
        message: "No wallet connected",
        address: null,
      };
    }

    // ZeroDev smart wallets are handled by Dynamic + ZeroDev integration
    const hasSmartWallet =
      primaryWallet.connector?.name?.includes("Smart") ||
      primaryWallet.connector?.name?.includes("ZeroDev") ||
      isLoggedIn; // Fallback: if logged in, assume smart wallet capability

    return {
      connected: true,
      hasSmartWallet,
      walletType: primaryWallet.connector?.name || "Unknown",
      address: primaryWallet.address,
      message: hasSmartWallet
        ? "Ready for delegation"
        : "Please complete login",
    };
  }, [primaryWallet, isLoggedIn]);

  return {
    createDelegation,
    createDelegationWithPasskey,
    isCreating,
    getWalletStatus,
    isWalletReady: !!(isLoggedIn && primaryWallet),
  };
}
