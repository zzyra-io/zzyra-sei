"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isZeroDevConnector } from "@dynamic-labs/ethereum-aa";
import { useAccountAbstraction } from "@/hooks/use-account-abstraction";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

export function SmartWalletDebugComponent() {
  const { primaryWallet, user } = useDynamicContext();
  const { getWalletStatus } = useAccountAbstraction();

  const walletStatus = getWalletStatus();

  const debugInfo = {
    user: {
      authenticated: !!user,
      email: user?.email,
      userId: user?.userId,
    },
    wallet: walletStatus,
    environment: {
      dynamicEnvId:
        process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID?.substring(0, 8) + "...",
      zerodevProjectId:
        process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID?.substring(0, 8) + "...",
    },
  };

  const getStatusIcon = (hasSmartWallet: boolean) => {
    if (hasSmartWallet)
      return <CheckCircle className='h-5 w-5 text-green-500' />;
    return <XCircle className='h-5 w-5 text-red-500' />;
  };

  const getRecommendations = () => {
    if (!walletStatus.connected) {
      return (
        <Alert>
          <Info className='h-4 w-4' />
          <AlertDescription>
            <strong>Connect a wallet first</strong>
            <br />
            Click "Connect Wallet" to get started.
          </AlertDescription>
        </Alert>
      );
    }

    if (walletStatus.hasSmartWallet) {
      return (
        <Alert>
          <CheckCircle className='h-4 w-4' />
          <AlertDescription>
            <strong>Smart wallet ready!</strong>
            <br />
            Your wallet supports Account Abstraction. You can create delegations
            for automated workflows.
          </AlertDescription>
        </Alert>
      );
    }

    if (!walletStatus.isEmbedded) {
      return (
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            <strong>External wallet detected</strong>
            <br />
            Smart wallets only work with embedded wallets. Please:
            <ol className='list-decimal list-inside mt-2 space-y-1'>
              <li>Disconnect your current wallet (MetaMask, etc.)</li>
              <li>Login with Email or SMS to create an embedded wallet</li>
              <li>The smart wallet will be automatically created</li>
            </ol>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert>
        <AlertCircle className='h-4 w-4' />
        <AlertDescription>
          <strong>Configuration issue</strong>
          <br />
          You have an embedded wallet but smart wallet is not available. This
          might be due to:
          <ul className='list-disc list-inside mt-2 space-y-1'>
            <li>Smart wallets not enabled in Dynamic dashboard</li>
            <li>ZeroDev configuration issue</li>
            <li>Smart wallet still being created (try refreshing)</li>
          </ul>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {getStatusIcon(walletStatus.hasSmartWallet)}
            Smart Wallet Status
          </CardTitle>
          <CardDescription>
            Diagnostic information for Account Abstraction setup
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Connection Status */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <p className='text-sm font-medium'>Connected</p>
              <Badge variant={walletStatus.connected ? "default" : "secondary"}>
                {walletStatus.connected ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <p className='text-sm font-medium'>Smart Wallet</p>
              <Badge
                variant={
                  walletStatus.hasSmartWallet ? "default" : "destructive"
                }>
                {walletStatus.hasSmartWallet ? "Available" : "Not Available"}
              </Badge>
            </div>
          </div>

          {/* Wallet Details */}
          {walletStatus.connected && (
            <div className='space-y-2'>
              <div>
                <p className='text-sm font-medium'>Wallet Type</p>
                <p className='text-sm text-muted-foreground'>
                  {walletStatus.walletType || "Unknown"}
                </p>
              </div>
              <div>
                <p className='text-sm font-medium'>Is Embedded</p>
                <Badge
                  variant={walletStatus.isEmbedded ? "default" : "secondary"}>
                  {walletStatus.isEmbedded ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <p className='text-sm font-medium'>Address</p>
                <p className='text-xs font-mono text-muted-foreground'>
                  {walletStatus.address || "Not available"}
                </p>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {getRecommendations()}

          {/* Debug Info */}
          <details className='mt-4'>
            <summary className='text-sm font-medium cursor-pointer hover:text-primary'>
              Show Debug Information
            </summary>
            <pre className='mt-2 text-xs bg-muted p-2 rounded overflow-auto'>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
