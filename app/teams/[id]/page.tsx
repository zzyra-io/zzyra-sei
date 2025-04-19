"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmptyState } from "@/components/empty-state"
import { WorkflowCard } from "@/components/workflow-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { teamService } from "@/lib/services/team-service"
import type { TeamWithMembers, TeamRole } from "@/lib/services/team-service"
import { workflowService } from "@/lib/services/workflow-service"
import type { WorkflowSummary } from "@/lib/supabase/schema"
import { PlusCircle, MoreVertical, Users, Settings, Trash2, UserPlus, Mail } from "lucide-react"

export default function TeamDetailPage() {
  const params = useParams()
  const teamId = params.id as string
  const router = useRouter()
  const { toast } = useToast()

  const [team, setTeam] = useState<TeamWithMembers | null>(null)
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamRole>("member")
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("workflows")

  const fetchTeamData = async () => {
    setIsLoading(true)
    try {
      const teamData = await teamService.getTeam(teamId)
      setTeam(teamData)

      const workflowsData = await teamService.getTeamWorkflows(teamId)
      setWorkflows(workflowsData)
    } catch (error) {
      console.error("Error fetching team data:", error)
      toast({
        title: "Error fetching team data",
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
      fetchTeamData()
    }
  }, [teamId, toast, router])

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsInviting(true)
    try {
      await teamService.inviteTeamMember(teamId, {
        email: inviteEmail,
        role: inviteRole,
      })
      setInviteEmail("")
      setInviteRole("member")
      setInviteDialogOpen(false)
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${inviteEmail}.`,
      })
      fetchTeamData() // Refresh team data
    } catch (error) {
      toast({
        title: "Error inviting member",
        description: error instanceof Error ? error.message : "Failed to invite team member. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, role: TeamRole) => {
    try {
      await teamService.updateTeamMemberRole(memberId, role)
      toast({
        title: "Role updated",
        description: "Team member role has been updated successfully.",
      })
      fetchTeamData() // Refresh team data
    } catch (error) {
      toast({
        title: "Error updating role",
        description: "Failed to update team member role. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await teamService.removeTeamMember(memberId)
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      })
      fetchTeamData() // Refresh team data
    } catch (error) {
      toast({
        title: "Error removing member",
        description: "Failed to remove team member. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTeam = async () => {
    if (confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      try {
        await teamService.deleteTeam(teamId)
        toast({
          title: "Team deleted",
          description: "The team has been deleted successfully.",
        })
        router.push("/teams")
      } catch (error) {
        toast({
          title: "Error deleting team",
          description: "Failed to delete team. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleCreateWorkflow = () => {
    router.push(`/builder?team=${teamId}`)
  }

  const isOwner = team?.members.some((member) => member.role === "owner" && member.user_id === team.members[0]?.user_id)

  const isAdminOrOwner = team?.members.some(
    (member) => ["admin", "owner"].includes(member.role) && member.user_id === team.members[0]?.user_id,
  )

  if (isLoading) {
    return (
      <AuthGate>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <Skeleton className="h-10 w-1/3 mb-6" />
              <div className="grid gap-6">
                <Skeleton className="h-48 rounded-md" />
                <Skeleton className="h-64 rounded-md" />
              </div>
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
            <div className="mx-auto max-w-7xl">
              <EmptyState
                title="Team not found"
                description="The team you're looking for doesn't exist or you don't have access to it."
                action={<Button onClick={() => router.push("/teams")}>Back to Teams</Button>}
              />
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
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
                <span className="ml-2 text-sm text-muted-foreground">@{team.slug}</span>
              </div>
              <div className="flex gap-2">
                {isAdminOrOwner && (
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleInviteMember}>
                        <DialogHeader>
                          <DialogTitle>Invite team member</DialogTitle>
                          <DialogDescription>Invite a new member to join your team.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="colleague@example.com"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamRole)}>
                              <SelectTrigger id="role">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Members can view and edit workflows. Admins can also manage team members. Owners have full
                              control.
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={isInviting || !inviteEmail}>
                            {isInviting ? "Sending..." : "Send Invitation"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Team Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveTab("members")}>
                      <Users className="mr-2 h-4 w-4" />
                      View Members
                    </DropdownMenuItem>
                    {isAdminOrOwner && (
                      <DropdownMenuItem onClick={() => router.push(`/teams/${teamId}/settings`)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Team Settings
                      </DropdownMenuItem>
                    )}
                    {isOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDeleteTeam} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Team
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Tabs defaultValue="workflows" value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="workflows">Workflows</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>
            </Tabs>

            <TabsContent value="workflows" className="mt-0">
              <div className="mb-4 flex justify-end">
                <Button onClick={handleCreateWorkflow}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Workflow
                </Button>
              </div>

              {workflows.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {workflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      viewMode="grid"
                      onFavoriteToggle={async (isFavorite) => {
                        try {
                          await workflowService.updateWorkflow(workflow.id, { is_favorite: isFavorite })
                          setWorkflows(
                            workflows.map((w) => (w.id === workflow.id ? { ...w, is_favorite: isFavorite } : w)),
                          )
                        } catch (error) {
                          toast({
                            title: "Error updating workflow",
                            description: "Failed to update favorite status. Please try again.",
                            variant: "destructive",
                          })
                        }
                      }}
                      onDelete={async () => {
                        try {
                          await workflowService.deleteWorkflow(workflow.id)
                          setWorkflows(workflows.filter((w) => w.id !== workflow.id))
                          toast({
                            title: "Workflow deleted",
                            description: "Workflow has been deleted successfully.",
                          })
                        } catch (error) {
                          toast({
                            title: "Error deleting workflow",
                            description: "Failed to delete workflow. Please try again.",
                            variant: "destructive",
                          })
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No workflows found"
                  description="This team doesn't have any workflows yet. Create your first workflow to get started."
                  action={
                    <Button onClick={handleCreateWorkflow}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Workflow
                    </Button>
                  }
                />
              )}
            </TabsContent>

            <TabsContent value="members" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage members of your team and their roles.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {team.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url || "/placeholder.svg"}
                                alt={member.full_name || member.email || "User"}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <Users className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{member.full_name || "Unnamed User"}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                          <div className="ml-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </div>
                        </div>
                        {isAdminOrOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  window.location.href = `mailto:${member.email}`
                                }}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </DropdownMenuItem>
                              {isOwner && member.role !== "owner" && (
                                <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "owner")}>
                                  Make Owner
                                </DropdownMenuItem>
                              )}
                              {isAdminOrOwner && member.role !== "admin" && member.role !== "owner" && (
                                <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "admin")}>
                                  Make Admin
                                </DropdownMenuItem>
                              )}
                              {isAdminOrOwner && member.role !== "member" && (
                                <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "member")}>
                                  Make Member
                                </DropdownMenuItem>
                              )}
                              {isAdminOrOwner && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove Member
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}
