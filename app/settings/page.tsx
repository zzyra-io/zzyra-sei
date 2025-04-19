"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useSupabase } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

export default function SettingsPage() {
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email || "")

      // Fetch user profile
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

          if (data) {
            setName(data.full_name || "")
            setEmailNotifications(data.email_notifications !== false)
          }
        } catch (error) {
          console.error("Error fetching profile:", error)
        }
      }

      fetchProfile()
    }
  }, [session, supabase])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: session?.user.id,
        full_name: name,
        email_notifications: emailNotifications,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">Manage your account settings and preferences.</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={email} disabled className="bg-muted/50" />
                      <p className="text-xs text-muted-foreground">
                        Your email address is managed through your authentication provider.
                      </p>
                    </div>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-4">
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="dark-mode">Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable dark mode for a better viewing experience in low light.
                        </p>
                      </div>
                      <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4">
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive email notifications for workflow executions and alerts.
                        </p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Preferences"
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}
