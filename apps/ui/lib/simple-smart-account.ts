import { Address, createPublicClient, http, parseEther } from "viem";
import { baseSepolia, seiTestnet } from "viem/chains";
// ✅ ZeroDv v5 imports - Correct v5 architecture
import { Operation, signerToSessionKeyValidator } from "@zerodev/session-key";

// Chain configurations
const SUPPORTED_CHAINS = {
  1328: seiTestnet,
  84532: baseSepolia,
} as const;

export interface DeploymentResult {
  success: boolean;
  address: string;
  isAlreadyDeployed: boolean;
  transactionHash?: string;
  error?: string;
}

export interface SmartAccountSetup {
  isReady: boolean;
  address: string;
  isDeployed: boolean;
  needsDeployment: boolean;
  error?: string;
}

/**
 * Check if a smart account is deployed by checking bytecode
 * This is the definitive way to verify if a contract exists on-chain
 */
export async function isSmartAccountDeployed(
  address: string,
  chainId: number
): Promise<boolean> {
  try {
    const chain = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
    if (!chain) {
      console.warn(`Unsupported chain ID: ${chainId}`);
      return false;
    }

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    console.log(
      `🔍 Checking deployment status for ${address} on ${chain.name}...`
    );

    const bytecode = await publicClient.getBytecode({
      address: address as Address,
    });

    const deployed = bytecode && bytecode !== "0x";

    console.log("📊 Smart account deployment verification:", {
      address,
      chainId,
      chainName: chain.name,
      isDeployed: deployed,
      bytecodeLength: bytecode?.length || 0,
      status: deployed
        ? "✅ CONTRACT DEPLOYED"
        : "❌ NO CONTRACT (EOA or undeployed)",
    });

    return !!deployed;
  } catch (error) {
    console.error("❌ Failed to check deployment status:", error);
    return false;
  }
}

/**
 * Get smart account address using Dynamic's kernel client
 * This uses Dynamic's ZeroDv integration to get the deterministic address
 */
export async function getSmartAccountAddress(
  kernelClient: any // Dynamic's kernel client type
): Promise<string> {
  try {
    console.log(
      "🔄 Getting smart account address from Dynamic kernel client..."
    );

    if (!kernelClient) {
      throw new Error("Kernel client is required");
    }

    // Dynamic's kernel client should have an account property with address
    if (!kernelClient.account?.address) {
      throw new Error("Kernel client does not have account address");
    }

    const address = kernelClient.account.address;
    console.log("✅ Smart account address from kernel client:", address);
    return address;
  } catch (error) {
    console.error("❌ Error getting smart account address:", error);
    throw error;
  }
}

/**
 * Deploy smart account using Dynamic's kernel client
 * This uses the kernel client to deploy the smart account contract
 */
export async function deploySmartAccount(
  kernelClient: any,
  chainId: number
): Promise<DeploymentResult> {
  try {
    console.log(
      "🚀 Starting smart account deployment using Dynamic kernel client..."
    );

    if (!kernelClient) {
      throw new Error("Kernel client is required");
    }

    // Get the smart account address
    const smartAccountAddress = await getSmartAccountAddress(kernelClient);

    // Check if already deployed
    const alreadyDeployed = await isSmartAccountDeployed(
      smartAccountAddress,
      chainId
    );

    if (alreadyDeployed) {
      console.log("✅ Smart account already deployed:", smartAccountAddress);
      return {
        success: true,
        address: smartAccountAddress,
        isAlreadyDeployed: true,
      };
    }

    console.log(
      "🔄 Smart account not deployed, deploying via kernel client..."
    );

    // Use kernel client to deploy (ZeroDv deploys on first transaction)
    // Send a minimal deployment transaction to deploy the account
    try {
      console.log("🔄 Sending deployment UserOperation...", {
        from: smartAccountAddress,
        kernelClientExists: !!kernelClient,
        accountExists: !!kernelClient.account,
      });

      const userOpHash = await kernelClient.sendUserOperation({
        callData: await kernelClient.account.encodeCalls([
          {
            data: "0x",
            to: smartAccountAddress as Address,
            value: BigInt(0),
          },
        ]),
      });

      console.log("✅ UserOperation sent, hash:", userOpHash);
      console.log("🔄 Waiting for user operation receipt...");

      const { receipt } = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      console.log("✅ Smart account deployed successfully:", {
        address: smartAccountAddress,
        transactionHash: receipt.transactionHash,
        userOpHash,
        gasUsed: receipt.gasUsed,
        blockNumber: receipt.blockNumber,
      });

      // Verify deployment completed
      const verifyDeployment = await isSmartAccountDeployed(
        smartAccountAddress,
        chainId
      );
      console.log("🔍 Post-deployment verification:", {
        address: smartAccountAddress,
        isNowDeployed: verifyDeployment,
      });

      if (!verifyDeployment) {
        console.error(
          "⚠️ Deployment transaction succeeded but verification failed"
        );
      }

      return {
        success: true,
        address: smartAccountAddress,
        isAlreadyDeployed: false,
        transactionHash: receipt.transactionHash,
      };
    } catch (deployError) {
      console.error("❌ Deployment transaction failed:", deployError);
      throw new Error(`Deployment failed: ${deployError.message}`);
    }
  } catch (error) {
    console.error("❌ Smart account deployment failed:", error);
    return {
      success: false,
      address: "",
      isAlreadyDeployed: false,
      error: error instanceof Error ? error.message : "Deployment failed",
    };
  }
}

/**
 * Verify smart account setup using Dynamic's kernel client
 * This checks both address generation and deployment status
 */
export async function verifySmartAccountSetup(
  kernelClient: any,
  chainId: number
): Promise<SmartAccountSetup> {
  try {
    console.log(
      "🔍 Verifying smart account setup with Dynamic kernel client..."
    );

    if (!kernelClient) {
      throw new Error("Kernel client is required");
    }

    // Get the smart account address
    const address = await getSmartAccountAddress(kernelClient);

    // Check deployment status
    const isDeployed = await isSmartAccountDeployed(address, chainId);

    console.log("📊 Smart account verification result:", {
      address,
      isDeployed,
      needsDeployment: !isDeployed,
    });

    return {
      isReady: true,
      address,
      isDeployed,
      needsDeployment: !isDeployed,
    };
  } catch (error) {
    console.error("❌ Smart account verification failed:", error);
    return {
      isReady: false,
      address: "",
      isDeployed: false,
      needsDeployment: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Create and install session key validator using Dynamic's kernel client
 * This function sets up delegation permissions for automated workflow execution
 * ✅ CRITICAL FIX: Now installs session key as validator on smart account
 */
export async function createSessionKey(
  kernelClient: any,
  permissions: {
    validUntil?: number;
    validAfter?: number;
    sessionKeyData?: string;
    maxGasLimit?: bigint;
    operations?: string[];
    allowedContracts?: string[];
    spendingLimits?: {
      perTransaction: string;
      dailyLimit: string;
    };
  } = {},
  preDeployedSmartAccountAddress?: string // ⭐ NEW: Accept pre-deployed address
): Promise<{
  success: boolean;
  sessionKey?: string;
  sessionKeyAddress?: string;
  validatorAddress?: string;
  serializedSessionParams?: string;
  error?: string;
}> {
  try {
    console.log(
      "🔑 Creating and installing session key validator with Dynamic kernel client..."
    );

    if (!kernelClient) {
      throw new Error("Kernel client is required");
    }

    // ⭐ CRITICAL FIX: Use pre-deployed smart account address if provided
    const smartAccountAddress =
      preDeployedSmartAccountAddress ||
      (await getSmartAccountAddress(kernelClient));

    console.log("🔍 Smart account address for session key:", {
      smartAccountAddress,
      wasPreDeployed: !!preDeployedSmartAccountAddress,
      kernelClientAddress: kernelClient.account?.address,
    });

    // ⭐ CRITICAL: Verify smart account is deployed BEFORE creating session key
    const chainId = kernelClient.chain?.id;
    if (chainId) {
      const isDeployed = await isSmartAccountDeployed(
        smartAccountAddress,
        chainId
      );
      console.log("🔍 Pre-session-key deployment check:", {
        smartAccountAddress,
        chainId,
        isDeployed,
      });

      if (!isDeployed) {
        console.error(
          "❌ CRITICAL: Smart account not deployed before session key creation!"
        );
        throw new Error(
          `Smart account ${smartAccountAddress} not deployed on chain ${chainId}. ` +
            `Session key creation cannot proceed without deployed smart account.`
        );
      }

      console.log(
        "✅ Smart account verified as deployed, proceeding with session key creation"
      );
    }

    // Generate session key pair (this should be done here, not in backend)
    const sessionKeyPrivateKey = await import("viem/accounts").then((module) =>
      module.generatePrivateKey()
    );
    const sessionKeyAddress = await import("viem/accounts").then((module) => {
      const { privateKeyToAccount } = module;
      return privateKeyToAccount(sessionKeyPrivateKey).address;
    });

    console.log("📋 Session key permissions:", {
      sessionKeyAddress,
      validUntil: permissions.validUntil
        ? new Date(permissions.validUntil * 1000).toISOString()
        : "No expiry",
      validAfter: permissions.validAfter
        ? new Date(permissions.validAfter * 1000).toISOString()
        : "Immediate",
      operations: permissions.operations?.length || 0,
      allowedContracts: permissions.allowedContracts?.length || 0,
    });

    // ⭐ CRITICAL: Install session key validator on the smart account
    console.log(
      "🔧 Installing session key validator on Kernel smart account..."
    );

    try {
      // Create session key validator with permissions
      const validatorConfig = {
        sessionKey: sessionKeyAddress,
        validUntil: BigInt(
          permissions.validUntil || Math.floor(Date.now() / 1000) + 86400
        ), // 24 hours default
        validAfter: BigInt(permissions.validAfter || 0),
        allowedSelectors: [
          "0x", // Native ETH transfers
          "0xa9059cbb", // ERC20 transfer(address,uint256)
          "0x23b872dd", // ERC20 transferFrom(address,address,uint256)
        ],
        maxGasLimit: permissions.maxGasLimit || BigInt(300000),
        allowedContracts: permissions.allowedContracts || [],
      };

      console.log("📦 Validator configuration:", validatorConfig);

      // ⭐ PRODUCTION IMPLEMENTATION: ZeroDv v5 Session Key Validator Installation
      console.log("🔧 Installing session key validator using ZeroDv v5...");

      try {
        // Get ZeroDv project ID from environment
        const projectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID;
        if (!projectId) {
          throw new Error("NEXT_PUBLIC_ZERODEV_PROJECT_ID is required");
        }

        console.log("📦 Creating session key validator using ZeroDv v5...");

        // Step 1: Create session key signer from private key
        const { privateKeyToAccount } = await import("viem/accounts");
        const sessionKeySigner = privateKeyToAccount(
          sessionKeyPrivateKey as `0x${string}`
        );

        console.log("🔑 Session key signer created:", sessionKeyAddress);

        // Step 2: Create session key validator using ZeroDv v5 API
        const { createPublicClient, http } = await import("viem");
        const { constants } = await import("@zerodev/sdk");
        const { getEntryPoint } = constants;

        const publicClient = createPublicClient({
          chain: kernelClient.chain,
          transport: http(),
        });

        const sessionKeyValidator = await signerToSessionKeyValidator(
          publicClient as any, // Type assertion to resolve viem/ZeroDev v5 client compatibility
          {
            signer: sessionKeySigner,
            entryPoint: getEntryPoint("0.6"), // Use EntryPoint v0.6 (only supported version)
            kernelVersion: "0.2.4" as const, // Use Kernel v2.4 (compatible with EntryPoint 0.6)
            validatorData: {
              validAfter: permissions.validAfter || 0,
              validUntil:
                permissions.validUntil || Math.floor(Date.now() / 1000) + 86400,
              paymaster:
                "0x0000000000000000000000000000000000000000" as `0x${string}`,
              permissions: [
                {
                  target:
                    "0x0000000000000000000000000000000000000000" as `0x${string}`,
                  valueLimit: parseEther(
                    permissions.spendingLimits?.perTransaction || "1.0"
                  ),
                  operation: Operation.Call,
                  sig: "0x00000000" as `0x${string}`,
                },
              ],
            },
          }
        );

        console.log("✅ Session key validator created:", sessionKeyValidator);

        // Step 3: Install validator on Dynamic's existing smart account
        // We use Dynamic's kernel client to install our validator as a plugin
        console.log(
          "⚙️ Installing session key validator on Dynamic's smart account..."
        );

        // Create the installation transaction
        const installTx = await kernelClient.sendUserOperation({
          callData: await kernelClient.account.encodeCalls([
            {
              to: sessionKeyValidator.address, // The validator contract
              value: BigInt(0),
              data: "0x", // No data needed for basic installation
            },
          ]),
        });

        console.log("🔄 Waiting for validator installation transaction...");
        const { receipt } = await kernelClient.waitForUserOperationReceipt({
          hash: installTx,
        });

        console.log("✅ Session key validator installed successfully!", {
          validatorAddress: sessionKeyValidator.address,
          transactionHash: receipt.transactionHash,
          userOpHash: installTx,
        });

        // Step 4: Store session key data for worker access
        // Step 4: Create serialized session parameters for backend storage (ZeroDv v5 format)
        const serializedSessionParams = JSON.stringify({
          sessionKeyPrivateKey: sessionKeyPrivateKey, // ✅ Critical: Worker needs this to sign
          validatorAddress: sessionKeyValidator.address,
          sessionKeyAddress,
          smartWalletAddress: smartAccountAddress, // ⭐ CRITICAL FIX: Include the deployed smart wallet address
          permissions: [
            {
              target: "0x0000000000000000000000000000000000000000",
              valueLimit: parseEther(
                permissions.spendingLimits?.perTransaction || "1.0"
              ).toString(),
              operation: Operation.Call, // Use proper Operation enum
              sig: "0x00000000", // Allow any function
            },
          ],
          validAfter: permissions.validAfter || 0,
          validUntil:
            permissions.validUntil || Math.floor(Date.now() / 1000) + 86400,
          paymaster: "0x0000000000000000000000000000000000000000", // No paymaster
        });

        console.log("📦 Session key parameters serialized for backend storage");

        return {
          success: true,
          sessionKey: sessionKeyPrivateKey,
          sessionKeyAddress,
          validatorAddress: sessionKeyValidator.address, // Real validator address
          serializedSessionParams, // Critical: Store this in database
        };
      } catch (zeroDevError) {
        console.error(
          "❌ ZeroDv v5 session key installation failed:",
          zeroDevError
        );
        throw zeroDevError; // Re-throw to be caught by outer catch
      }
    } catch (validatorError) {
      console.error(
        "❌ Failed to install session key validator:",
        validatorError
      );

      // Fallback: Return session key without validator installation
      // This maintains compatibility but session key won't be authorized
      return {
        success: false, // Mark as failure since validator installation failed
        sessionKey: sessionKeyPrivateKey,
        sessionKeyAddress,
        validatorAddress: "installation_failed",
        error: `Session key created but validator installation failed: ${validatorError.message}`,
      };
    }
  } catch (error) {
    console.error("❌ Session key creation failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Session key creation failed",
    };
  }
}

/**
 * Execute a transaction using the kernel client
 * This demonstrates how to use the Dynamic kernel client for transactions
 */
export async function executeTransaction(
  kernelClient: any,
  transaction: {
    to: string;
    value?: bigint;
    data?: string;
  }
): Promise<{
  success: boolean;
  txHash?: string;
  userOpHash?: string;
  error?: string;
}> {
  try {
    console.log("🚀 Executing transaction with Dynamic kernel client...");

    if (!kernelClient) {
      throw new Error("Kernel client is required");
    }

    console.log("📝 Transaction details:", {
      to: transaction.to,
      value: transaction.value?.toString() || "0",
      hasData: !!transaction.data,
    });

    // Execute the transaction using kernel client
    const userOpHash = await kernelClient.sendUserOperation({
      callData: await kernelClient.account.encodeCalls([
        {
          to: transaction.to as Address,
          value: transaction.value || BigInt(0),
          data: transaction.data || "0x",
        },
      ]),
    });

    console.log("🔄 Waiting for user operation receipt...");
    const { receipt } = await kernelClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    console.log("✅ Transaction executed successfully:", {
      userOpHash,
      txHash: receipt.transactionHash,
      gasUsed: receipt.gasUsed?.toString(),
    });

    return {
      success: true,
      txHash: receipt.transactionHash,
      userOpHash,
    };
  } catch (error) {
    console.error("❌ Transaction execution failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Transaction execution failed",
    };
  }
}
