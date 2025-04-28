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
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

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

  useEffect(() => {
    fetchPreferences();
  }, []);

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
      const { data: preferencesData, error } = await (supabase
        .from("notification_preferences" as SupabaseTable)
        .select("*")
        .eq("user_id", user.id));

      if (error) {
        throw error;
      }

      // Safely cast the response data to our expected type
      const typedPreferencesData = (preferencesData || []) as unknown as NotificationPreference[];

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
        const { error } = await (supabase
          .from("notification_preferences" as SupabaseTable)
          .update({
            email_enabled: preference.email_enabled,
            in_app_enabled: preference.in_app_enabled,
            telegram_enabled: preference.telegram_enabled,
            discord_enabled: preference.discord_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentPref.id));

        if (error) throw error;
      } else {
        // Create new preference
        const { error } = await (supabase
          .from("notification_preferences" as SupabaseTable)
          .insert({
            user_id: user.id,
            notification_type: type,
            email_enabled: preference.email_enabled || false,
            in_app_enabled: preference.in_app_enabled || false,
            telegram_enabled: preference.telegram_enabled || false,
            discord_enabled: preference.discord_enabled || false,
          } as NotificationPreferenceData));

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

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        Loading notification preferences...
      </div>
    );
  }

  return (
    <Tabs defaultValue="preferences">
      <TabsList className="mb-4">
        <TabsTrigger value="preferences">Notification Preferences</TabsTrigger>
        <TabsTrigger value="channels">Notification Channels</TabsTrigger>
      </TabsList>

      <TabsContent value="preferences">
        <div className="space-y-6">
          {Object.entries(preferences).map(([type, pref]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle>{getNotificationTypeLabel(type)}</CardTitle>
                <CardDescription>
                  {getNotificationTypeDescription(type)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`${type}-email`}>Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
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

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`${type}-inapp`}>In-App</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications within Zyra
                      </p>
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

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`${type}-telegram`}>Telegram</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via Telegram
                      </p>
                    </div>
                    <Switch
                      id={`${type}-telegram`}
                      checked={pref?.telegram_enabled ?? false}
                      onCheckedChange={(checked) =>
                        handleToggleChannel(type, "telegram", checked)
                      }
                      disabled={saving || !profile?.telegram_chat_id}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`${type}-discord`}>Discord</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via Discord webhook
                      </p>
                    </div>
                    <Switch
                      id={`${type}-discord`}
                      checked={pref?.discord_enabled ?? false}
                      onCheckedChange={(checked) =>
                        handleToggleChannel(type, "discord", checked)
                      }
                      disabled={saving || !profile?.discord_webhook_url}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="channels">
        <Card>
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>
              Configure your notification channels to receive alerts through
              your preferred methods.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ""}
                  disabled={true}
                  placeholder="Your email is managed in account settings"
                />
                <p className="text-sm text-muted-foreground">
                  To change your email, update it in your account settings.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram Username</Label>
                <Input
                  id="telegram"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="@yourusername"
                />
                <p className="text-sm text-muted-foreground">
                  Enter your Telegram username to receive notifications via
                  Telegram. Make sure to start our bot: @zyra_notifications_bot
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discord">Discord Webhook URL</Label>
                <Input
                  id="discord"
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <p className="text-sm text-muted-foreground">
                  Create a webhook in your Discord server and paste the URL
                  here.
                </p>
              </div>

              <Button onClick={saveChannelSettings} disabled={saving}>
                Save Channel Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
