"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { teamService } from "@/lib/services/team-service"
import type { Team } from "@/lib/services/team-service"
import { Loader2 } from "lucide-react"

export default function TeamSettingsPage() {
  const params = useParams()
  const teamId = params.id as string
  const router = useRouter()
  const { toast } = useToast()

  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [logoUrl, setLogoUrl] = useState("")

  const fetchTeam = async () => {
    setIsLoading(true)
    try {
      const teamData = await teamService.getTeam(teamId)
      setTeam(teamData)
      setName(teamData.name)
      setSlug(teamData.slug)
      setLogoUrl(teamData.logo_url || "")
    } catch (error) {
      console.error("Error fetching team:", error)
      toast({
        title: "Error fetching team",
        description: "Failed to load team information. Please try again.",
        variant: "destructive",
      })
      router.push("/teams")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (teamId) {
      fetchTeam()
    }
  }, [teamId, toast, router])

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const updatedTeam = await teamService.updateTeam(teamId, {
        name,
        slug,
        logo_url: logoUrl || null,
      })
      setTeam(updatedTeam)
      toast({
        title: "Team updated",
        description: "Team settings have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error updating team",
        description: "Failed to update team settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AuthGate>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <Skeleton className="h-10 w-1/3 mb-6" />
              <Skeleton className="h-64 rounded-md" />
            </div>
          </main>
        </div>
      </AuthGate>
    )
  }

  if (!team) {
    return (
      <AuthGate>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Team not found</h2>
                <p className="mt-2 text-muted-foreground">
                  The team you're looking for doesn't exist or you don't have access to it.
                </p>
                <Button className="mt-4" onClick={() => router.push("/teams")}>
                  Back to Teams
                </Button>
              </div>
            </div>
          </main>
        </div>
      </AuthGate>
    )
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Team Settings</h1>
              <p className="text-muted-foreground">Manage your team settings and preferences.</p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="danger">Danger Zone</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <Card>
                  <form onSubmit={handleSaveGeneral}>
                    <CardHeader>
                      <CardTitle>General Information</CardTitle>
                      <CardDescription>Update your team's basic information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Team Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="My Team"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">Team Slug</Label>
                        <Input
                          id="slug"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          placeholder="my-team"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Used in URLs. Only lowercase letters, numbers, and hyphens.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="logo">Logo URL</Label>
                        <Input
                          id="logo"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo.png"
                        />
                        <p className="text-xs text-muted-foreground">
                          URL to your team's logo image. Leave blank to use the default icon.
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>

              <TabsContent value="danger" className="space-y-4">
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                      Actions here can't be undone. Be careful when making changes in this section.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-md border border-destructive/50 p-4">
                      <h3 className="font-medium">Delete Team</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Permanently delete this team and all of its data. This action cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        className="mt-4"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
                            teamService
                              .deleteTeam(teamId)
                              .then(() => {
                                toast({
                                  title: "Team deleted",
                                  description: "The team has been deleted successfully.",
                                })
                                router.push("/teams")
                              })
                              .catch((error) => {
                                toast({
                                  title: "Error deleting team",
                                  description: "Failed to delete team. Please try again.",
                                  variant: "destructive",
                                })
                              })
                          }
                        }}
                      >
                        Delete Team
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}
