"use client";
import React, { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  Mail,
  MessageSquare,
  Send,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  XCircle,
  AlertCircle,
  BarChart,
  Info,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Define types for notification tables until proper database types are generated
interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  telegram_enabled: boolean;
  discord_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  email?: string;
  telegram_chat_id?: string;
  discord_webhook_url?: string;
}

// Define a type for Supabase table names to avoid 'any' usage
type SupabaseTable = string;

// Define types for notification data
interface NotificationPreferenceData {
  user_id: string;
  notification_type: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  telegram_enabled: boolean;
  discord_enabled: boolean;
  updated_at?: string;
}

// List of all supported notification types
const NOTIFICATION_TYPES = [
  "workflow_started",
  "workflow_completed",
  "workflow_failed",
  "node_error",
  "quota_alert",
  "system_alert",
];

export function NotificationPreferencesForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<
    Record<string, NotificationPreference>
  >({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("preferences");

  useEffect(() => {
    fetchPreferences();
  }, []);

  // Ensure all notification types are present in state with sensible defaults
  useEffect(() => {
    if (!loading) {
      setPreferences((prev) => {
        const updated = { ...prev };
        NOTIFICATION_TYPES.forEach((type) => {
          if (!updated[type]) {
            updated[type] = {
              id: "", // Will be set when saved
              user_id: profile?.id || "",
              notification_type: type,
              email_enabled: false,
              in_app_enabled: false,
              telegram_enabled: false,
              discord_enabled: false,
              created_at: "",
              updated_at: "",
            };
          }
        });
        return updated;
      });
    }
  }, [loading, profile]);

  useEffect(() => {
    if (profile) {
      setTelegramChatId(profile.telegram_chat_id || "");
      setDiscordWebhookUrl(profile.discord_webhook_url || "");
    }
  }, [profile]);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get user profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to manage notification preferences",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get user profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Get notification preferences
      const { data: preferencesData, error } = await supabase
        .from("notification_preferences" as SupabaseTable)
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      // Safely cast the response data to our expected type
      const typedPreferencesData = (preferencesData ||
        []) as unknown as NotificationPreference[];

      const preferences = typedPreferencesData.reduce((acc, pref) => {
        if (pref && typeof pref === "object" && "notification_type" in pref) {
          acc[pref.notification_type] = pref;
        }
        return acc;
      }, {} as Record<string, NotificationPreference>);

      setPreferences(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveChannelSettings = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to save settings",
          variant: "destructive",
        });
        return;
      }

      // Update profile with channel settings
      const { error } = await supabase
        .from("profiles")
        .update({
          telegram_chat_id: telegramChatId || null,
          discord_webhook_url: discordWebhookUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification channels updated successfully",
      });

      // Refresh preferences
      await fetchPreferences();
    } catch (error) {
      console.error("Error saving channel settings:", error);
      toast({
        title: "Error",
        description: "Failed to save notification channels",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const savePreference = async (
    type: string,
    preference: Partial<NotificationPreference>
  ) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to save preferences",
          variant: "destructive",
        });
        return;
      }

      const currentPref = preferences[type];

      if (currentPref) {
        // Update existing preference
        const { error } = await supabase
          .from("notification_preferences" as SupabaseTable)
          .update({
            email_enabled: preference.email_enabled,
            in_app_enabled: preference.in_app_enabled,
            telegram_enabled: preference.telegram_enabled,
            discord_enabled: preference.discord_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentPref.id);

        if (error) throw error;
      } else {
        // Create new preference
        const { error } = await supabase
          .from("notification_preferences" as SupabaseTable)
          .insert({
            user_id: user.id,
            notification_type: type,
            email_enabled: preference.email_enabled || false,
            in_app_enabled: preference.in_app_enabled || false,
            telegram_enabled: preference.telegram_enabled || false,
            discord_enabled: preference.discord_enabled || false,
          } as NotificationPreferenceData);

        if (error) throw error;
      }

      // Update local state
      setPreferences((prev) => ({
        ...prev,
        [type]: {
          ...(currentPref || {}),
          ...preference,
          notification_type: type,
          user_id: user.id,
        } as NotificationPreference,
      }));

      toast({
        title: "Success",
        description: "Notification preference updated",
      });
    } catch (error) {
      console.error("Error saving preference:", error);
      toast({
        title: "Error",
        description: "Failed to save notification preference",
        variant: "destructive",
      });
    }
  };

  const handleToggleChannel = (
    type: string,
    channel: string,
    enabled: boolean
  ) => {
    const channelKey = `${channel}_enabled` as keyof NotificationPreference;
    savePreference(type, { [channelKey]: enabled });
  };

  const getNotificationTypeLabel = (type: string): string => {
    switch (type) {
      case "workflow_started":
        return "Workflow Started";
      case "workflow_completed":
        return "Workflow Completed";
      case "workflow_failed":
        return "Workflow Failed";
      case "node_error":
        return "Node Error";
      case "quota_alert":
        return "Quota Alert";
      case "system_alert":
        return "System Alerts";
      default:
        return type.replace(/_/g, " ");
    }
  };

  const getNotificationTypeDescription = (type: string): string => {
    switch (type) {
      case "workflow_started":
        return "Notifications when your workflows start execution";
      case "workflow_completed":
        return "Notifications when your workflows complete successfully";
      case "workflow_failed":
        return "Notifications when your workflows fail to execute";
      case "node_error":
        return "Notifications when specific nodes in your workflows encounter errors";
      case "quota_alert":
        return "Notifications when you approach your monthly execution quota limits";
      case "system_alert":
        return "Important system-wide announcements and updates";
      default:
        return "";
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case "workflow_started":
        return <PlayCircle className='h-5 w-5' />;
      case "workflow_completed":
        return <CheckCircle2 className='h-5 w-5' />;
      case "workflow_failed":
        return <XCircle className='h-5 w-5' />;
      case "node_error":
        return <AlertCircle className='h-5 w-5' />;
      case "quota_alert":
        return <BarChart className='h-5 w-5' />;
      case "system_alert":
        return <Info className='h-5 w-5' />;
      default:
        return <Bell className='h-5 w-5' />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className='h-4 w-4 mr-2' />;
      case "in_app":
        return <Bell className='h-4 w-4 mr-2' />;
      case "telegram":
        return <Send className='h-4 w-4 mr-2' />;
      case "discord":
        return <MessageSquare className='h-4 w-4 mr-2' />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-12 min-h-[400px]'>
        <Loader2 className='h-12 w-12 animate-spin text-primary mb-4' />
        <p className='text-lg font-medium text-muted-foreground'>
          Loading your notification preferences...
        </p>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto'>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4'>
          <CardHeader>
            <h1 className='text-2xl font-bold tracking-tight'>
              Notification Settings
            </h1>
          </CardHeader>
          <CardDescription>
            <p className='text-muted-foreground mt-1'>
              Manage how and when you receive notifications
            </p>
          </CardDescription>
          <TabsList className='grid grid-cols-2 w-full sm:w-auto'>
            <TabsTrigger value='preferences' className='px-4 py-2'>
              <Bell className='h-4 w-4 mr-2' />
              Preferences
            </TabsTrigger>
            <TabsTrigger value='channels' className='px-4 py-2'>
              <Send className='h-4 w-4 mr-2' />
              Channels
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='preferences' className='space-y-6 mt-2'>
          <Card className='border-none shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950'>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center text-xl'>
                <Bell className='h-5 w-5 mr-2 text-primary' />
                Notification Summary
              </CardTitle>
              <CardDescription>
                Your current notification settings at a glance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                {["email", "in_app", "telegram", "discord"].map((channel) => {
                  const channelKey =
                    `${channel}_enabled` as keyof NotificationPreference;
                  const enabledCount = Object.values(preferences).filter(
                    (pref) => pref && pref[channelKey]
                  ).length;

                  const isConfigured =
                    channel === "email" ||
                    channel === "in_app" ||
                    (channel === "telegram" && profile?.telegram_chat_id) ||
                    (channel === "discord" && profile?.discord_webhook_url);

                  return (
                    <Card
                      key={channel}
                      className={cn(
                        "border shadow-sm hover:shadow transition-all duration-200",
                        !isConfigured && "opacity-50"
                      )}>
                      <CardContent className='p-4'>
                        <div className='flex flex-col items-center text-center'>
                          <div className='p-3 rounded-full bg-primary/10 mb-3'>
                            {getChannelIcon(channel)}
                          </div>
                          <h3 className='font-medium capitalize'>
                            {channel.replace("_", " ")}
                          </h3>
                          <p className='text-2xl font-bold mt-1'>
                            {enabledCount}
                          </p>
                          <p className='text-xs text-muted-foreground mt-1'>
                            {enabledCount === 1
                              ? "notification"
                              : "notifications"}
                          </p>
                          {!isConfigured && (
                            <Badge
                              variant='outline'
                              className='mt-2 text-xs bg-amber-100 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'>
                              <AlertTriangle className='h-3 w-3 mr-1' />
                              Not configured
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className='space-y-6'>
            {NOTIFICATION_TYPES.map((type) => {
              const pref = preferences[type];
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}>
                  <Card className='overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300'>
                    <CardHeader className='bg-slate-50 dark:bg-slate-900 pb-4'>
                      <div className='flex items-start justify-between'>
                        <div className='flex items-center'>
                          <div className='p-2 rounded-full bg-primary/10 mr-3'>
                            {getNotificationTypeIcon(type)}
                          </div>
                          <div>
                            <CardTitle>
                              {getNotificationTypeLabel(type)}
                            </CardTitle>
                            <CardDescription className='mt-1'>
                              {getNotificationTypeDescription(type)}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className='pt-6'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <TooltipProvider>
                          <div className='flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors'>
                            <div className='flex items-center space-x-3'>
                              <div className='p-2 rounded-full bg-primary/10'>
                                <Mail className='h-4 w-4 text-primary' />
                              </div>
                              <div className='space-y-0.5'>
                                <Label
                                  htmlFor={`${type}-email`}
                                  className='text-base'>
                                  Email
                                </Label>
                                <p className='text-sm text-muted-foreground'>
                                  Receive via email
                                </p>
                              </div>
                            </div>
                            <Switch
                              id={`${type}-email`}
                              checked={pref?.email_enabled ?? true}
                              onCheckedChange={(checked) =>
                                handleToggleChannel(type, "email", checked)
                              }
                              disabled={saving}
                            />
                          </div>

                          <div className='flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors'>
                            <div className='flex items-center space-x-3'>
                              <div className='p-2 rounded-full bg-primary/10'>
                                <Bell className='h-4 w-4 text-primary' />
                              </div>
                              <div className='space-y-0.5'>
                                <Label
                                  htmlFor={`${type}-inapp`}
                                  className='text-base'>
                                  In-App
                                </Label>
                                <p className='text-sm text-muted-foreground'>
                                  Receive within app
                                </p>
                              </div>
                            </div>
                            <Switch
                              id={`${type}-inapp`}
                              checked={pref?.in_app_enabled ?? true}
                              onCheckedChange={(checked) =>
                                handleToggleChannel(type, "in_app", checked)
                              }
                              disabled={saving}
                            />
                          </div>

                          <div className='flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors'>
                            <div className='flex items-center space-x-3'>
                              <div className='p-2 rounded-full bg-primary/10'>
                                <Send className='h-4 w-4 text-primary' />
                              </div>
                              <div className='space-y-0.5'>
                                <Label
                                  htmlFor={`${type}-telegram`}
                                  className='text-base'>
                                  Telegram
                                </Label>
                                <p className='text-sm text-muted-foreground'>
                                  Receive via Telegram
                                </p>
                              </div>
                            </div>
                            <div className='flex items-center'>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Switch
                                      id={`${type}-telegram`}
                                      checked={pref?.telegram_enabled ?? false}
                                      onCheckedChange={(checked) =>
                                        handleToggleChannel(
                                          type,
                                          "telegram",
                                          checked
                                        )
                                      }
                                      disabled={
                                        saving || !profile?.telegram_chat_id
                                      }
                                    />
                                  </div>
                                </TooltipTrigger>
                                {!profile?.telegram_chat_id && (
                                  <TooltipContent side='left'>
                                    <p>
                                      Set up Telegram in the Channels tab first
                                    </p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              {!profile?.telegram_chat_id && (
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='ml-2 h-6 w-6 rounded-full'
                                  onClick={() => setActiveTab("channels")}>
                                  <AlertTriangle className='h-4 w-4 text-amber-500' />
                                  <span className='sr-only'>
                                    Configure Telegram
                                  </span>
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className='flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors'>
                            <div className='flex items-center space-x-3'>
                              <div className='p-2 rounded-full bg-primary/10'>
                                <MessageSquare className='h-4 w-4 text-primary' />
                              </div>
                              <div className='space-y-0.5'>
                                <Label
                                  htmlFor={`${type}-discord`}
                                  className='text-base'>
                                  Discord
                                </Label>
                                <p className='text-sm text-muted-foreground'>
                                  Receive via Discord
                                </p>
                              </div>
                            </div>
                            <div className='flex items-center'>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Switch
                                      id={`${type}-discord`}
                                      checked={pref?.discord_enabled ?? false}
                                      onCheckedChange={(checked) =>
                                        handleToggleChannel(
                                          type,
                                          "discord",
                                          checked
                                        )
                                      }
                                      disabled={
                                        saving || !profile?.discord_webhook_url
                                      }
                                    />
                                  </div>
                                </TooltipTrigger>
                                {!profile?.discord_webhook_url && (
                                  <TooltipContent side='left'>
                                    <p>
                                      Set up Discord in the Channels tab first
                                    </p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              {!profile?.discord_webhook_url && (
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='ml-2 h-6 w-6 rounded-full'
                                  onClick={() => setActiveTab("channels")}>
                                  <AlertTriangle className='h-4 w-4 text-amber-500' />
                                  <span className='sr-only'>
                                    Configure Discord
                                  </span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value='channels' className='mt-2'>
          <Card className='border-none shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950'>
            <CardHeader>
              <CardTitle className='flex items-center text-xl'>
                <Send className='h-5 w-5 mr-2 text-primary' />
                Notification Channels
              </CardTitle>
              <CardDescription>
                Configure your notification channels to receive alerts through
                your preferred methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-6'>
                <div className='p-4 rounded-lg border bg-card'>
                  <div className='flex items-start md:items-center gap-4 mb-4'>
                    <div className='p-3 rounded-full bg-primary/10 shrink-0'>
                      <Mail className='h-5 w-5 text-primary' />
                    </div>
                    <div className='space-y-1 flex-1'>
                      <Label htmlFor='email' className='text-lg font-medium'>
                        Email Address
                      </Label>
                      <div className='flex flex-col md:flex-row md:items-center gap-2'>
                        <Input
                          id='email'
                          type='email'
                          value={profile?.email || ""}
                          disabled={true}
                          className='bg-muted/50'
                          placeholder='Your email is managed in account settings'
                        />
                        <Badge variant='outline' className='w-fit'>
                          Primary
                        </Badge>
                      </div>
                      <p className='text-sm text-muted-foreground mt-2'>
                        To change your email, update it in your account
                        settings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className='p-4 rounded-lg border bg-card'>
                  <div className='flex items-start md:items-center gap-4 mb-4'>
                    <div className='p-3 rounded-full bg-primary/10 shrink-0'>
                      <Send className='h-5 w-5 text-primary' />
                    </div>
                    <div className='space-y-1 flex-1'>
                      <Label htmlFor='telegram' className='text-lg font-medium'>
                        Telegram
                      </Label>
                      <Input
                        id='telegram'
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder='@yourusername'
                        className='mb-2'
                      />
                      <div className='flex items-center text-sm text-muted-foreground gap-1.5'>
                        <Info className='h-4 w-4' />
                        <p>
                          Enter your Telegram username to receive notifications.
                          Make sure to start our bot:{" "}
                          <span className='font-mono bg-muted px-1.5 py-0.5 rounded text-xs'>
                            @zyra_notifications_bot
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='p-4 rounded-lg border bg-card'>
                  <div className='flex items-start md:items-center gap-4 mb-4'>
                    <div className='p-3 rounded-full bg-primary/10 shrink-0'>
                      <MessageSquare className='h-5 w-5 text-primary' />
                    </div>
                    <div className='space-y-1 flex-1'>
                      <Label htmlFor='discord' className='text-lg font-medium'>
                        Discord Webhook
                      </Label>
                      <Input
                        id='discord'
                        value={discordWebhookUrl}
                        onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                        placeholder='https://discord.com/api/webhooks/...'
                        className='mb-2'
                      />
                      <div className='flex items-center text-sm text-muted-foreground gap-1.5'>
                        <Info className='h-4 w-4' />
                        <p>
                          Create a webhook in your Discord server and paste the
                          URL here.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className='flex justify-end pt-4 pb-6'>
              <Button
                onClick={saveChannelSettings}
                disabled={saving}
                className='px-8'>
                {saving ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                ) : (
                  <>Save Channel Settings</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
