"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { AuthGate } from "@/components/auth-gate";
import { DashboardHeader } from "@/components/dashboard-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/auth-provider";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  CreditCard,
  Loader2,
  Moon,
  Palette,
  User,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";

export default function SettingsPage() {
  const { supabase, session } = useSupabase();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [telegramHandle, setTelegramHandle] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<
    string | null
  >(null);
  const [monthlyExecutionQuota, setMonthlyExecutionQuota] = useState(0);
  const [monthlyExecutionsUsed, setMonthlyExecutionsUsed] = useState(0);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email || "");

      // Fetch usage data
      const fetchUsage = async () => {
        setUsageLoading(true);
        try {
          // Get the monthly executions from the profile data
          const { data, error } = await supabase
            .from("profiles")
            .select("monthly_executions_used")
            .eq("id", session.user.id)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setMonthlyExecutionsUsed(data.monthly_executions_used || 0);
          }
        } catch (error) {
          console.error("Error fetching usage data:", error);
          toast({
            title: "Error",
            description: "Failed to load usage data",
            variant: "destructive",
          });
        } finally {
          setUsageLoading(false);
        }
      };

      // Fetch user profile
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();
          console.log("Profile data:", data);
          if (error) throw error;
          // If no profile exists, create one
          if (!data) {
            await supabase.from("profiles").insert({
              id: session.user.id,
              full_name: name,
              email_notifications: emailNotifications,
              telegram_handle: telegramHandle,
              discord_webhook: discordWebhook,
              dark_mode: darkMode,
              updated_at: new Date().toISOString(),
            });
            return; // defaults already set
          }

          if (data) {
            setName(data.full_name || "");
            setEmailNotifications(data.email_notifications !== false);
            setTelegramHandle(data.telegram_handle || "");
            setDiscordWebhook(data.discord_webhook || "");
            setSubscriptionTier(data.subscription_tier || "free");
            setSubscriptionStatus(data.subscription_status || "");
            setSubscriptionExpiresAt(data.subscription_expires_at);
            setMonthlyExecutionQuota(data.monthly_execution_quota || 0);
            setMonthlyExecutionsUsed(data.monthly_executions_used || 0);
            setDarkMode(data.dark_mode !== false);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      };

      fetchProfile();
      fetchUsage();
    }
  }, [
    session,
    supabase,
    darkMode,
    discordWebhook,
    emailNotifications,
    name,
    telegramHandle,
    toast,
  ]);

  useEffect(() => {
    if (session?.user) {
      setUsageLoading(true);
      fetch("/api/usage")
        .then((res) => res.json())
        .then(({ monthly_execution_quota, monthly_executions_used }) => {
          setMonthlyExecutionQuota(monthly_execution_quota);
          setMonthlyExecutionsUsed(monthly_executions_used);
        })
        .catch(console.error)
        .finally(() => setUsageLoading(false));
    }
  }, [session]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", darkMode ? "dark" : "light");
    }
  }, [darkMode]);

  const handleSaveProfile = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: session?.user.id,
        full_name: name,
        email_notifications: emailNotifications,
        telegram_handle: telegramHandle,
        discord_webhook: discordWebhook,
        dark_mode: darkMode,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionBadgeColor = () => {
    if (subscriptionTier === "premium")
      return "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0";
    if (subscriptionTier === "pro")
      return "bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0";
    return "bg-muted";
  };

  const getUsagePercentage = () => {
    if (monthlyExecutionQuota === 0) return 0;
    return (monthlyExecutionsUsed / monthlyExecutionQuota) * 100;
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage > 90) return "bg-red-500";
    if (percentage > 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <AuthGate>
      <div className='flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100 '>
        <DashboardHeader />
        <main className='flex-1 px-4 py-8 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-5xl space-y-8'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
              <div className='space-y-1'>
                <h1 className='text-3xl font-bold tracking-tight'>Settings</h1>
                <p className='text-muted-foreground'>
                  Manage your account settings and preferences.
                </p>
              </div>
              <div className='flex items-center space-x-2'>
                <Badge className={`px-3 py-1 ${getSubscriptionBadgeColor()}`}>
                  {subscriptionTier.charAt(0).toUpperCase() +
                    subscriptionTier.slice(1)}
                </Badge>
                {subscriptionTier !== "premium" && (
                  <Button
                    onClick={() => router.push("/billing")}
                    variant='outline'
                    size='sm'
                    className='group'>
                    <CreditCard className='mr-2 h-4 w-4' />
                    Upgrade
                    <ChevronRight className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-1' />
                  </Button>
                )}
              </div>
            </div>

            <Tabs defaultValue='profile' className='space-y-6'>
              <div className='sticky top-0 z-10 bg-gradient-to-b from-slate-50 to-slate-50/95 dark:from-slate-950 dark:to-slate-950/95 pt-2 pb-4'>
                <TabsList className='grid w-full grid-cols-3 max-w-md mx-auto'>
                  <TabsTrigger
                    value='profile'
                    className='flex items-center gap-2'>
                    <User className='h-4 w-4' />
                    <span className='hidden sm:inline'>Profile</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value='appearance'
                    className='flex items-center gap-2'>
                    <Palette className='h-4 w-4' />
                    <span className='hidden sm:inline'>Appearance</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value='notifications'
                    className='flex items-center gap-2'>
                    <Bell className='h-4 w-4' />
                    <span className='hidden sm:inline'>Notifications</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value='profile' className='space-y-6'>
                <div className='grid gap-6 md:grid-cols-3'>
                  <Card className='overflow-hidden border-none shadow-md md:col-span-2'>
                    <CardHeader className='bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800'>
                      <div className='flex items-center gap-2'>
                        <User className='h-5 w-5 text-slate-600 dark:text-slate-400' />
                        <CardTitle>Personal Information</CardTitle>
                      </div>
                      <CardDescription>
                        Update your personal details and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='p-6'>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveProfile();
                        }}
                        className='space-y-5'>
                        <div className='grid gap-5 sm:grid-cols-2'>
                          <div className='space-y-2'>
                            <Label
                              htmlFor='name'
                              className='text-sm font-medium'>
                              Full Name
                            </Label>
                            <Input
                              id='name'
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder='Your name'
                              className='transition-all focus-visible:ring-offset-2'
                            />
                          </div>
                          <div className='space-y-2'>
                            <Label
                              htmlFor='email'
                              className='text-sm font-medium'>
                              Email
                            </Label>
                            <Input
                              id='email'
                              type='email'
                              value={email}
                              disabled
                              className='bg-muted/50'
                            />
                            <p className='text-xs text-muted-foreground'>
                              Your email address is managed through your
                              authentication provider.
                            </p>
                          </div>
                        </div>

                        <div className='grid gap-5 sm:grid-cols-2'>
                          <div className='space-y-2'>
                            <Label
                              htmlFor='telegram'
                              className='text-sm font-medium'>
                              Telegram Handle
                            </Label>
                            <Input
                              id='telegram'
                              value={telegramHandle}
                              onChange={(e) =>
                                setTelegramHandle(e.target.value)
                              }
                              placeholder='@yourhandle'
                              className='transition-all focus-visible:ring-offset-2'
                            />
                          </div>
                          <div className='space-y-2'>
                            <Label
                              htmlFor='discord'
                              className='text-sm font-medium'>
                              Discord Webhook
                            </Label>
                            <Input
                              id='discord'
                              value={discordWebhook}
                              onChange={(e) =>
                                setDiscordWebhook(e.target.value)
                              }
                              placeholder='https://discord.com/api/...'
                              className='transition-all focus-visible:ring-offset-2'
                            />
                          </div>
                        </div>
                      </form>
                    </CardContent>
                    <Separator />
                    <CardFooter className='flex justify-between p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
                      <Button
                        type='submit'
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                        className='relative overflow-hidden group'>
                        {isLoading ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Saving...
                          </>
                        ) : (
                          <>
                            <span className='relative z-10'>Save Changes</span>
                            <span className='absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md'></span>
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className='overflow-hidden border-none shadow-md h-fit'>
                    <CardHeader className='bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800'>
                      <div className='flex items-center gap-2'>
                        <Zap className='h-5 w-5 text-slate-600 dark:text-slate-400' />
                        <CardTitle>Subscription</CardTitle>
                      </div>
                      <CardDescription>
                        Your current plan details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='p-6 space-y-4'>
                      <div className='flex items-center justify-between'>
                        <h3 className='text-sm font-medium'>Current Plan</h3>
                        <Badge
                          className={`px-3 py-1 ${getSubscriptionBadgeColor()}`}>
                          {subscriptionTier.charAt(0).toUpperCase() +
                            subscriptionTier.slice(1)}
                        </Badge>
                      </div>

                      <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <span className='text-sm font-medium capitalize'>
                            Status
                          </span>
                          <span className='text-sm'>{subscriptionStatus}</span>
                        </div>

                        {subscriptionExpiresAt && (
                          <div className='flex items-center justify-between'>
                            <span className='text-sm font-medium'>Expires</span>
                            <span className='text-sm'>
                              {new Date(
                                subscriptionExpiresAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {subscriptionTier !== "premium" && (
                        <div className='mt-4 pt-4 border-t'>
                          <Button
                            onClick={() => router.push("/billing")}
                            variant='default'
                            size='sm'
                            className='bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0'>
                            <CreditCard className='mr-2 h-4 w-4' />
                            Upgrade Plan
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className='overflow-hidden border-none shadow-md'>
                  <CardHeader className='bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800'>
                    <div className='flex items-center gap-2'>
                      <Zap className='h-5 w-5 text-slate-600 dark:text-slate-400' />
                      <CardTitle>Usage Statistics</CardTitle>
                    </div>
                    <CardDescription>
                      Monitor your resource consumption
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='p-6 space-y-6'>
                    <div className='space-y-4'>
                      <h3 className='text-sm font-medium'>
                        Monthly Executions
                      </h3>
                      {usageLoading ? (
                        <div className='flex items-center justify-center h-12'>
                          <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                        </div>
                      ) : (
                        <div className='space-y-3'>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm'>
                              {monthlyExecutionsUsed} of {monthlyExecutionQuota}{" "}
                              executions
                            </span>
                            <span className='text-sm font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800'>
                              {Math.round(getUsagePercentage())}%
                            </span>
                          </div>
                          <div className='h-3 w-full bg-muted rounded-full overflow-hidden'>
                            <div
                              className={`h-full ${getUsageColor()} transition-all duration-500 ease-in-out`}
                              style={{ width: `${getUsagePercentage()}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {subscriptionTier !== "premium" && (
                      <div className='rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-4 border border-violet-100 dark:border-violet-900'>
                        <div className='flex items-start gap-3'>
                          <BadgeCheck className='h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0' />
                          <div className='space-y-2'>
                            <h4 className='font-medium'>Upgrade to Premium</h4>
                            <p className='text-sm text-muted-foreground'>
                              Get higher quotas, priority support, and exclusive
                              features.
                            </p>
                            <Button
                              onClick={() => router.push("/billing")}
                              variant='default'
                              size='sm'
                              className='bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0'>
                              <CreditCard className='mr-2 h-4 w-4' />
                              Upgrade Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='appearance' className='space-y-6'>
                <Card className='overflow-hidden border-none shadow-md'>
                  <CardHeader className='bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800'>
                    <div className='flex items-center gap-2'>
                      <Moon className='h-5 w-5 text-slate-600 dark:text-slate-400' />
                      <CardTitle>Theme Preferences</CardTitle>
                    </div>
                    <CardDescription>
                      Customize the appearance of your dashboard
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='p-6'>
                    <div className='space-y-6'>
                      <div className='flex items-center justify-between'>
                        <div className='space-y-1'>
                          <Label
                            htmlFor='dark-mode'
                            className='text-base font-medium'>
                            Dark Mode
                          </Label>
                          <p className='text-sm text-muted-foreground'>
                            Enable dark mode for a better viewing experience in
                            low light.
                          </p>
                        </div>
                        <Switch
                          id='dark-mode'
                          checked={darkMode}
                          onCheckedChange={setDarkMode}
                          className='data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-emerald-500'
                        />
                      </div>
                    </div>
                  </CardContent>
                  <Separator />
                  <CardFooter className='flex justify-between p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className='relative overflow-hidden group'>
                      {isLoading ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className='relative z-10'>
                            Save Preferences
                          </span>
                          <span className='absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md'></span>
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value='notifications' className='space-y-6'>
                <Card className='overflow-hidden border-none shadow-md'>
                  <CardContent className='p-6'>
                    <NotificationPreferencesForm />
                    {/* <div className='space-y-6'>
                      <div className='flex items-center justify-between'>
                        <div className='space-y-1'>
                          <Label
                            htmlFor='email-notifications'
                            className='text-base font-medium'>
                            Email Notifications
                          </Label>
                          <p className='text-sm text-muted-foreground'>
                            Receive email notifications for workflow executions
                            and alerts.
                          </p>
                        </div>
                        <Switch
                          id='email-notifications'
                          checked={emailNotifications}
                          onCheckedChange={setEmailNotifications}
                          className='data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-emerald-500'
                        />
                      </div>
                    </div> */}
                  </CardContent>
                  <Separator />
                  {/* <CardFooter className='flex justify-between p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className='relative overflow-hidden group'>
                      {isLoading ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className='relative z-10'>
                            Save Preferences
                          </span>
                          <span className='absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md'></span>
                        </>
                      )}
                    </Button>
                  </CardFooter> */}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
