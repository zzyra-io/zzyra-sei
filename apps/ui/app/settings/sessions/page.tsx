"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Activity,
  AlertTriangle,
  Info,
  RefreshCw,
  Settings,
} from "lucide-react";
import { SessionKeyList } from "@/components/session-management/session-key-list";
import { useAuth } from "@/lib/hooks/use-auth";

export default function SessionsPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!user) {
    return (
      <div className='container mx-auto p-6'>
        <Card>
          <CardContent className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <Shield className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-semibold mb-2'>
                Authentication Required
              </h3>
              <p className='text-gray-500'>
                Please log in to view your session keys.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Session Management</h1>
          <p className='text-muted-foreground'>
            Manage your blockchain session keys and security settings
          </p>
        </div>
        <Button onClick={handleRefresh} variant='outline' size='sm'>
          <RefreshCw className='h-4 w-4 mr-2' />
          Refresh
        </Button>
      </div>

      {/* Security Notice */}
      <Card className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'>
        <CardContent className='flex items-start gap-3 pt-6'>
          <Info className='h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5' />
          <div className='space-y-1'>
            <h3 className='font-medium text-blue-900 dark:text-blue-100'>
              Secure Session Keys
            </h3>
            <p className='text-sm text-blue-700 dark:text-blue-200'>
              Session keys enable secure, time-limited blockchain operations
              without exposing your private keys. They automatically expire and
              can be revoked at any time.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue='active' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='active' className='flex items-center gap-2'>
            <Activity className='h-4 w-4' />
            Active Sessions
          </TabsTrigger>
          <TabsTrigger value='security' className='flex items-center gap-2'>
            <Shield className='h-4 w-4' />
            Security Settings
          </TabsTrigger>
          <TabsTrigger value='history' className='flex items-center gap-2'>
            <Settings className='h-4 w-4' />
            Session History
          </TabsTrigger>
        </TabsList>

        <TabsContent value='active' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Activity className='h-5 w-5' />
                Active Session Keys
              </CardTitle>
              <CardDescription>
                Currently active session keys that can execute blockchain
                operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionKeyList key={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='security' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Shield className='h-5 w-5' />
                  Security Levels
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between p-3 border rounded'>
                    <div>
                      <div className='font-medium'>Basic</div>
                      <div className='text-sm text-muted-foreground'>
                        Standard protection with spending limits
                      </div>
                    </div>
                    <Badge variant='outline'>Default</Badge>
                  </div>

                  <div className='flex items-center justify-between p-3 border rounded'>
                    <div>
                      <div className='font-medium'>Enhanced</div>
                      <div className='text-sm text-muted-foreground'>
                        Additional monitoring and alerts
                      </div>
                    </div>
                    <Badge
                      variant='outline'
                      className='bg-orange-100 text-orange-800'>
                      Recommended
                    </Badge>
                  </div>

                  <div className='flex items-center justify-between p-3 border rounded'>
                    <div>
                      <div className='font-medium'>Maximum</div>
                      <div className='text-sm text-muted-foreground'>
                        Highest security with multi-factor checks
                      </div>
                    </div>
                    <Badge
                      variant='outline'
                      className='bg-red-100 text-red-800'>
                      High Security
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <AlertTriangle className='h-5 w-5' />
                  Security Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3 text-sm'>
                  <div className='flex items-start gap-2'>
                    <div className='w-2 h-2 bg-primary rounded-full mt-2'></div>
                    <div>
                      <div className='font-medium'>Use short durations</div>
                      <div className='text-muted-foreground'>
                        Limit session keys to 24 hours or less when possible
                      </div>
                    </div>
                  </div>

                  <div className='flex items-start gap-2'>
                    <div className='w-2 h-2 bg-primary rounded-full mt-2'></div>
                    <div>
                      <div className='font-medium'>Set spending limits</div>
                      <div className='text-muted-foreground'>
                        Only authorize the minimum amount needed
                      </div>
                    </div>
                  </div>

                  <div className='flex items-start gap-2'>
                    <div className='w-2 h-2 bg-primary rounded-full mt-2'></div>
                    <div>
                      <div className='font-medium'>Monitor regularly</div>
                      <div className='text-muted-foreground'>
                        Check your active sessions and revoke unused ones
                      </div>
                    </div>
                  </div>

                  <div className='flex items-start gap-2'>
                    <div className='w-2 h-2 bg-primary rounded-full mt-2'></div>
                    <div>
                      <div className='font-medium'>Revoke when done</div>
                      <div className='text-muted-foreground'>
                        Manually revoke sessions when workflows complete
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='history' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
              <CardDescription>
                View past session keys and their activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-center py-12 text-muted-foreground'>
                <Settings className='h-12 w-12 mx-auto mb-4 opacity-50' />
                <p>Session history feature coming soon</p>
                <p className='text-sm'>
                  This will show expired and revoked sessions with their
                  transaction history
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
