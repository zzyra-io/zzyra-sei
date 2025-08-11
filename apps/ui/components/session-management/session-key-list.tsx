"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Activity,
} from "lucide-react";
import {
  SessionKeyData,
  SessionKeyStatus,
  SecurityLevel,
  SessionUsageStats,
} from "@zzyra/types";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useSessionKeys, useSessionKeyUsage } from "@/hooks/use-session-keys";

interface SessionKeyListProps {
  refreshKey?: number;
}

export function SessionKeyList({ refreshKey }: SessionKeyListProps) {
  const { toast } = useToast();
  const {
    sessionKeys,
    isLoading: loading,
    revokeSessionKey,
    isRevoking,
    refetch,
  } = useSessionKeys();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (refreshKey) {
      refetch();
    }
  }, [refreshKey, refetch]);

  // Individual session usage hook for selected session
  const { data: selectedUsageStats } = useSessionKeyUsage(
    selectedSessionId || undefined
  );

  const handleRevokeSessionKey = async (sessionKeyId: string) => {
    try {
      await revokeSessionKey(sessionKeyId);
    } catch {
      // Error handling is done in the hook
      console.error("Failed to revoke session key");
    }
  };

  const getStatusIcon = (status: SessionKeyStatus) => {
    switch (status) {
      case SessionKeyStatus.ACTIVE:
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case SessionKeyStatus.EXPIRED:
        return <Clock className='h-4 w-4 text-orange-500' />;
      case SessionKeyStatus.REVOKED:
        return <XCircle className='h-4 w-4 text-red-500' />;
      case SessionKeyStatus.PAUSED:
        return <AlertTriangle className='h-4 w-4 text-yellow-500' />;
      default:
        return <Shield className='h-4 w-4 text-gray-500' />;
    }
  };

  const getSecurityLevelColor = (level: SecurityLevel) => {
    switch (level) {
      case SecurityLevel.BASIC:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case SecurityLevel.ENHANCED:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case SecurityLevel.MAXIMUM:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const calculateUsagePercentage = (
    sessionKey: SessionKeyData,
    stats: SessionUsageStats
  ) => {
    if (!sessionKey.permissions.length) return 0;

    const maxDaily = Math.max(
      ...sessionKey.permissions.map((p) => parseFloat(p.maxDailyAmount))
    );
    const dailyUsed = parseFloat(stats.dailyAmount);

    return Math.min((dailyUsed / maxDaily) * 100, 100);
  };

  if (loading) {
    return (
      <div className='space-y-4'>
        {[1, 2, 3].map((i) => (
          <Card key={i} className='animate-pulse'>
            <CardHeader>
              <div className='h-4 bg-gray-200 rounded w-1/4'></div>
              <div className='h-3 bg-gray-200 rounded w-1/2'></div>
            </CardHeader>
            <CardContent>
              <div className='h-3 bg-gray-200 rounded w-full'></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sessionKeys.length === 0) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center py-12'>
          <Shield className='h-12 w-12 text-gray-400 mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
            No Active Sessions
          </h3>
          <p className='text-gray-500 dark:text-gray-400 text-center max-w-sm'>
            You don't have any active session keys. Create one when executing a
            workflow with blockchain operations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      {sessionKeys.map((sessionKey) => {
        const stats = usageStats[sessionKey.id];
        const usagePercentage = stats
          ? calculateUsagePercentage(sessionKey, stats)
          : 0;
        const isExpired = new Date() > new Date(sessionKey.validUntil);
        const timeUntilExpiry = formatDistanceToNow(
          new Date(sessionKey.validUntil),
          { addSuffix: true }
        );

        return (
          <Card key={sessionKey.id} className='relative'>
            <CardHeader className='pb-3'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  {getStatusIcon(sessionKey.status)}
                  <div>
                    <CardTitle className='text-base'>
                      {sessionKey.chainId.charAt(0).toUpperCase() +
                        sessionKey.chainId.slice(1)}{" "}
                      Session
                    </CardTitle>
                    <CardDescription className='flex items-center gap-2 mt-1'>
                      <span>
                        Created{" "}
                        {formatDistanceToNow(new Date(sessionKey.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      <Badge
                        variant='outline'
                        className={getSecurityLevelColor(
                          sessionKey.securityLevel
                        )}>
                        {sessionKey.securityLevel}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      // TODO: Open session details modal
                      console.log("View session details:", sessionKey.id);
                    }}>
                    <Eye className='h-4 w-4' />
                  </Button>
                  {sessionKey.status === SessionKeyStatus.ACTIVE && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleRevokeSessionKey(sessionKey.id)}
                      disabled={isRevoking}
                      className='text-red-600 hover:text-red-700'>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className='space-y-4'>
              {/* Status and Expiry */}
              <div className='flex items-center justify-between text-sm'>
                <div className='flex items-center gap-2'>
                  <Badge
                    variant={
                      sessionKey.status === SessionKeyStatus.ACTIVE
                        ? "default"
                        : "secondary"
                    }>
                    {sessionKey.status}
                  </Badge>
                  {sessionKey.status === SessionKeyStatus.ACTIVE && (
                    <span className='text-muted-foreground'>
                      {isExpired ? "Expired" : `Expires ${timeUntilExpiry}`}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-1 text-muted-foreground'>
                  <Activity className='h-3 w-3' />
                  <span>{stats?.totalTransactions || 0} transactions</span>
                </div>
              </div>

              {/* Usage Progress */}
              {stats && (
                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Daily Usage</span>
                    <span className='font-medium'>
                      {stats.dailyAmount} /{" "}
                      {sessionKey.permissions[0]?.maxDailyAmount || "0"} tokens
                    </span>
                  </div>
                  <Progress value={usagePercentage} className='h-2' />
                  {usagePercentage > 80 && (
                    <div className='flex items-center gap-1 text-xs text-orange-600'>
                      <AlertTriangle className='h-3 w-3' />
                      <span>Approaching daily limit</span>
                    </div>
                  )}
                </div>
              )}

              {/* Permissions Summary */}
              <div className='space-y-2'>
                <div className='text-sm font-medium'>Permissions</div>
                <div className='flex flex-wrap gap-1'>
                  {sessionKey.permissions.map((permission, index) => (
                    <Badge key={index} variant='outline' className='text-xs'>
                      {permission.operation}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Wallet Address */}
              <div className='text-xs text-muted-foreground'>
                <span className='font-medium'>Wallet:</span>{" "}
                <code className='bg-muted px-1 py-0.5 rounded'>
                  {sessionKey.walletAddress.slice(0, 6)}...
                  {sessionKey.walletAddress.slice(-4)}
                </code>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
