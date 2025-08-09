"use client";

import { useState } from "react";
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
} from "@zyra/types";
import { useToast } from "@/components/ui/use-toast";
import { useDynamicAuth } from "@/lib/hooks/use-dynamic-auth";
import { useAccountAbstraction } from "@/hooks/use-account-abstraction";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BlockchainNode {
  node: any;
  chains: string[];
  tools: any[];
}

interface BlockchainAuthData {
  blockchainNodes: BlockchainNode[];
  supportedChains: string[];
  estimatedSpending: Record<string, string>;
}

interface EnhancedBlockchainAuthorizationModalProps {
  nodes: any[];
  onAuthorize: (config: SecureBlockchainAuthConfig) => void;
  onCancel: () => void;
}

/**
 * Detect blockchain operations in workflow nodes
 */
function detectBlockchainOperations(nodes: any[]): BlockchainAuthData {
  const blockchainNodes: BlockchainNode[] = [];
  const supportedChains = new Set<string>();

  nodes.forEach((node) => {
    // AI_AGENT blocks with blockchain tools
    if (node.data?.blockType === "AI_AGENT") {
      const blockchainTools = node.data?.config?.selectedTools?.filter(
        (tool: any) =>
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
    if (
      node.data?.blockType === "AI_BLOCKCHAIN" ||
      node.data?.blockType === "SEND_TRANSACTION" ||
      node.data?.blockType === "CHECK_BALANCE" ||
      node.data?.blockType === "SWAP_TOKENS" ||
      node.data?.blockType === "CREATE_WALLET"
    ) {
      const chain = (node.data?.config?.chainId as string) || "sei-testnet";
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

function detectChainsFromTools(tools: any[]): string[] {
  const chains = new Set<string>();

  tools.forEach((tool) => {
    if (tool.description?.toLowerCase().includes("sei")) {
      chains.add("sei-testnet");
    } else if (tool.description?.toLowerCase().includes("base")) {
      chains.add("base-sepolia");
    } else if (tool.description?.toLowerCase().includes("ethereum")) {
      chains.add("ethereum-sepolia");
    } else {
      chains.add("sei-testnet"); // Default to SEI
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
        const additional = parseFloat(node.data.config.maxSpendPerTrade);
        spending[chain] = (current + additional).toString();
      } else {
        const defaults = {
          "sei-testnet": "1.0",
          "base-sepolia": "0.01",
          "ethereum-sepolia": "0.001",
        };
        spending[chain] = defaults[chain as keyof typeof defaults] || "1.0";
      }
    });
  });

  return spending;
}

export function EnhancedBlockchainAuthorizationModal({
  nodes,
  onAuthorize,
  onCancel,
}: EnhancedBlockchainAuthorizationModalProps) {
  const { toast } = useToast();
  const { isLoggedIn, getCurrentUser } = useDynamicAuth();
  const { createSmartWalletDelegation, isCreatingDelegation, getWalletStatus } =
    useAccountAbstraction();
  const [open, setOpen] = useState(true);

  // Detect blockchain operations
  const authData = detectBlockchainOperations(nodes);

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

  // State for each supported chain
  const [chainConfigs, setChainConfigs] = useState(() => {
    const configs: Record<string, { spending: string; enabled: boolean }> = {};
    authData.supportedChains.forEach((chain) => {
      configs[chain] = {
        spending: authData.estimatedSpending[chain] || "1.0",
        enabled: true,
      };
    });
    return configs;
  });

  const [duration, setDuration] = useState("24");

  // Get wallet status for better error handling
  const walletStatus = getWalletStatus();
  const canCreateDelegation = isLoggedIn && walletStatus.hasSmartWallet;

  const handleClose = () => {
    setOpen(false);
    onCancel();
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
        .filter((chain) => chainConfigs[chain].enabled)
        .map((chain) => ({
          chainId: chain,
          chainName:
            SUPPORTED_CHAINS[chain as keyof typeof SUPPORTED_CHAINS]?.name ||
            chain,
          maxDailySpending: chainConfigs[chain].spending,
          allowedOperations: ["send", "swap", "stake"],
          tokenSymbol:
            SUPPORTED_CHAINS[chain as keyof typeof SUPPORTED_CHAINS]?.symbol ||
            "TOKEN",
          enabled: true,
        }));

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

      // Create Smart Wallet (AA) delegation - Single production path
      const delegationResult = await createSmartWalletDelegation({
        chainId: selectedChains[0].chainId,
        operations: ["eth_transfer", "erc20_transfer"],
        maxAmountPerTx: selectedChains[0].maxDailySpending,
        maxDailyAmount: selectedChains[0].maxDailySpending,
        duration: parseInt(duration),
      });

      // Create AA authorization config
      const config: SecureBlockchainAuthConfig = {
        selectedChains,
        duration: parseInt(duration),
        timestamp: Date.now(),
        securityLevel,
        requireConfirmation,
        emergencyContacts,
        spendingAlerts,
        // Store AA data in delegation signature as JSON
        delegationSignature: JSON.stringify({
          useAA: true,
          provider: "zerodev",
          smartWalletAddress: delegationResult.smartWalletAddress,
          signature: delegationResult.delegationSignature,
          expiresAt: new Date(
            Date.now() + parseInt(duration) * 60 * 60 * 1000
          ).toISOString(),
        }),
      };

      setOpen(false);
      onAuthorize(config);

      toast({
        title: "Smart Wallet Created",
        description: `AA delegation created for ${selectedChains.length} chain(s) with ${securityLevel} security level.`,
      });
    } catch (error) {
      console.error("Authorization error:", error);
      toast({
        title: "Authorization Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create smart wallet delegation.",
        variant: "destructive",
      });
    }
  };

  const updateChainSpending = (chain: string, spending: string) => {
    setChainConfigs((prev) => ({
      ...prev,
      [chain]: { ...prev[chain], spending },
    }));
  };

  const toggleChainEnabled = (chain: string) => {
    setChainConfigs((prev) => ({
      ...prev,
      [chain]: { ...prev[chain], enabled: !prev[chain].enabled },
    }));
  };

  if (!authData.blockchainNodes.length) {
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
                      <li>Smart wallets not enabled in Dynamic dashboard</li>
                      <li>ZeroDev configuration issue</li>
                      <li>Smart wallet still being created (try refreshing)</li>
                    </ul>
                    <div className='mt-2 text-xs text-muted-foreground'>
                      Current wallet: {walletStatus.walletType} | Status:{" "}
                      {walletStatus.message}
                    </div>
                  </>
                ) : (
                  <>
                    Account Abstraction only works with embedded wallets.
                    Please:
                    <ol className='list-decimal list-inside mt-2 space-y-1 text-sm'>
                      <li>
                        Disconnect your current wallet (
                        {walletStatus.walletType})
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
                </div>
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
                  {authData.supportedChains.map((chain) => {
                    const chainInfo =
                      SUPPORTED_CHAINS[chain as keyof typeof SUPPORTED_CHAINS];
                    const config = chainConfigs[chain];

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
                              onCheckedChange={() => toggleChainEnabled(chain)}
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
                              <Label className='text-xs'>Estimated Usage</Label>
                              <div className='text-sm font-medium text-muted-foreground p-2 bg-muted rounded'>
                                {authData.estimatedSpending[chain] || "0"}{" "}
                                {chainInfo?.symbol}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                            {node.data?.label ||
                              node.data?.name ||
                              `Block ${i + 1}`}
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
              disabled={isCreatingDelegation || !canCreateDelegation}>
              {isCreatingDelegation ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                  Creating Smart Wallet...
                </>
              ) : !walletStatus.hasSmartWallet ? (
                walletStatus.isEmbedded ? (
                  "Smart Wallet Not Available"
                ) : (
                  "Embedded Wallet Required"
                )
              ) : (
                "Create Smart Wallet & Execute"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for detecting blockchain operations in workflow nodes
 */
export function useBlockchainDetection(nodes: any[]) {
  const authData = detectBlockchainOperations(nodes);
  return {
    hasBlockchainOperations: authData.blockchainNodes.length > 0,
    ...authData,
  };
}
