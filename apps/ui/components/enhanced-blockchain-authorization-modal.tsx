"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import {
  SUPPORTED_CHAINS,
  SecurityLevel,
  SecureBlockchainAuthConfig,
  UnifiedWorkflowNode,
} from "@zzyra/types";
import { useToast } from "@/components/ui/use-toast";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import {
  usePimlicoSmartAccount,
  SmartWalletDelegationResult,
} from "@/hooks/use-pimlico-smart-account";
import { Alert, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/services/api";

interface SelectedTool {
  id: string;
  name: string;
  type: "mcp" | "goat" | "builtin";
  config: Record<string, unknown>;
  description?: string;
  category?: string;
  enabled?: boolean;
}

interface BlockchainNode {
  node: UnifiedWorkflowNode;
  chains: string[];
  tools: SelectedTool[];
}

interface BlockchainAuthData {
  blockchainNodes: BlockchainNode[];
  supportedChains: string[];
  estimatedSpending: Record<string, string>;
}

interface EnhancedBlockchainAuthorizationModalProps {
  nodes: UnifiedWorkflowNode[];
  open?: boolean;
  onAuthorize: (config: SecureBlockchainAuthConfig) => void;
  onCancel: () => void;
}

/**
 * Detect blockchain operations in workflow nodes
 */
function detectBlockchainOperations(
  nodes: UnifiedWorkflowNode[]
): BlockchainAuthData {
  const blockchainNodes: BlockchainNode[] = [];
  const supportedChains = new Set<string>();

  nodes.forEach((node) => {
    // AI_AGENT blocks with blockchain tools
    if (node.data?.blockType === "AI_AGENT") {
      const blockchainTools = (
        node.data?.config?.selectedTools as SelectedTool[]
      )?.filter(
        (tool: SelectedTool) =>
          tool.id === "goat" ||
          tool.name?.toLowerCase().includes("blockchain") ||
          tool.description?.toLowerCase().includes("sei") ||
          tool.description?.toLowerCase().includes("ethereum") ||
          tool.description?.toLowerCase().includes("base")
      );

      if (blockchainTools?.length > 0) {
        const chains = detectChainsFromTools(blockchainTools);
        chains.forEach((chain) => supportedChains.add(chain));

        blockchainNodes.push({
          node,
          chains,
          tools: blockchainTools,
        });
      }
    }

    // Direct blockchain blocks
    const blockType = node.data?.blockType?.toString();
    if (
      blockType === "AI_BLOCKCHAIN" ||
      blockType === "SEND_TRANSACTION" ||
      blockType === "CHECK_BALANCE" ||
      blockType === "SWAP_TOKENS" ||
      blockType === "CREATE_WALLET"
    ) {
      const chain = (node.data?.config?.chainId as string) || "1328";
      supportedChains.add(chain);

      blockchainNodes.push({
        node,
        chains: [chain],
        tools: [],
      });
    }
  });

  return {
    blockchainNodes,
    supportedChains: Array.from(supportedChains) as string[],
    estimatedSpending: calculateEstimatedSpendingByChain(blockchainNodes),
  };
}

function detectChainsFromTools(tools: SelectedTool[]): string[] {
  const chains = new Set<string>();

  tools.forEach((tool) => {
    if (tool.description?.toLowerCase().includes("sei")) {
      chains.add("1328");
    } else if (tool.description?.toLowerCase().includes("base")) {
      chains.add("base-sepolia");
    } else if (tool.description?.toLowerCase().includes("ethereum")) {
      chains.add("ethereum-sepolia");
    } else {
      chains.add("1328"); // Default to SEI
    }
  });

  return Array.from(chains);
}

function calculateEstimatedSpendingByChain(
  blockchainNodes: BlockchainNode[]
): Record<string, string> {
  const spending: Record<string, string> = {};

  blockchainNodes.forEach(({ node, chains }) => {
    chains.forEach((chain) => {
      if (!spending[chain]) spending[chain] = "0";

      if (node.data?.config?.maxSpendPerTrade) {
        const current = parseFloat(spending[chain]);
        const additional = parseFloat(
          String(node.data.config.maxSpendPerTrade)
        );
        spending[chain] = (current + additional).toString();
      } else {
        const defaults = {
          "1328": "1.0",
          "base-sepolia": "0.01",
          "ethereum-sepolia": "0.001",
        };
        const defaultValue = defaults[chain as keyof typeof defaults];
        spending[chain] = defaultValue || "1.0";
      }
    });
  });

  return spending;
}

export function EnhancedBlockchainAuthorizationModal({
  nodes,
  open = true,
  onAuthorize,
  onCancel,
}: EnhancedBlockchainAuthorizationModalProps) {
  const { toast } = useToast();
  const { isLoggedIn, getCurrentUser } = useDynamicAuth();
  const {
    createSmartWalletDelegation,
    isCreatingDelegation,
    smartAccountAddress,
    isDeploying,
  } = usePimlicoSmartAccount();

  // Detect blockchain operations - memoize to prevent infinite re-renders
  const authData = useMemo(() => detectBlockchainOperations(nodes), [nodes]);

  // Enhanced state for session key configuration
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>(
    SecurityLevel.BASIC
  );
  const [requireConfirmation, setRequireConfirmation] = useState(false);
  const [emergencyContacts] = useState<string[]>([]);
  const [spendingAlerts] = useState([
    { threshold: 50, method: "push" as const },
    { threshold: 80, method: "email" as const },
  ]);

  // State for each supported chain - with proper null safety
  const [chainConfigs, setChainConfigs] = useState<
    Record<string, { spending: string; enabled: boolean }>
  >({});

  const [duration, setDuration] = useState("24");
  const [deploymentAttempts, setDeploymentAttempts] = useState(0);
  const [isRetryingDeployment, setIsRetryingDeployment] = useState(false);

  // Error dialog state
  const [errorDialog, setErrorDialog] = useState<{
    show: boolean;
    error?: NonNullable<SmartWalletDelegationResult["error"]>;
  }>({ show: false });

  // Get wallet status for better error handling
  const walletStatus = getWalletStatus();
  const canCreateDelegation = isLoggedIn && walletStatus.hasSmartWallet;

  // Use ref to prevent unnecessary effect runs
  const hasInitialized = useRef(false);

  // Update chainConfigs only when authData changes, not on every render
  useEffect(() => {
    if (authData?.supportedChains && Array.isArray(authData.supportedChains)) {
      setChainConfigs((prevConfigs) => {
        // Check if we actually need to update anything
        const hasChanges = authData.supportedChains.some((chain) => {
          const existing = prevConfigs[chain];
          const newSpending = authData.estimatedSpending[chain] || "1.0";
          return !existing || existing.spending !== newSpending;
        });

        // Only update if there are actual changes
        if (!hasChanges) {
          return prevConfigs;
        }

        const newConfigs: Record<
          string,
          { spending: string; enabled: boolean }
        > = {};
        authData.supportedChains.forEach((chain) => {
          // Preserve existing config if available, otherwise create new
          newConfigs[chain] = prevConfigs[chain] || {
            spending: authData.estimatedSpending[chain] || "1.0",
            enabled: true,
          };
        });

        hasInitialized.current = true;
        return newConfigs;
      });
    }
  }, [authData]); // Use the memoized authData object

  const handleClose = () => {
    onCancel();
  };

  const showDeploymentErrorDialog = (
    error: NonNullable<SmartWalletDelegationResult["error"]>
  ) => {
    setErrorDialog({ show: true, error });
  };

  const showManualActionDialog = (
    error: NonNullable<SmartWalletDelegationResult["error"]>
  ) => {
    setErrorDialog({ show: true, error });
  };

  const closeErrorDialog = () => {
    setErrorDialog({ show: false });
  };

  const retrySmartWalletDeployment = async () => {
    if (!walletStatus.hasSmartWallet) {
      toast({
        title: "Smart Wallet Required",
        description:
          "Please ensure you have an embedded wallet (Email/SMS login) before retrying.",
        variant: "destructive",
      });
      return;
    }

    setIsRetryingDeployment(true);
    setDeploymentAttempts((prev) => prev + 1);

    try {
      // Show immediate feedback
      toast({
        title: "Retrying Smart Wallet Setup",
        description: `Attempt ${deploymentAttempts + 1}: Setting up your smart wallet...`,
      });

      // Try the delegation creation again
      await handleAuthorize();
    } catch (error) {
      console.error("Retry failed:", error);
      toast({
        title: "Retry Failed",
        description:
          error instanceof Error
            ? error.message
            : "Smart wallet setup failed again.",
        variant: "destructive",
      });
    } finally {
      setIsRetryingDeployment(false);
    }
  };

  const handleAuthorize = async () => {
    // Pre-flight wallet status check
    if (!walletStatus.hasSmartWallet) {
      const errorMsg = walletStatus.isEmbedded
        ? "Smart wallet not available. This might be a configuration issue. Please check the wallet status below or try refreshing the page."
        : "Smart wallet required. Please disconnect your current wallet and login with Email/SMS to create an embedded wallet with Account Abstraction support.";

      toast({
        title: "Smart Wallet Required",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedChains = authData.supportedChains
        .filter((chain) => chainConfigs[chain]?.enabled)
        .map((chain) => {
          const config = chainConfigs[chain];
          if (!config) {
            // Skip chains without config
            return null;
          }
          return {
            chainId: chain,
            chainName:
              SUPPORTED_CHAINS[chain as keyof typeof SUPPORTED_CHAINS]?.name ||
              chain,
            maxDailySpending: config.spending,
            allowedOperations: ["send", "swap", "stake"],
            tokenSymbol:
              SUPPORTED_CHAINS[chain as keyof typeof SUPPORTED_CHAINS]
                ?.symbol || "TOKEN",
            enabled: true,
          };
        })
        .filter((chain): chain is NonNullable<typeof chain> => chain !== null); // Type-safe filter

      if (selectedChains.length === 0) {
        toast({
          title: "No Chains Selected",
          description: "Please enable at least one blockchain network.",
          variant: "destructive",
        });
        return;
      }

      const currentUser = getCurrentUser();
      if (!isLoggedIn || !currentUser) {
        throw new Error("Dynamic wallet not connected");
      }
      console.log("selectedChains", selectedChains);
      console.log("Wallet status:", walletStatus);

      // Get the first selected chain (we know it exists due to the length check above)
      const primaryChain = selectedChains[0];
      if (!primaryChain) {
        throw new Error("No primary chain selected");
      }

      // Create Smart Wallet (AA) delegation - Single production path
      const delegationResult = await createSmartWalletDelegation({
        chainId: primaryChain.chainId,
        operations: ["eth_transfer", "erc20_transfer"],
        maxAmountPerTx: primaryChain.maxDailySpending,
        maxDailyAmount: primaryChain.maxDailySpending,
        duration: parseInt(duration),
      });

      // Handle structured error response
      if (!delegationResult.success) {
        const error = delegationResult.error!;

        // Show user-friendly error dialog with retry options
        if (error.type === "DEPLOYMENT_FAILED" && error.canRetry) {
          // Show deployment error with retry options
          showDeploymentErrorDialog(error);
          return;
        } else if (
          error.type === "KERNEL_CLIENT_UNAVAILABLE" &&
          error.requiresManualAction
        ) {
          // Show manual action required error
          showManualActionDialog(error);
          return;
        } else {
          // Show generic error
          throw new Error(error.message);
        }
      }

      const delegation = delegationResult.delegation!;

      // Create a session key OWNED BY the smart wallet for automated execution
      const validUntilIso = new Date(
        Date.now() + parseInt(duration) * 60 * 60 * 1000
      ).toISOString();

      const createSessionKeyPayload = {
        walletAddress: delegation.signerAddress, // EOA that authorized the smart wallet
        smartWalletOwner: delegation.smartWalletAddress, // Smart wallet that owns the session key
        chainId: primaryChain.chainId,
        securityLevel,
        validUntil: validUntilIso,
        permissions: [
          {
            operation: "eth_transfer",
            maxAmountPerTx: primaryChain.maxDailySpending,
            maxDailyAmount: primaryChain.maxDailySpending,
            allowedContracts: [],
            requireConfirmation,
            emergencyStop: false,
          },
          {
            operation: "erc20_transfer",
            maxAmountPerTx: primaryChain.maxDailySpending,
            maxDailyAmount: primaryChain.maxDailySpending,
            allowedContracts: [],
            requireConfirmation,
            emergencyStop: false,
          },
          {
            operation: "conditional_transfer", // For delayed execution
            maxAmountPerTx: primaryChain.maxDailySpending,
            maxDailyAmount: primaryChain.maxDailySpending,
            allowedContracts: [],
            requireConfirmation: false, // Automated conditional execution
            emergencyStop: false,
          },
        ],
        userSignature: delegation.delegationSignature,
      };

      const sessionKeyResponse = await api.post(
        "/session-keys",
        createSessionKeyPayload
      );
      const sessionKeyId: string =
        sessionKeyResponse?.data?.data?.sessionKey?.id;

      if (!sessionKeyId) {
        throw new Error("Failed to create session key for automated execution");
      }

      // Create AA authorization config
      const config: SecureBlockchainAuthConfig = {
        selectedChains,
        duration: parseInt(duration),
        timestamp: Date.now(),
        securityLevel,
        requireConfirmation,
        emergencyContacts,
        spendingAlerts,
        // Store PROPER delegation hierarchy data
        delegationSignature: JSON.stringify({
          useAA: true,
          provider: "pimlico",

          // Delegation Chain: EOA → Smart Wallet → Session Key
          owner: delegation.ownerAddress, // EOA that signed the delegation
          smartWallet: delegation.smartWalletAddress, // Smart wallet address
          sessionKeyId: sessionKeyId, // Session key owned by smart wallet

          // Authorization hierarchy
          delegationChain: {
            eoa: delegation.ownerAddress,
            smartWallet: delegation.smartWalletAddress,
            sessionKey: sessionKeyId,
          },

          // Permitted operations
          operations: [
            "eth_transfer",
            "erc20_transfer",
            "conditional_transfer",
          ],
          maxAmountPerTx: primaryChain.maxDailySpending,
          maxDailyAmount: primaryChain.maxDailySpending,
          validUntil: validUntilIso,

          // Original message used for session key encryption/decryption
          signature: delegation.delegationSignature,
          encryptionMessage: delegation.delegationSignature,
        }),
        sessionKeyId,
      };

      onAuthorize(config);

      toast({
        title: "Smart Wallet Created",
        description: `AA delegation created for ${selectedChains.length} chain(s) with ${securityLevel} security level.`,
      });
    } catch (error) {
      console.error("Authorization error:", error);

      // Enhanced error handling with actionable guidance
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDeploymentError =
        errorMessage.includes("Smart wallet setup required") ||
        errorMessage.includes("not deployed") ||
        errorMessage.includes("deployment");

      if (isDeploymentError) {
        // This is a deployment-related error - show specific guidance
        toast({
          title: "Smart Wallet Setup Required",
          description: `Your smart wallet needs to be deployed first. ${deploymentAttempts > 0 ? `(Attempt ${deploymentAttempts + 1})` : ""}`,
          variant: "destructive",
        });
      } else {
        // Other types of errors
        toast({
          title: "Authorization Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const updateChainSpending = (chain: string, spending: string) => {
    setChainConfigs((prev) => {
      const existingConfig = prev[chain];
      if (!existingConfig) {
        // Create default config if it doesn't exist
        return {
          ...prev,
          [chain]: { spending, enabled: true },
        };
      }
      return {
        ...prev,
        [chain]: { ...existingConfig, spending },
      };
    });
  };

  const toggleChainEnabled = (chain: string) => {
    setChainConfigs((prev) => {
      const existingConfig = prev[chain];
      if (!existingConfig) {
        // Create default config if it doesn't exist
        return {
          ...prev,
          [chain]: { spending: "1.0", enabled: true },
        };
      }
      return {
        ...prev,
        [chain]: { ...existingConfig, enabled: !existingConfig.enabled },
      };
    });
  };

  // Safety check: don't render if no blockchain operations detected
  if (!authData?.blockchainNodes || authData.blockchainNodes.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[700px] max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-3'>
            <Shield className='h-6 w-6 text-primary' />
            <div>
              <span className='text-lg font-semibold'>
                Secure Blockchain Authorization
              </span>
              <p className='text-sm text-muted-foreground mt-1'>
                Create a secure session key for automated blockchain operations
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-6'>
          {/* Wallet Status Warning */}
          {!walletStatus.hasSmartWallet && (
            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <strong>Smart Wallet Required</strong>
                <br />
                {walletStatus.isEmbedded ? (
                  <>
                    You have an embedded wallet but smart wallet is not
                    available. This might be due to:
                    <ul className='list-disc list-inside mt-2 space-y-1 text-sm'>
                      <li>
                        Smart wallet still being deployed (this can take a
                        moment)
                      </li>
                      <li>Smart wallets not enabled in Dynamic dashboard</li>
                      <li>ZeroDev configuration issue</li>
                      <li>Network connectivity issues</li>
                    </ul>
                    <div className='mt-3 flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => window.location.reload()}
                        disabled={isRetryingDeployment}>
                        Refresh Page
                      </Button>
                      {deploymentAttempts > 0 && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={retrySmartWalletDeployment}
                          disabled={isRetryingDeployment}>
                          {isRetryingDeployment
                            ? "Retrying..."
                            : `Retry (${deploymentAttempts})`}
                        </Button>
                      )}
                    </div>
                    <div className='mt-2 text-xs text-muted-foreground'>
                      Current wallet: {walletStatus.walletType || "Unknown"} |
                      Status: {walletStatus.message || "Unknown"}
                      {deploymentAttempts > 0 &&
                        ` | Deployment attempts: ${deploymentAttempts}`}
                    </div>
                  </>
                ) : (
                  <>
                    Account Abstraction only works with embedded wallets.
                    Please:
                    <ol className='list-decimal list-inside mt-2 space-y-1 text-sm'>
                      <li>
                        Disconnect your current wallet
                        {walletStatus.walletType
                          ? ` (${walletStatus.walletType})`
                          : ""}
                      </li>
                      <li>
                        Login with Email or SMS to create an embedded wallet
                      </li>
                      <li>Smart wallet will be automatically created</li>
                    </ol>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          {walletStatus.hasSmartWallet && (
            <Alert>
              <CheckCircle className='h-4 w-4' />
              <AlertDescription>
                <strong>Smart Wallet Ready</strong>
                <br />
                Your wallet supports Account Abstraction. Ready to create
                delegation for automated workflows.
                <div className='mt-1 text-xs text-muted-foreground'>
                  Smart Wallet: {walletStatus.address?.substring(0, 10)}...
                  {deploymentAttempts > 0 &&
                    ` | Previous attempts: ${deploymentAttempts}`}
                </div>
                {deploymentAttempts > 2 && (
                  <div className='mt-2 p-2 bg-yellow-50 rounded text-sm'>
                    💡 <strong>Tip:</strong> If you continue having issues, try
                    sending a small transaction (0.001 SEI) from your wallet to
                    trigger deployment, then refresh this page.
                    <Button
                      variant='ghost'
                      size='sm'
                      className='ml-2'
                      onClick={() => {
                        navigator.clipboard.writeText(
                          walletStatus.address || ""
                        );
                        toast({
                          title: "Address Copied!",
                          description:
                            "Smart wallet address copied to clipboard",
                        });
                      }}>
                      📋 Copy Address
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue='basic' className='w-full'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='basic'>Basic Settings</TabsTrigger>
              <TabsTrigger value='security'>Security</TabsTrigger>
              <TabsTrigger value='operations'>Operations</TabsTrigger>
            </TabsList>

            <TabsContent value='basic' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4' />
                    Blockchain Networks
                  </CardTitle>
                  <CardDescription>
                    Configure spending limits for each network
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {authData.supportedChains &&
                  authData.supportedChains.length > 0 ? (
                    authData.supportedChains.map((chain) => {
                      const chainInfo =
                        SUPPORTED_CHAINS[
                          chain as keyof typeof SUPPORTED_CHAINS
                        ];
                      const config = chainConfigs[chain];

                      // Skip rendering if config is not available
                      if (!config) {
                        return null;
                      }

                      return (
                        <div
                          key={chain}
                          className={`border rounded-lg p-4 space-y-3 ${
                            config.enabled ? "bg-card" : "bg-muted/50"
                          }`}>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                              <Switch
                                checked={config.enabled}
                                onCheckedChange={() =>
                                  toggleChainEnabled(chain)
                                }
                                aria-label={`Enable ${chainInfo?.name || chain}`}
                              />
                              <div>
                                <div className='font-medium'>
                                  {chainInfo?.name || chain}
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {chain}
                                </div>
                              </div>
                            </div>
                            <Badge variant='outline'>
                              {chainInfo?.symbol || "TOKEN"}
                            </Badge>
                          </div>

                          {config.enabled && (
                            <div className='grid grid-cols-2 gap-3'>
                              <div>
                                <Label className='text-xs'>
                                  Max Daily Spending ({chainInfo?.symbol})
                                </Label>
                                <Input
                                  type='number'
                                  value={config.spending}
                                  onChange={(e) =>
                                    updateChainSpending(chain, e.target.value)
                                  }
                                  min='0'
                                  step='0.001'
                                  className='text-sm'
                                  aria-label={`Max daily spending for ${chainInfo?.name}`}
                                />
                              </div>
                              <div>
                                <Label className='text-xs'>
                                  Estimated Usage
                                </Label>
                                <div className='text-sm font-medium text-muted-foreground p-2 bg-muted rounded'>
                                  {authData.estimatedSpending[chain] || "0"}{" "}
                                  {chainInfo?.symbol}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <p>No blockchain operations detected in this workflow.</p>
                      <p className='text-sm'>
                        Add blockchain blocks or AI agents with blockchain tools
                        to configure authorization.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Clock className='h-4 w-4' />
                    Session Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='1'>1 Hour</SelectItem>
                      <SelectItem value='6'>6 Hours</SelectItem>
                      <SelectItem value='24'>24 Hours (Recommended)</SelectItem>
                      <SelectItem value='168'>7 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-xs text-muted-foreground mt-2'>
                    Session will automatically expire after this duration.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='security' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Security Level</CardTitle>
                  <CardDescription>
                    Choose the security level for your session key
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <Select
                    value={securityLevel}
                    onValueChange={(value) =>
                      setSecurityLevel(value as SecurityLevel)
                    }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SecurityLevel.BASIC}>
                        <div className='flex items-center gap-2'>
                          <Shield className='h-4 w-4' />
                          Basic - Standard protection
                        </div>
                      </SelectItem>
                      <SelectItem value={SecurityLevel.ENHANCED}>
                        <div className='flex items-center gap-2'>
                          <Shield className='h-4 w-4 text-orange-500' />
                          Enhanced - Additional monitoring
                        </div>
                      </SelectItem>
                      <SelectItem value={SecurityLevel.MAXIMUM}>
                        <div className='flex items-center gap-2'>
                          <Shield className='h-4 w-4 text-red-500' />
                          Maximum - Highest security
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className='flex items-center space-x-2'>
                    <Switch
                      id='require-confirmation'
                      checked={requireConfirmation}
                      onCheckedChange={setRequireConfirmation}
                    />
                    <Label htmlFor='require-confirmation'>
                      Require confirmation for large transactions
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <AlertTriangle className='h-4 w-4' />
                    Spending Alerts
                  </CardTitle>
                  <CardDescription>
                    Get notified when spending thresholds are reached
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {spendingAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className='flex items-center gap-3 p-3 border rounded'>
                      <div className='flex-1'>
                        <div className='text-sm font-medium'>
                          {alert.threshold}% of daily limit
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          via {alert.method}
                        </div>
                      </div>
                      <Badge variant='outline'>{alert.method}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='operations' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Operations Summary</CardTitle>
                  <CardDescription>
                    Review the blockchain operations that will be authorized
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    {authData.blockchainNodes.map(({ node }, i) => (
                      <div
                        key={i}
                        className='flex items-center gap-3 p-3 border rounded'>
                        <div className='w-3 h-3 bg-primary rounded-full'></div>
                        <div className='flex-1'>
                          <div className='font-medium'>
                            {node.data?.label || `Block ${i + 1}`}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {node.data?.blockType || "Unknown operation"}
                          </div>
                        </div>
                        <Badge variant='outline'>
                          {node.data?.blockType === "AI_AGENT"
                            ? "AI Agent"
                            : "Blockchain"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className='flex gap-2 pt-4 border-t'>
            <Button variant='outline' onClick={handleClose} className='flex-1'>
              Cancel
            </Button>
            <Button
              onClick={handleAuthorize}
              className='flex-1'
              disabled={
                isCreatingDelegation ||
                isRetryingDeployment ||
                !canCreateDelegation
              }>
              {isCreatingDelegation || isRetryingDeployment ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                  {isRetryingDeployment
                    ? `Retrying Setup (${deploymentAttempts})...`
                    : "Creating Smart Wallet..."}
                </>
              ) : !walletStatus.hasSmartWallet ? (
                walletStatus.isEmbedded ? (
                  deploymentAttempts > 0 ? (
                    "Try Setup Again"
                  ) : (
                    "Smart Wallet Not Available"
                  )
                ) : (
                  "Embedded Wallet Required"
                )
              ) : deploymentAttempts > 0 ? (
                "Create Delegation (Retry)"
              ) : (
                "Create Smart Wallet & Execute"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Error Dialog */}
      <Dialog open={errorDialog.show} onOpenChange={closeErrorDialog}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
              {errorDialog.error?.message || "Smart Wallet Setup Required"}
            </DialogTitle>
          </DialogHeader>

          {errorDialog.error && (
            <div className='space-y-4'>
              <p className='text-sm text-muted-foreground'>
                {errorDialog.error.userGuidance}
              </p>

              <div className='space-y-3'>
                <h4 className='font-medium text-sm'>Solutions:</h4>
                {errorDialog.error.type === "DEPLOYMENT_FAILED" ? (
                  <ol className='list-decimal list-inside text-sm space-y-2 text-muted-foreground'>
                    <li>
                      Close this dialog and retry - deployment may work on
                      second attempt
                    </li>
                    <li>Wait 30-60 seconds if this was a timeout error</li>
                    <li>
                      Send any small transaction (even 0.001 SEI) from your
                      current wallet
                    </li>
                    <li>Wait for transaction confirmation</li>
                    <li>Try creating the delegation again</li>
                  </ol>
                ) : (
                  <ol className='list-decimal list-inside text-sm space-y-2 text-muted-foreground'>
                    <li>
                      Send any small transaction (even 0.001 SEI) from your
                      current wallet
                    </li>
                    <li>Refresh the page and try the workflow again</li>
                    <li>Check that your wallet is properly connected</li>
                  </ol>
                )}
              </div>

              <Alert>
                <AlertTriangle className='h-4 w-4' />
                <AlertDescription className='text-xs'>
                  <strong>Technical details:</strong>{" "}
                  {errorDialog.error.technicalDetails}
                </AlertDescription>
              </Alert>

              <div className='flex gap-3 pt-4'>
                <Button
                  variant='outline'
                  onClick={closeErrorDialog}
                  className='flex-1'>
                  Close
                </Button>
                <Button
                  variant='outline'
                  onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
                {errorDialog.error.canRetry && (
                  <Button
                    onClick={() => {
                      closeErrorDialog();
                      retrySmartWalletDeployment();
                    }}
                    disabled={isRetryingDeployment}>
                    {isRetryingDeployment ? "Retrying..." : "Try Again"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

/**
 * Hook for detecting blockchain operations in workflow nodes
 */
export function useBlockchainDetection(nodes: UnifiedWorkflowNode[]) {
  // Safety check for empty or undefined nodes
  if (!nodes || nodes.length === 0) {
    return {
      hasBlockchainOperations: false,
      blockchainNodes: [],
      supportedChains: [],
      estimatedSpending: {},
    };
  }

  const authData = detectBlockchainOperations(nodes);
  return {
    hasBlockchainOperations: authData.blockchainNodes.length > 0,
    ...authData,
  };
}
