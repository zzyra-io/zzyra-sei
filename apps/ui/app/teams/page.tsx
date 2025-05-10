import { Suspense } from "react"
import { getTeams } from "@/app/actions/team-actions"
import { TeamCard } from "@/components/team-card"
import { CreateTeamForm } from "@/components/create-team-form"
import { Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

async function TeamsList() {
  const { teams, error } = await getTeams()

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-destructive">Error loading teams: {error}</p>
      </div>
    )
  }

  if (!teams.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Users className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No teams yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">Create your first team to start collaborating with others.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          id={team.id}
          name={team.name}
          description={team.description}
          memberCount={1} // This would need to be calculated from team_members
          role={team.role}
          createdAt={team.created_at}
        />
      ))}
    </div>
  )
}

export default function TeamsPage() {
  return (
    <div className="container py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Manage your teams and collaborations</p>
        </div>
      </div>

      <Tabs defaultValue="my-teams">
        <TabsList className="mb-8">
          <TabsTrigger value="my-teams">My Teams</TabsTrigger>
          <TabsTrigger value="create">Create Team</TabsTrigger>
        </TabsList>
        <TabsContent value="my-teams">
          <Suspense fallback={<div className="text-center p-8">Loading teams...</div>}>
            <TeamsList />
          </Suspense>
        </TabsContent>
        <TabsContent value="create">
          <div className="max-w-2xl mx-auto">
            <CreateTeamForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
