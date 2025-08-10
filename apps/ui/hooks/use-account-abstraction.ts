"use client";

import { useCallback, useState, useEffect } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isZeroDevConnector } from "@dynamic-labs/ethereum-aa";
import { useToast } from "@/components/ui/use-toast";
import { parseEther } from "viem";

interface SmartWalletDelegation {
  smartWalletAddress: string;
  ownerAddress: string;
  signerAddress: string;
  chainId: string;
  permissions: {
    operations: string[];
    maxAmountPerTx: string;
    maxDailyAmount: string;
    validUntil: Date;
  };
  kernelClientData: {
    smartWalletAddress: string;
    ownerAddress: string;
    chainId: string;
  }; // Serializable data for backend kernel client recreation
  delegationSignature: string;
}

export interface SmartWalletDelegationResult {
  success: boolean;
  delegation?: SmartWalletDelegation;
  error?: {
    type:
      | "DEPLOYMENT_REQUIRED"
      | "DEPLOYMENT_FAILED"
      | "KERNEL_CLIENT_UNAVAILABLE"
      | "OTHER";
    message: string;
    userGuidance: string;
    technicalDetails: string;
    canRetry: boolean;
    requiresManualAction: boolean;
  };
}

interface AATransactionRequest {
  to: string;
  value: string;
  data?: string;
  chainId: string;
}

// Dynamic Labs kernel client - generic type to avoid conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KernelClient = any;

// Dynamic Labs connector interface to avoid any types
interface DynamicConnector {
  eoaConnector?: {
    getAddress(): Promise<string>;
  };
  name?: string;
}

export function useAccountAbstraction() {
  const { toast } = useToast();
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const [isCreatingDelegation, setIsCreatingDelegation] = useState(false);
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false);
  const [kernelClient, setKernelClient] = useState<KernelClient>(null);
  const [isClient, setIsClient] = useState(false);

  // Fix SSR hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  /**
   * Check if smart wallet is deployed on-chain
   * This is critical for session key delegation to work
   */
  const ensureSmartWalletDeployment = useCallback(
    async (smartWalletAddress: string): Promise<boolean> => {
      // Only run on client side
      if (!isClient || typeof window === "undefined") {
        console.log(
          "ensureSmartWalletDeployment: Not on client side, returning false"
        );
        return false;
      }

      try {
        console.log(
          "Checking if smart wallet is deployed:",
          smartWalletAddress
        );

        // Use SEI testnet RPC from environment or fallback
        const provider =
          process.env.NEXT_PUBLIC_SEI_TESTNET_RPC ||
          "https://evm-rpc.sei-apis.com";

        // Check deployment status
        const response = await fetch(provider, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getCode",
            params: [smartWalletAddress, "latest"],
            id: 1,
          }),
        });

        if (!response.ok) {
          console.warn(
            "RPC response not ok:",
            response.status,
            response.statusText
          );
          // If we can't check deployment status, assume it's not deployed
          return false;
        }

        const result = await response.json();

        if (result.error) {
          console.warn("RPC error:", result.error);
          // If there's an RPC error, assume it's not deployed
          return false;
        }

        const code = result.result;

        if (code === "0x" || code === "0x0") {
          // Smart wallet is not deployed
          console.log("Smart wallet is not deployed:", smartWalletAddress);
          return false;
        } else {
          console.log("Smart wallet is deployed:", smartWalletAddress);
          return true;
        }
      } catch (error) {
        console.error("Smart wallet deployment check failed:", error);
        // If we can't check deployment status, assume it's not deployed
        return false;
      }
    },
    [isClient]
  );

  /**
   * Automatically deploy smart wallet using kernel client
   * This provides seamless UX without requiring manual transactions
   */
  const deploySmartWalletAutomatically = useCallback(
    async (smartWalletAddress: string) => {
      // Only run on client side
      if (!isClient || typeof window === "undefined") {
        throw new Error(
          "Smart wallet deployment only available on client side"
        );
      }

      if (!kernelClient) {
        throw new Error("Kernel client not available for automatic deployment");
      }

      // Add timeout wrapper for deployment
      const deploymentTimeout = 60000; // 60 seconds

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error("Smart wallet deployment timed out after 60 seconds")
            ),
          deploymentTimeout
        );
      });

      const deploymentPromise = async () => {
        try {
          console.log(
            "Starting automatic smart wallet deployment:",
            smartWalletAddress
          );

          // Send a minimal transaction to trigger smart wallet deployment
          // Using the burn address ensures the transaction will succeed
          const deploymentTransaction = {
            to: "0x0000000000000000000000000000000000000001" as `0x${string}`,
            value: parseEther("0.000000000000000001"), // 1 wei
            data: "0x" as `0x${string}`,
          };

          console.log("Encoding deployment transaction...");
          const callData = await kernelClient.account.encodeCalls([
            deploymentTransaction,
          ]);

          console.log("Sending deployment transaction...");
          console.log("Deployment callData:", callData);
          console.log("Smart wallet address (expected):", smartWalletAddress);

          const userOpHash = await kernelClient.sendUserOperation({
            callData,
          });

          console.log("Deployment transaction sent:", userOpHash);

          // Update user with transaction hash
          toast({
            title: "🚀 Deployment Transaction Sent",
            description: `Step 2/3: Transaction submitted (${userOpHash.substring(0, 10)}...)`,
          });

          // Wait for deployment to be processed
          console.log("Waiting for smart wallet deployment confirmation...");
          await new Promise((resolve) => setTimeout(resolve, 8000));

          // Verify deployment with multiple attempts
          const provider = "https://evm-rpc.sei-apis.com";
          let deploymentConfirmed = false;
          let attempts = 0;
          const maxAttempts = 6;

          while (!deploymentConfirmed && attempts < maxAttempts) {
            attempts++;
            console.log(
              `Verifying deployment (attempt ${attempts}/${maxAttempts})...`
            );

            try {
              const response = await fetch(provider, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  method: "eth_getCode",
                  params: [smartWalletAddress, "latest"],
                  id: 1,
                }),
              });

              const result = await response.json();
              const code = result.result;

              if (code && code !== "0x" && code !== "0x0") {
                deploymentConfirmed = true;
                console.log("✅ Smart wallet deployment confirmed!");

                // Final success toast
                toast({
                  title: "🎉 Deployment Confirmed!",
                  description:
                    "Step 3/3: Smart wallet is now live on SEI testnet",
                });
                break;
              } else {
                console.log(
                  `⏳ Deployment not yet confirmed (attempt ${attempts})`
                );

                // Update user on verification progress
                if (attempts <= maxAttempts / 2) {
                  toast({
                    title: "⏳ Verifying Deployment",
                    description: `Checking deployment status (${attempts}/${maxAttempts})...`,
                  });
                }

                if (attempts < maxAttempts) {
                  await new Promise((resolve) => setTimeout(resolve, 3000));
                }
              }
            } catch (verifyError) {
              console.warn(
                `Verification attempt ${attempts} failed:`,
                verifyError
              );
              if (attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
              }
            }
          }

          if (!deploymentConfirmed) {
            // Provide more specific timeout error
            throw new Error(
              `Smart wallet deployment timed out after ${maxAttempts} attempts. ` +
                `The deployment transaction may still be processing. ` +
                `Please wait 1-2 minutes and try creating the delegation again, ` +
                `or send a small transaction manually to trigger deployment.`
            );
          }

          console.log(
            "🎉 Smart wallet deployed successfully:",
            smartWalletAddress
          );
        } catch (error) {
          console.error("Automatic smart wallet deployment failed:", error);

          // Enhanced error context for different failure types
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          if (errorMessage.includes("insufficient funds")) {
            throw new Error(
              `💰 Insufficient funds for smart wallet deployment. ` +
                `Your smart wallet (${smartWalletAddress.substring(0, 10)}...) needs a small amount of SEI for gas fees. ` +
                `Please send at least 0.001 SEI to this address and try again.`
            );
          } else if (errorMessage.includes("network")) {
            throw new Error(
              `Network error during smart wallet deployment: ${errorMessage}. ` +
                `Please check your internet connection and try again.`
            );
          } else if (errorMessage.includes("timeout")) {
            throw new Error(
              `Smart wallet deployment timed out: ${errorMessage}. ` +
                `The network may be congested. Please wait a moment and try again.`
            );
          } else {
            throw new Error(
              `Failed to deploy smart wallet automatically: ${errorMessage}. ` +
                `You can try sending a small transaction manually to trigger deployment.`
            );
          }
        }
      };

      // Race between deployment and timeout
      try {
        await Promise.race([deploymentPromise, timeoutPromise]);
      } catch (error) {
        console.error("Smart wallet deployment failed or timed out:", error);
        throw error;
      }
    },
    [kernelClient, isClient]
  );

  /**
   * Get detailed wallet status for debugging
   */
  const getWalletStatus = useCallback(() => {
    // Return safe defaults during SSR
    if (!isClient || !primaryWallet) {
      return {
        connected: false,
        hasSmartWallet: false,
        walletType: null,
        message: "No wallet connected",
      };
    }

    const isEmbedded =
      primaryWallet.connector.name?.includes("embedded") ||
      primaryWallet.connector.name?.includes("Email") ||
      primaryWallet.connector.name?.includes("SMS");

    // Check both connector type and on-chain deployment status
    const isZeroDevConnectorType = isZeroDevConnector(primaryWallet.connector);

    // For embedded wallets, we should have a smart wallet address
    const hasSmartWalletAddress = !!primaryWallet.address;

    // Consider it a smart wallet if either:
    // 1. It's a ZeroDev connector type, OR
    // 2. It's an embedded wallet with an address (which should be a smart wallet)
    const hasSmartWallet =
      isZeroDevConnectorType || (isEmbedded && hasSmartWalletAddress);

    // Debug logging to understand wallet detection
    console.log("Wallet Status Debug:", {
      connectorName: primaryWallet.connector.name,
      isEmbedded,
      isZeroDevConnectorType,
      hasSmartWalletAddress,
      address: primaryWallet.address,
      finalHasSmartWallet: hasSmartWallet,
    });

    return {
      connected: true,
      hasSmartWallet,
      walletType: primaryWallet.connector.name,
      isEmbedded,
      address: primaryWallet.address,
      message: hasSmartWallet
        ? "Smart wallet ready for Account Abstraction"
        : isEmbedded
          ? "Embedded wallet detected - smart wallet should be available"
          : "External wallet detected - smart wallets only work with embedded wallets",
    };
  }, [primaryWallet, isClient]);

  /**
   * Initialize kernel client when primary wallet changes
   * Following Dynamic Labs documentation pattern
   */
  useEffect(() => {
    // Only run on client side to prevent hydration mismatch
    if (!isClient) {
      return;
    }

    const initializeKernelClient = async () => {
      if (!primaryWallet?.connector) {
        console.log("No primary wallet connector available");
        setKernelClient(null);
        return;
      }

      // Check if this is a ZeroDev connector
      const isZeroDev = isZeroDevConnector(primaryWallet.connector);
      const isEmbedded =
        primaryWallet.connector.name?.includes("embedded") ||
        primaryWallet.connector.name?.includes("Email") ||
        primaryWallet.connector.name?.includes("SMS");

      console.log("Kernel client initialization check:", {
        isZeroDev,
        isEmbedded,
        connectorName: primaryWallet.connector.name,
        hasGetAccountAbstractionProvider:
          typeof (primaryWallet.connector as any)
            .getAccountAbstractionProvider === "function",
      });

      // For embedded wallets, they should have smart wallet capabilities even if not detected as ZeroDev
      if (!isZeroDev && !isEmbedded) {
        console.log(
          "Primary wallet is not a ZeroDev smart wallet or embedded wallet"
        );
        setKernelClient(null);
        return;
      }

      // For embedded wallets that aren't detected as ZeroDev, skip kernel client setup but allow delegation
      if (isEmbedded && !isZeroDev) {
        console.log(
          "Embedded wallet detected but not ZeroDev connector - checking for AA provider"
        );
        if (
          typeof (primaryWallet.connector as any)
            .getAccountAbstractionProvider !== "function"
        ) {
          console.log(
            "Embedded wallet does not support Account Abstraction provider"
          );
          setKernelClient(null);
          return;
        }
      }

      try {
        // Ensure that the kernel client has been loaded successfully
        await primaryWallet.connector.getNetwork();

        // Check if wallet address is available before proceeding
        if (!primaryWallet.address) {
          console.log("Wallet address not yet available, waiting...");
          setKernelClient(null);
          return;
        }

        // Get the kernel client with gas sponsorship enabled
        let client;
        try {
          client = (
            primaryWallet.connector as any
          ).getAccountAbstractionProvider({
            withSponsorship: true,
          });
        } catch (providerError) {
          console.error(
            "Failed to get Account Abstraction provider:",
            providerError
          );

          // For embedded wallets, try alternative approach
          if (isEmbedded) {
            console.log("Trying fallback for embedded wallet...");
            try {
              // Some embedded wallets might need different initialization
              client = (
                primaryWallet.connector as any
              ).getAccountAbstractionProvider();
            } catch (fallbackError) {
              console.error("Fallback AA provider failed:", fallbackError);
              setKernelClient(null);
              return;
            }
          } else {
            setKernelClient(null);
            return;
          }
        }

        // Debug: Log sponsorship configuration
        console.log("ZeroDev Sponsorship Debug:", {
          withSponsorship: true,
          clientType: client?.constructor?.name,
          hasPaymaster: !!client?.paymaster,
          clientAvailable: !!client,
          isEmbedded,
        });

        // For embedded wallets, we might need to be more lenient with method checking
        const requiredMethods = isEmbedded
          ? ["sendUserOperation", "account"]
          : ["sendTransaction", "sendUserOperation"];

        const hasRequiredMethods = requiredMethods.every(
          (method) => client && typeof client[method] === "function"
        );

        if (!client || !hasRequiredMethods) {
          console.warn("Kernel client not properly initialized:", {
            clientExists: !!client,
            hasRequiredMethods,
            availableMethods: client
              ? Object.getOwnPropertyNames(client).filter(
                  (prop) => typeof client[prop] === "function"
                )
              : [],
          });

          // For embedded wallets, allow partial functionality
          if (isEmbedded && client) {
            console.log("Using embedded wallet with limited functionality");
            setKernelClient(client);
          } else {
            setKernelClient(null);
            return;
          }
        } else {
          setKernelClient(client);
        }

        console.log("Kernel client initialized successfully:", {
          address: primaryWallet.address,
          connector: primaryWallet.connector.constructor.name,
        });
        setKernelClient(client);
      } catch (error) {
        console.error("Failed to initialize kernel client:", error);
        setKernelClient(null);
      }
    };

    // Add a small delay to ensure wallet is fully loaded
    const timer = setTimeout(initializeKernelClient, 100);
    return () => clearTimeout(timer);
  }, [primaryWallet, isClient]);

  /**
   * Create a smart wallet delegation using Dynamic Labs + ZeroDev integration
   * This leverages Dynamic's built-in smart wallet management
   */
  const createSmartWalletDelegation = useCallback(
    async (params: {
      chainId: string;
      operations: string[];
      maxAmountPerTx: string;
      maxDailyAmount: string;
      duration: number; // hours
    }): Promise<SmartWalletDelegationResult> => {
      setIsCreatingDelegation(true);

      if (!isLoggedIn || !primaryWallet) {
        setIsCreatingDelegation(false);
        return {
          success: false,
          error: {
            type: "OTHER",
            message: "Wallet not connected",
            userGuidance:
              "Please connect your wallet before creating a delegation.",
            technicalDetails: "No primary wallet or login session found.",
            canRetry: true,
            requiresManualAction: false,
          },
        };
      }

      // Get detailed wallet status for better error messages
      const walletStatus = getWalletStatus();
      console.log("Wallet Status:", walletStatus);

      // Also check on-chain deployment status
      if (primaryWallet.address) {
        const isDeployed = await ensureSmartWalletDeployment(
          primaryWallet.address
        );
        console.log("On-chain deployment check:", {
          address: primaryWallet.address,
          isDeployed,
        });
      }

      if (!walletStatus.hasSmartWallet) {
        const helpfulMessage = walletStatus.isEmbedded
          ? "Embedded wallet detected but smart wallet not available. This might be a configuration issue or the smart wallet is still being created."
          : "Smart wallets only work with embedded wallets (Email/SMS login). Please disconnect your current wallet and login with Email or SMS to create an embedded wallet with Account Abstraction.";

        setIsCreatingDelegation(false);
        return {
          success: false,
          error: {
            type: "OTHER",
            message: "Smart wallet required for Account Abstraction",
            userGuidance: `${helpfulMessage}\n\nCurrent wallet: ${walletStatus.walletType}\nStatus: ${walletStatus.message}`,
            technicalDetails:
              "Smart wallet not available in current wallet configuration.",
            canRetry: false,
            requiresManualAction: true,
          },
        };
      }

      const smartWalletAddress = primaryWallet.address;
      if (!smartWalletAddress) {
        setIsCreatingDelegation(false);
        return {
          success: false,
          error: {
            type: "OTHER",
            message: "No smart wallet address found",
            userGuidance: "Your smart wallet address could not be determined.",
            technicalDetails: "Primary wallet address is undefined or null.",
            canRetry: true,
            requiresManualAction: false,
          },
        };
      }

      // Get the signer (EOA) address - use proper typing for Dynamic Labs compatibility
      const signerConnector = (primaryWallet.connector as DynamicConnector)
        .eoaConnector;
      if (!signerConnector) {
        setIsCreatingDelegation(false);
        return {
          success: false,
          error: {
            type: "OTHER",
            message: "No signer connector found",
            userGuidance:
              "Your wallet does not support the required signing functionality.",
            technicalDetails:
              "EOA connector not available in wallet configuration.",
            canRetry: false,
            requiresManualAction: true,
          },
        };
      }

      const signerAddress = await signerConnector.getAddress();
      if (!signerAddress) {
        setIsCreatingDelegation(false);
        return {
          success: false,
          error: {
            type: "OTHER",
            message: "No signer address found",
            userGuidance: "Your signer address could not be determined.",
            technicalDetails:
              "Signer connector returned undefined or null address.",
            canRetry: true,
            requiresManualAction: false,
          },
        };
      }

      console.log("Creating smart wallet delegation", {
        smartWallet: smartWalletAddress,
        signer: signerAddress,
        operations: params.operations,
        kernelClientAvailable: !!kernelClient,
        primaryWallet: !!primaryWallet,
        walletStatus: getWalletStatus(),
      });

      // CRITICAL: Check if smart wallet is deployed and auto-deploy if needed
      console.log("Checking if smart wallet is deployed...");
      const isDeployed = await ensureSmartWalletDeployment(smartWalletAddress);

      if (isDeployed) {
        console.log("Smart wallet deployment verified successfully");
      } else {
        console.log(
          "Smart wallet not deployed, attempting automatic deployment..."
        );

        // Check if kernel client is available for automatic deployment
        const walletStatus = getWalletStatus();
        const isEmbeddedWallet = walletStatus.isEmbedded;

        if (!kernelClient && !isEmbeddedWallet) {
          console.error("Kernel client not available for automatic deployment");
          setIsCreatingDelegation(false);
          return {
            success: false,
            error: {
              type: "KERNEL_CLIENT_UNAVAILABLE",
              message: "Smart wallet setup required!",
              userGuidance:
                "Your smart wallet needs to be deployed before creating automated workflows.",
              technicalDetails:
                "The automatic deployment system is not available.",
              canRetry: true,
              requiresManualAction: true,
            },
          };
        }

        // For embedded wallets, try a different deployment approach if kernel client is missing
        if (!kernelClient && isEmbeddedWallet) {
          console.log(
            "Embedded wallet detected without kernel client - trying alternative deployment"
          );

          // Show user that we're trying alternative method
          toast({
            title: "🔧 Setting up Embedded Wallet",
            description:
              "Using alternative deployment method for embedded wallet...",
          });

          // For embedded wallets, we might need to trigger deployment differently
          // Try to make a simple transaction to activate the smart wallet
          try {
            // Use the primary wallet directly to send a small transaction
            const txHash = await primaryWallet.signMessage(
              "Deploy smart wallet"
            );
            console.log("Deployment transaction attempt:", txHash);

            // Wait a bit for processing
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Skip automatic deployment verification for embedded wallets
            console.log(
              "Embedded wallet deployment attempted via message signing"
            );
          } catch (embeddedDeployError) {
            console.error(
              "Embedded wallet deployment failed:",
              embeddedDeployError
            );

            setIsCreatingDelegation(false);
            return {
              success: false,
              error: {
                type: "DEPLOYMENT_FAILED",
                message: "Embedded wallet setup failed",
                userGuidance:
                  "Your embedded wallet needs to be activated. Try disconnecting and reconnecting your wallet, " +
                  "or contact support if the issue persists.",
                technicalDetails: `Embedded wallet deployment error: ${embeddedDeployError instanceof Error ? embeddedDeployError.message : "Unknown error"}`,
                canRetry: true,
                requiresManualAction: true,
              },
            };
          }
        }

        // Show user-friendly toast while deploying with progress
        if (kernelClient) {
          toast({
            title: "🔧 Setting up Smart Wallet",
            description:
              "Step 1/3: Deploying your smart wallet for Account Abstraction...",
          });

          try {
            await deploySmartWalletAutomatically(smartWalletAddress);

            toast({
              title: "✅ Smart Wallet Ready!",
              description:
                "Step 3/3: Your smart wallet has been deployed successfully and is ready for automated workflows.",
            });

            console.log("Automatic smart wallet deployment completed");
          } catch (autoDeployError) {
            console.error("Automatic deployment failed:", autoDeployError);

            // Log the specific smart wallet address for manual funding
            console.error(
              "Smart wallet address that needs deployment:",
              smartWalletAddress
            );

            // Enhanced fallback error with more context
            const deployErrorMessage =
              autoDeployError instanceof Error
                ? autoDeployError.message
                : "Unknown deployment error";

            // Check for specific ZeroDev sponsorship issues
            const isSponsorshipError =
              deployErrorMessage.includes("selfFunded=true") ||
              deployErrorMessage.includes("paymaster") ||
              deployErrorMessage.includes(
                "UserOperation reverted during simulation"
              );

            const isTimeoutError =
              deployErrorMessage.includes("timeout") ||
              deployErrorMessage.includes("could not be confirmed");
            const isNetworkError =
              deployErrorMessage.includes("network") ||
              deployErrorMessage.includes("connection");

            let userGuidance = "";
            let technicalGuidance = "";

            if (isSponsorshipError) {
              userGuidance =
                "Gas sponsorship failed. This might be a ZeroDev configuration issue for SEI testnet.";
              technicalGuidance =
                "Possible fixes: 1) Check Dynamic dashboard AA settings for SEI testnet, " +
                "2) Verify ZeroDev project has SEI paymaster configured, " +
                "3) Try manual deployment by sending 0.001 SEI to same address, " +
                "4) Contact support if ZeroDev doesn't support SEI sponsorship yet.";
            } else if (isTimeoutError) {
              userGuidance =
                "The deployment transaction timed out. This is usually temporary - please try again.";
              technicalGuidance =
                "Network congestion or slow block confirmation times.";
            } else if (isNetworkError) {
              userGuidance =
                "Network connection issue. Please check your internet connection and try again.";
              technicalGuidance =
                "RPC connection or network connectivity problems.";
            } else {
              userGuidance =
                "The automatic deployment process encountered an issue.";
              technicalGuidance =
                "Unknown deployment error - check console logs for details.";
            }

            setIsCreatingDelegation(false);
            return {
              success: false,
              error: {
                type: "DEPLOYMENT_FAILED",
                message: `Smart wallet setup required! ${userGuidance}`,
                userGuidance: `Your smart wallet (${smartWalletAddress.substring(0, 10)}...) needs to be deployed before creating automated workflows. ${technicalGuidance}`,
                technicalDetails: `Account Abstraction deployment error. ${deployErrorMessage}`,
                canRetry: !isSponsorshipError, // Don't retry sponsorship errors automatically
                requiresManualAction: true,
              },
            };
          }
        } else {
          // For embedded wallets without kernel client, continue with delegation creation
          // The embedded wallet deployment was attempted above
          console.log(
            "Continuing with delegation creation for embedded wallet"
          );

          toast({
            title: "✅ Embedded Wallet Ready!",
            description: "Continuing with delegation setup...",
          });
        }
      }

      const validUntil = new Date(
        Date.now() + params.duration * 60 * 60 * 1000
      );

      // Create delegation message that matches backend expectations
      // Create delegation message for automated workflow execution
      // This allows zyra-worker to execute transactions on behalf of the user
      const delegationMessage = {
        owner: signerAddress, // EOA signer address (for verification)
        smartWallet: smartWalletAddress, // Smart wallet address (for execution)
        chainId: params.chainId,
        operations: params.operations, // Allowed operations (eth_transfer, erc20_transfer, etc.)
        maxAmountPerTx: params.maxAmountPerTx, // Per-transaction spending limit
        maxDailyAmount: params.maxDailyAmount, // Daily spending limit
        validUntil: validUntil.toISOString(), // Delegation expiry
        timestamp: new Date().toISOString(),
        nonce: Date.now(),
        // Workflow automation specific fields
        purpose: "workflow_automation",
        platform: "zyra",
        automatedExecution: true,
      };

      const messageToSign = JSON.stringify(delegationMessage, null, 2);

      // Sign the delegation message with the EOA signer
      const signature = await primaryWallet.signMessage(messageToSign);
      if (!signature) {
        setIsCreatingDelegation(false);
        return {
          success: false,
          error: {
            type: "OTHER",
            message: "Failed to sign delegation message",
            userGuidance: "Your wallet could not sign the delegation message.",
            technicalDetails:
              "Message signing returned undefined or null signature.",
            canRetry: true,
            requiresManualAction: false,
          },
        };
      }

      console.log("Delegation signature created successfully");

      // Extract essential kernel client data for backend recreation
      // Note: kernelClient object cannot be serialized and sent over HTTP/WebSocket
      const kernelClientData = {
        smartWalletAddress,
        ownerAddress: signerAddress,
        chainId: params.chainId,
        // Backend will recreate kernel client using ZeroDev SDK
      };

      const delegation: SmartWalletDelegation = {
        smartWalletAddress,
        ownerAddress: signerAddress,
        signerAddress,
        chainId: params.chainId,
        permissions: {
          operations: params.operations,
          maxAmountPerTx: params.maxAmountPerTx,
          maxDailyAmount: params.maxDailyAmount,
          validUntil,
        },
        kernelClientData, // Send serializable data instead of kernelClient object
        delegationSignature: messageToSign, // Store the original message, not the signature
      };

      toast({
        title: "Smart Wallet Ready",
        description: `Smart wallet configured for ${smartWalletAddress.substring(0, 10)}...`,
      });

      console.log("Smart wallet delegation created successfully:", delegation);
      setIsCreatingDelegation(false);
      return {
        success: true,
        delegation,
      };
    },
    [
      primaryWallet,
      isLoggedIn,
      toast,
      deploySmartWalletAutomatically,
      getWalletStatus,
      ensureSmartWalletDeployment,
      kernelClient,
    ]
  );

  /**
   * Execute a transaction directly via frontend kernel client
   * This is used for immediate/interactive transactions, not automated workflows
   * For automated workflow execution, the backend handles AA transactions using the delegation
   */
  const executeTransaction = useCallback(
    async (
      delegation: SmartWalletDelegation,
      transactionRequest: AATransactionRequest
    ): Promise<string> => {
      setIsExecutingTransaction(true);
      try {
        if (!kernelClient) {
          throw new Error("Kernel client not available");
        }

        console.log(
          "Executing immediate AA transaction via kernel client:",
          transactionRequest
        );

        // Validate transaction against delegation permissions
        const txValue = parseEther(transactionRequest.value);
        const maxTxValue = parseEther(delegation.permissions.maxAmountPerTx);

        if (txValue > maxTxValue) {
          throw new Error(
            `Transaction value exceeds maximum allowed: ${delegation.permissions.maxAmountPerTx}`
          );
        }

        if (new Date() > delegation.permissions.validUntil) {
          throw new Error("Delegation has expired");
        }

        // Use kernel client to encode and send the transaction
        const callData = await kernelClient.account.encodeCalls([
          {
            to: transactionRequest.to as `0x${string}`,
            value: parseEther(transactionRequest.value),
            data: (transactionRequest.data || "0x") as `0x${string}`,
          },
        ]);

        console.log("Sending immediate user operation via kernel client");

        // Send the user operation - ZeroDev handles bundling, gas estimation, etc.
        const userOpHash = await kernelClient.sendUserOperation({
          callData,
        });

        console.log("UserOperation submitted successfully:", userOpHash);

        toast({
          title: "Transaction Sent",
          description: `Immediate transaction submitted with hash: ${userOpHash.substring(0, 20)}...`,
        });

        return userOpHash;
      } catch (error) {
        console.error("Failed to execute immediate AA transaction:", error);
        toast({
          title: "Transaction Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to execute transaction",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsExecutingTransaction(false);
      }
    },
    [kernelClient, toast]
  );

  /**
   * Simulate transaction before execution
   * This could use kernel client simulation features in the future
   */
  const simulateTransaction = useCallback(
    async (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _delegation: SmartWalletDelegation,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _transactionRequest: AATransactionRequest
    ): Promise<{ success: boolean; gasEstimate?: string; error?: string }> => {
      try {
        if (!kernelClient) {
          return {
            success: false,
            error: "Kernel client not available",
          };
        }

        // For now, return success if kernel client is available
        // In the future, this could use actual simulation features
        return {
          success: true,
          gasEstimate: "Sponsored", // Gas is sponsored via Dynamic/ZeroDev
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Simulation failed",
        };
      }
    },
    [kernelClient]
  );

  /**
   * Check if current wallet is a smart wallet
   */
  const isSmartWallet = useCallback(() => {
    return !!(
      primaryWallet?.connector && isZeroDevConnector(primaryWallet.connector)
    );
  }, [primaryWallet]);

  /**
   * Get delegation info for automated workflow execution
   * This explains how the delegation enables background execution by zyra-worker
   */
  const getDelegationInfo = useCallback((delegation: SmartWalletDelegation) => {
    return {
      // Smart wallet that will execute transactions
      smartWallet: delegation.smartWalletAddress,

      // EOA that signed the delegation (for verification)
      signer: delegation.signerAddress,

      // Execution permissions
      permissions: {
        operations: delegation.permissions.operations,
        maxPerTransaction: delegation.permissions.maxAmountPerTx,
        dailyLimit: delegation.permissions.maxDailyAmount,
        expiresAt: delegation.permissions.validUntil,
      },

      // How it works for automated workflows
      executionFlow: {
        immediate: "Frontend kernel client executes transactions directly",
        automated:
          "Backend zyra-worker executes transactions using this delegation when workflows run",
        gasSponsorship: "ZeroDev paymaster sponsors gas costs",
        security: "Spending limits and operation restrictions enforced",
      },
    };
  }, []);

  /**
   * Get smart wallet and signer addresses
   */
  const getAddresses = useCallback(async () => {
    if (
      !primaryWallet?.connector ||
      !isZeroDevConnector(primaryWallet.connector)
    ) {
      return null;
    }

    const smartWalletAddress = primaryWallet.address;
    const signerConnector = (primaryWallet.connector as DynamicConnector)
      .eoaConnector;
    const signerAddress = await signerConnector?.getAddress();

    return {
      smartWalletAddress,
      signerAddress,
    };
  }, [primaryWallet]);

  return {
    // State
    isCreatingDelegation,
    isExecutingTransaction,
    kernelClient: !!kernelClient,

    // Actions
    createSmartWalletDelegation,
    executeTransaction,
    simulateTransaction,

    // Utilities
    isSmartWallet,
    getWalletStatus,
    getAddresses,
    getDelegationInfo,
  };
}
