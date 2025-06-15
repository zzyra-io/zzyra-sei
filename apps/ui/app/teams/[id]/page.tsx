import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Settings, Users } from "lucide-react";

export const dynamic = "force-dynamic";

async function getTeamWithMembers(teamId: string) {
  // Get team details
  // const { data: team, error: teamError } = await supabase.from("teams").select("*").eq("id", teamId).single()

  // if (teamError) {
  //   return { team: null, members: [], error: teamError.message }
  // }

  // Get team members with profile information
  // const { data: members, error: membersError } = await supabase
  //   .from("team_members")
  // .select(`
  //   id, team_id, user_id, role, created_at,
  //   profiles:user_id (full_name, email)
  // `)
  // .eq("team_id", teamId)

  // if (membersError) {
  //   return { team, members: [], error: membersError.message }
  // }

  return { team: null, members: [], error: null };
}

export default async function TeamPage({ params }: { params: { id: string } }) {
  const { team, members, error } = await getTeamWithMembers(params.id);

  if (error || !team) {
    notFound();
  }

  // Check if current user is owner
  // const {
  //   data: { user },
  // } = await supabase.auth.getUser()

  const currentUserMembership = {
    role: "owner",
  };

  return (
    <div className='container py-10'>
      <div className='mb-8'>
        <Link
          href='/teams'
          className='inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4'>
          <ArrowLeft className='mr-1 h-4 w-4' />
          Back to Teams
        </Link>

        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>{team.name}</h1>
            <p className='text-muted-foreground'>
              {team.description || "No description provided"}
            </p>
          </div>

          {currentUserMembership.role === "owner" && (
            <Button variant='outline' asChild>
              <Link href={`/teams/${team.id}/settings`}>
                <Settings className='mr-2 h-4 w-4' />
                Team Settings
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className='grid gap-8 md:grid-cols-3'>
        <div className='md:col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>People with access to this team</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className='text-center text-muted-foreground py-4'>
                  No members found
                </p>
              ) : (
                <div className='space-y-4'>
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div className='h-10 w-10 rounded-full bg-muted flex items-center justify-center'>
                          <Users className='h-5 w-5 text-muted-foreground' />
                        </div>
                        <div>
                          <p className='font-medium'>
                            {member.profiles?.full_name ||
                              member.profiles?.email ||
                              "Unknown User"}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {member.profiles?.email}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm capitalize bg-muted px-2 py-1 rounded-md'>
                          {member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className='space-y-4'>
                <div>
                  <dt className='text-sm font-medium text-muted-foreground'>
                    Created
                  </dt>
                  <dd>{new Date(team.created_at).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className='text-sm font-medium text-muted-foreground'>
                    Members
                  </dt>
                  <dd>{members.length}</dd>
                </div>
                <div>
                  <dt className='text-sm font-medium text-muted-foreground'>
                    Your Role
                  </dt>
                  <dd className='capitalize'>
                    {currentUserMembership?.role || "Unknown"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
