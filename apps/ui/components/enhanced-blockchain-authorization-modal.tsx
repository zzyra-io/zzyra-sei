"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useSmartWalletDelegation } from "@/hooks/use-smart-wallet-delegation";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import {
  SUPPORTED_CHAINS,
  SecureBlockchainAuthConfig,
  SecurityLevel,
  UnifiedWorkflowNode,
} from "@zzyra/types";
import { AlertTriangle, Check, CheckCircle, Clock, Shield } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
    // If the tool has a chainId in its config, use that
    if (tool.config?.chainId) {
      chains.add(tool.config.chainId as string);
    } else {
      // Fallback to description-based detection
      if (tool.description?.toLowerCase().includes("sei")) {
        chains.add("1328");
      } else if (tool.description?.toLowerCase().includes("base")) {
        chains.add("base-sepolia");
      } else if (tool.description?.toLowerCase().includes("ethereum")) {
        chains.add("ethereum-sepolia");
      } else {
        chains.add("1328"); // Default to SEI
      }
    }
  });

  return Array.from(chains);
}

// Memoize default spending values
const DEFAULT_SPENDING_BY_CHAIN = {
  "1328": "1.0",
  "base-sepolia": "0.01",
  "ethereum-sepolia": "0.001",
} as const;

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
        const defaultValue =
          DEFAULT_SPENDING_BY_CHAIN[
            chain as keyof typeof DEFAULT_SPENDING_BY_CHAIN
          ];
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
  const { createDelegation, isCreating, getWalletStatus } =
    useSmartWalletDelegation();

  // Add error boundary state
  const [hasError, setHasError] = useState(false);

  // Reset error state when modal opens
  useEffect(() => {
    if (open) {
      setHasError(false);
    }
  }, [open]);

  // Detect blockchain operations - memoize to prevent infinite re-renders
  const authData = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return {
        blockchainNodes: [],
        supportedChains: [],
        estimatedSpending: {},
      };
    }
    try {
      return detectBlockchainOperations(nodes);
    } catch (error) {
      console.error("Error detecting blockchain operations in modal:", error);
      setHasError(true);
      return {
        blockchainNodes: [],
        supportedChains: [],
        estimatedSpending: {},
      };
    }
  }, [nodes]);

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

  // Enhanced configuration state
  const [recurringSchedule, setRecurringSchedule] = useState({
    enabled: false,
    type: "weekly" as "daily" | "weekly" | "monthly",
    dayOfWeek: 5, // Friday
    time: "10:00",
  });

  const [gasPaymentMethod, setGasPaymentMethod] = useState<
    "sponsor" | "native" | "erc20"
  >("sponsor");
  const [selectedGasToken, setSelectedGasToken] = useState("usdc");

  // State for each supported chain - with proper null safety
  const [chainConfigs, setChainConfigs] = useState<
    Record<string, { spending: string; enabled: boolean }>
  >({});

  const [duration, setDuration] = useState("24");

  // Deployment status state
  const [deploymentStatus, setDeploymentStatus] = useState<{
    isDeploying: boolean;
    message: string;
    deploymentHash?: string;
  }>({ isDeploying: false, message: "" });

  // Error dialog state
  const [errorDialog, setErrorDialog] = useState<{
    show: boolean;
    error?: {
      message: string;
      userGuidance: string;
      technicalDetails: string;
      canRetry: boolean;
      type?: string;
    };
  }>({ show: false });

  // Get wallet status for better error handling
  const walletStatus = getWalletStatus();

  // Use ref to prevent unnecessary effect runs
  const hasInitialized = useRef(false);

  // Initialize chainConfigs when modal opens and authData changes
  useEffect(() => {
    if (open && authData && !hasInitialized.current) {
      const supportedChains = authData.supportedChains || [];
      const estimatedSpending = authData.estimatedSpending || {};

      if (supportedChains.length > 0) {
        const newConfigs: Record<
          string,
          { spending: string; enabled: boolean }
        > = {};

        supportedChains.forEach((chain) => {
          newConfigs[chain] = {
            spending: estimatedSpending[chain] || "1.0",
            enabled: true,
          };
        });

        setChainConfigs(newConfigs);
        hasInitialized.current = true;
      }
    }
  }, [open, authData]);

  const handleClose = () => {
    // Reset all state when closing to prevent issues
    hasInitialized.current = false;
    setChainConfigs({});
    setSecurityLevel(SecurityLevel.BASIC);
    setRequireConfirmation(false);
    setDeploymentStatus({ isDeploying: false, message: "" });
    onCancel();
  };

  // Reset state when modal is closed
  useEffect(() => {
    if (!open) {
      hasInitialized.current = false;
      setChainConfigs({});
    }
  }, [open]);

  const closeErrorDialog = () => {
    setErrorDialog({ show: false });
  };

  const handleAuthorize = async () => {
    // Get wallet status for all checks
    const walletStatus = getWalletStatus();

    // Pre-flight wallet status check
    if (!walletStatus.hasSmartWallet) {
      toast({
        title: "Wallet Required",
        description:
          "Please connect your wallet and complete login to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedChains = authData.supportedChains
        .filter((chain) => chainConfigs[chain]?.enabled)
        .map((chain) => {
          console.log("chain", chain);
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
      console.log("🔍 Authentication state check:", {
        isLoggedIn,
        hasCurrentUser: !!currentUser,
        currentUser,
        walletStatus,
      });

      if (!isLoggedIn || !currentUser) {
        throw new Error("Dynamic wallet not connected");
      }
      console.log("selectedChains", selectedChains);

      // Get the first selected chain (we know it exists due to the length check above)
      const primaryChain = selectedChains[0];
      if (!primaryChain) {
        throw new Error("No primary chain selected");
      }

      console.log("primaryChain", primaryChain);
      // Create delegation for the primary chain (simplified approach)

      const delegationParams = {
        operations: ["eth_transfer", "erc20_transfer", "contract_interaction"],
        maxAmountPerTx: primaryChain.maxDailySpending,
        maxDailyAmount: primaryChain.maxDailySpending,
        validUntil: new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000),
        chainId: primaryChain.chainId,
        securityLevel: securityLevel,
        // Enhanced configuration
        recurringSchedule: recurringSchedule.enabled
          ? {
              type: recurringSchedule.type,
              dayOfWeek:
                recurringSchedule.type === "weekly"
                  ? recurringSchedule.dayOfWeek
                  : undefined,
              time: recurringSchedule.time,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : undefined,
        gasPayment: {
          method: gasPaymentMethod,
          erc20Token:
            gasPaymentMethod === "erc20"
              ? {
                  address:
                    selectedGasToken === "usdc"
                      ? "0xA0b86a33E6416d5c77Da8e5F4fB9ab7b4C78A6C4" // USDC address (example)
                      : selectedGasToken === "usdt"
                        ? "0xdAC17F958D2ee523a2206206994597C13D831ec7" // USDT address (example)
                        : "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI address (example)
                  symbol: selectedGasToken.toUpperCase(),
                  decimals:
                    selectedGasToken === "usdc" || selectedGasToken === "usdt"
                      ? 6
                      : 18,
                }
              : undefined,
        },
      };

      // Use regular method for all wallets
      setDeploymentStatus({
        isDeploying: true,
        message: "Creating smart wallet and deploying...",
      });

      const delegationResult = await createDelegation(delegationParams);

      // Handle error response
      if (!delegationResult.success) {
        setDeploymentStatus({ isDeploying: false, message: "" });
        toast({
          title: "Smart Wallet Setup Failed",
          description:
            delegationResult.error ||
            "An unexpected error occurred during smart wallet setup.",
          variant: "destructive",
        });
        return;
      }

      if (!delegationResult.sessionKeyId) {
        setDeploymentStatus({ isDeploying: false, message: "" });
        toast({
          title: "Session Key Creation Failed",
          description: "Failed to create session key for automated execution.",
          variant: "destructive",
        });
        return;
      }

      const sessionKeyId = delegationResult.sessionKeyId;
      const deploymentHash = delegationResult.deploymentHash;

      // Update deployment status
      setDeploymentStatus({
        isDeploying: false,
        message: deploymentHash
          ? "Smart wallet deployed successfully!"
          : "Smart wallet setup complete",
        deploymentHash,
      });

      // Show deployment success message if wallet was deployed
      if (deploymentHash) {
        toast({
          title: "Smart Wallet Deployed",
          description: `Smart wallet deployed successfully! Transaction: ${deploymentHash.substring(0, 10)}...`,
        });
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
        // Store enhanced delegation data
        delegationSignature: JSON.stringify({
          useAA: true,
          provider: "dynamic_labs",
          sessionKeyId: sessionKeyId,
          operations: [
            "eth_transfer",
            "erc20_transfer",
            "conditional_transfer",
          ],
          maxAmountPerTx: primaryChain.maxDailySpending,
          maxDailyAmount: primaryChain.maxDailySpending,
          validUntil: new Date(
            Date.now() + parseInt(duration) * 60 * 60 * 1000
          ).toISOString(),
          authMethod: "wallet",
          deploymentHash: deploymentHash,
          // Enhanced features
          recurringSchedule: recurringSchedule.enabled
            ? {
                type: recurringSchedule.type,
                dayOfWeek:
                  recurringSchedule.type === "weekly"
                    ? recurringSchedule.dayOfWeek
                    : undefined,
                time: recurringSchedule.time,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                example: `Execute every ${
                  recurringSchedule.type === "weekly"
                    ? [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ][recurringSchedule.dayOfWeek]
                    : recurringSchedule.type
                } at ${recurringSchedule.time}`,
              }
            : undefined,
          gasPayment: {
            method: gasPaymentMethod,
            description:
              gasPaymentMethod === "sponsor"
                ? "Zyra sponsors gas fees"
                : gasPaymentMethod === "native"
                  ? "Pay gas with native tokens"
                  : `Pay gas with ${selectedGasToken.toUpperCase()}`,
            erc20Token:
              gasPaymentMethod === "erc20"
                ? {
                    symbol: selectedGasToken.toUpperCase(),
                    decimals:
                      selectedGasToken === "usdc" || selectedGasToken === "usdt"
                        ? 6
                        : 18,
                  }
                : undefined,
          },
          enhancedFeatures: true,
          version: "2.0",
        }),
        sessionKeyId,
      };

      onAuthorize(config);

      const enhancedFeaturesSummary = [
        recurringSchedule.enabled
          ? `Recurring ${recurringSchedule.type} schedule`
          : null,
        gasPaymentMethod === "sponsor"
          ? "Gas-free execution"
          : gasPaymentMethod === "erc20"
            ? `ERC20 gas payments (${selectedGasToken.toUpperCase()})`
            : "Native gas payments",
      ]
        .filter(Boolean)
        .join(", ");

      toast({
        title: "Enhanced Smart Wallet Created",
        description: `Smart wallet delegation created for ${selectedChains.length} chain(s) with ${securityLevel} security level. Features: ${enhancedFeaturesSummary}.${deploymentHash ? " Smart wallet deployed successfully." : ""}`,
      });
    } catch (error) {
      console.error("Authorization error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      toast({
        title: "Authorization Failed",
        description: errorMessage,
        variant: "destructive",
      });
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

  // Safety check: don't render if no blockchain operations detected or if not open
  if (!open) {
    return null;
  }

  // Error state fallback
  if (hasError) {
    return (
      <Dialog open={open} onOpenChange={onCancel}>
        <DialogContent className='sm:max-w-[400px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-3'>
              <AlertTriangle className='h-6 w-6 text-destructive' />
              Configuration Error
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                There was an error analyzing your workflow for blockchain
                operations. Please try refreshing the page or contact support if
                the issue persists.
              </AlertDescription>
            </Alert>
            <div className='flex gap-2 pt-4 border-t'>
              <Button variant='outline' onClick={onCancel} className='flex-1'>
                Close
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className='flex-1'>
                Refresh Page
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Don't render if no blockchain operations detected
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
          {/* Wallet Status */}
          {!walletStatus.hasSmartWallet ? (
            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <strong>Wallet Connection Required</strong>
                <br />
                {!walletStatus.connected
                  ? "Please connect your wallet to continue."
                  : "Please complete the login process with Dynamic to enable smart wallet features."}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className='h-4 w-4' />
              <AlertDescription>
                <strong>Wallet Ready</strong>
                <br />
                Connected: {walletStatus.address?.substring(0, 10)}...
                <br />
                Ready to create delegation for automated blockchain operations.
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

              {/* Recurring Schedule Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Clock className='h-4 w-4' />
                    Recurring Schedule
                  </CardTitle>
                  <CardDescription>
                    Configure automatic recurring operations (e.g., &quot;send
                    10 SEI every Friday&quot;)
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex items-center space-x-2'>
                    <Switch
                      id='enable-recurring'
                      checked={recurringSchedule.enabled}
                      onCheckedChange={(enabled) =>
                        setRecurringSchedule((prev) => ({ ...prev, enabled }))
                      }
                    />
                    <Label htmlFor='enable-recurring'>
                      Enable recurring operations
                    </Label>
                  </div>

                  {recurringSchedule.enabled && (
                    <div className='space-y-3 p-4 border rounded-lg bg-muted/50'>
                      <div>
                        <Label className='text-sm'>Schedule Type</Label>
                        <Select
                          value={recurringSchedule.type}
                          onValueChange={(
                            type: "daily" | "weekly" | "monthly"
                          ) =>
                            setRecurringSchedule((prev) => ({ ...prev, type }))
                          }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='daily'>Daily</SelectItem>
                            <SelectItem value='weekly'>Weekly</SelectItem>
                            <SelectItem value='monthly'>Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {recurringSchedule.type === "weekly" && (
                        <div>
                          <Label className='text-sm'>Day of Week</Label>
                          <Select
                            value={recurringSchedule.dayOfWeek.toString()}
                            onValueChange={(day) =>
                              setRecurringSchedule((prev) => ({
                                ...prev,
                                dayOfWeek: parseInt(day),
                              }))
                            }>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='0'>Sunday</SelectItem>
                              <SelectItem value='1'>Monday</SelectItem>
                              <SelectItem value='2'>Tuesday</SelectItem>
                              <SelectItem value='3'>Wednesday</SelectItem>
                              <SelectItem value='4'>Thursday</SelectItem>
                              <SelectItem value='5'>Friday</SelectItem>
                              <SelectItem value='6'>Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label className='text-sm'>Execution Time</Label>
                        <Input
                          type='time'
                          value={recurringSchedule.time}
                          onChange={(e) =>
                            setRecurringSchedule((prev) => ({
                              ...prev,
                              time: e.target.value,
                            }))
                          }
                          className='text-sm'
                        />
                      </div>

                      <Alert>
                        <CheckCircle className='h-4 w-4' />
                        <AlertDescription className='text-sm'>
                          <strong>Example:</strong> With these settings,
                          operations will execute automatically every{" "}
                          {recurringSchedule.type === "weekly" &&
                            [
                              "Sunday",
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                              "Saturday",
                            ][recurringSchedule.dayOfWeek]}{" "}
                          at {recurringSchedule.time}.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gas Payment Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Shield className='h-4 w-4' />
                    Gas Payment Method
                  </CardTitle>
                  <CardDescription>
                    Choose how transaction fees will be paid
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='space-y-3'>
                    <div className='flex items-center space-x-2'>
                      <input
                        type='radio'
                        id='sponsor'
                        name='gasPayment'
                        value='sponsor'
                        checked={gasPaymentMethod === "sponsor"}
                        onChange={() => setGasPaymentMethod("sponsor")}
                      />
                      <Label htmlFor='sponsor' className='flex-1'>
                        <div className='font-medium'>
                          Sponsored (Recommended)
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Zyra pays gas fees - completely free for users
                        </div>
                      </Label>
                    </div>

                    <div className='flex items-center space-x-2'>
                      <input
                        type='radio'
                        id='native'
                        name='gasPayment'
                        value='native'
                        checked={gasPaymentMethod === "native"}
                        onChange={() => setGasPaymentMethod("native")}
                      />
                      <Label htmlFor='native' className='flex-1'>
                        <div className='font-medium'>Native Token</div>
                        <div className='text-xs text-muted-foreground'>
                          Pay gas with SEI/ETH from your wallet
                        </div>
                      </Label>
                    </div>

                    <div className='flex items-center space-x-2'>
                      <input
                        type='radio'
                        id='erc20'
                        name='gasPayment'
                        value='erc20'
                        checked={gasPaymentMethod === "erc20"}
                        onChange={() => setGasPaymentMethod("erc20")}
                      />
                      <Label htmlFor='erc20' className='flex-1'>
                        <div className='font-medium'>ERC20 Tokens</div>
                        <div className='text-xs text-muted-foreground'>
                          Pay gas with stablecoins like USDC
                        </div>
                      </Label>
                    </div>

                    {gasPaymentMethod === "erc20" && (
                      <div className='ml-6 mt-2'>
                        <Label className='text-sm'>Token</Label>
                        <Select
                          value={selectedGasToken}
                          onValueChange={setSelectedGasToken}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='usdc'>USDC</SelectItem>
                            <SelectItem value='usdt'>USDT</SelectItem>
                            <SelectItem value='dai'>DAI</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <Alert>
                    <AlertTriangle className='h-4 w-4' />
                    <AlertDescription className='text-sm'>
                      {gasPaymentMethod === "sponsor" &&
                        "Sponsored gas is ideal for recurring operations as it removes the need to maintain gas balances."}
                      {gasPaymentMethod === "native" &&
                        "Ensure your wallet has sufficient native tokens to cover gas fees for all scheduled operations."}
                      {gasPaymentMethod === "erc20" &&
                        `Ensure your wallet has sufficient ${selectedGasToken.toUpperCase()} balance to cover gas fees.`}
                    </AlertDescription>
                  </Alert>
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

          {/* Deployment Status Display */}
          {deploymentStatus.isDeploying && (
            <Card className='mt-4'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-3'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary'></div>
                  <div className='flex-1'>
                    <div className='text-sm font-medium'>
                      Deploying Smart Wallet
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {deploymentStatus.message}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {deploymentStatus.deploymentHash && !deploymentStatus.isDeploying && (
            <Card className='mt-4 border-green-200 bg-green-50'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-3'>
                  <div className='w-4 h-4 bg-green-500 rounded-full flex items-center justify-center'>
                    <Check className='w-3 h-3 text-white' />
                  </div>
                  <div className='flex-1'>
                    <div className='text-sm font-medium text-green-800'>
                      Smart Wallet Deployed
                    </div>
                    <div className='text-xs text-green-600'>
                      Transaction:{" "}
                      {deploymentStatus.deploymentHash.substring(0, 10)}...
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className='flex gap-2 pt-4 border-t'>
            <Button variant='outline' onClick={handleClose} className='flex-1'>
              Cancel
            </Button>
            <Button
              onClick={handleAuthorize}
              className='flex-1'
              disabled={
                isCreating ||
                !walletStatus.hasSmartWallet ||
                deploymentStatus.isDeploying
              }>
              {isCreating || deploymentStatus.isDeploying ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                  {deploymentStatus.isDeploying
                    ? "Deploying Smart Wallet..."
                    : "Creating Delegation..."}
                </>
              ) : !walletStatus.hasSmartWallet ? (
                "Wallet Required"
              ) : (
                "Create Delegation & Execute"
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
                      handleAuthorize();
                    }}>
                    Try Again
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
 * Uses a stable comparison to prevent excessive re-renders
 */
export function useBlockchainDetection(nodes: UnifiedWorkflowNode[]) {
  return useMemo(() => {
    // Safety check for empty or undefined nodes
    if (!nodes || nodes.length === 0) {
      return {
        hasBlockchainOperations: false,
        blockchainNodes: [],
        supportedChains: [],
        estimatedSpending: {},
      };
    }

    try {
      const authData = detectBlockchainOperations(nodes);
      return {
        hasBlockchainOperations: authData.blockchainNodes.length > 0,
        ...authData,
      };
    } catch (error) {
      console.error("Error detecting blockchain operations:", error);
      return {
        hasBlockchainOperations: false,
        blockchainNodes: [],
        supportedChains: [],
        estimatedSpending: {},
      };
    }
  }, [nodes]);
}
