"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { teamService } from "@/lib/services/team-service"
import type { Team } from "@/lib/services/team-service"
import { Users, PlusCircle, ArrowRight } from "lucide-react"

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamSlug, setNewTeamSlug] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const fetchTeams = async () => {
    setIsLoading(true)
    try {
      const data = await teamService.getUserTeams()
      setTeams(data)
    } catch (error) {
      console.error("Error fetching teams:", error)
      toast({
        title: "Error fetching teams",
        description: "Failed to load your teams. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [toast])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      const team = await teamService.createTeam({
        name: newTeamName,
        slug: newTeamSlug || undefined,
      })
      setTeams([team, ...teams])
      setNewTeamName("")
      setNewTeamSlug("")
      setCreateDialogOpen(false)
      toast({
        title: "Team created",
        description: `Team "${team.name}" has been created successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error creating team",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleTeamClick = (teamId: string) => {
    router.push(`/teams/${teamId}`)
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateTeam}>
                    <DialogHeader>
                      <DialogTitle>Create a new team</DialogTitle>
                      <DialogDescription>Create a team to collaborate on workflows with other users.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Team Name</Label>
                        <Input
                          id="name"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="My Awesome Team"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="slug">
                          Team Slug <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                          id="slug"
                          value={newTeamSlug}
                          onChange={(e) => setNewTeamSlug(e.target.value)}
                          placeholder="my-awesome-team"
                        />
                        <p className="text-xs text-muted-foreground">
                          Used in URLs. Leave blank to generate automatically.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isCreating || !newTeamName}>
                        {isCreating ? "Creating..." : "Create Team"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-md" />
                ))}
              </div>
            ) : teams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <Card
                    key={team.id}
                    className="cursor-pointer transition-all hover:shadow-md"
                    onClick={() => handleTeamClick(team.id)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url || "/placeholder.svg"}
                            alt={team.name}
                            className="mr-2 h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <Users className="mr-2 h-5 w-5 text-primary" />
                        )}
                        {team.name}
                      </CardTitle>
                      <CardDescription>@{team.slug}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Created on {new Date(team.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto">
                        View Team <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No teams found"
                description="You haven't created or joined any teams yet. Teams allow you to collaborate on workflows with other users."
                action={
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Your First Team
                  </Button>
                }
              />
            )}
          </div>
        </main>
      </div>
    </AuthGate>
  )
}
