import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function getTeamAndCheckPermission(teamId: string) {
  // // Get current user
  // const {
  //   data: { user },
  // } = await supabase.auth.getUser()
  // if (!user) {
  //   redirect("/login")
  // }

  // // Get team details
  // const { data: team, error: teamError } = await supabase.from("teams").select("*").eq("id", teamId).single()

  // if (teamError) {
  //   return { team: null, isOwner: false, error: teamError.message }
  // }

  // // Check if user is owner
  // const { data: membership, error: membershipError } = await supabase
  //   .from("team_members")
  //   .select("role")
  //   .eq("team_id", teamId)
  //   .eq("user_id", user.id)
  //   .single()

  // if (membershipError || !membership) {
  //   return { team, isOwner: false, error: "You don't have permission to access this team" }
  // }

  // const isOwner = membership.role === "owner"

  return { team: null, isOwner: false, error: null };
}

export default async function TeamSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const { team, isOwner, error } = await getTeamAndCheckPermission(params.id);

  if (error || !team) {
    notFound();
  }

  if (!isOwner) {
    redirect(`/teams/${params.id}`);
  }

  async function updateTeam(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) {
      return { error: "Team name is required" };
    }

    // const { error } = await supabase.from("teams").update({ name, description }).eq("id", params.id)

    // if (error) {
    //   return { error: error.message }
    // }

    redirect(`/teams/${params.id}`);
  }

  return (
    <div className='container py-10'>
      <div className='mb-8'>
        <Link
          href={`/teams/${params.id}`}
          className='inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4'>
          <ArrowLeft className='mr-1 h-4 w-4' />
          Back to Team
        </Link>

        <h1 className='text-3xl font-bold'>Team Settings</h1>
        <p className='text-muted-foreground'>Manage settings for {team.name}</p>
      </div>

      <div className='grid gap-8 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
            <CardDescription>
              Update your team's basic information
            </CardDescription>
          </CardHeader>
          <form action={updateTeam}>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <label htmlFor='name' className='text-sm font-medium'>
                  Team Name <span className='text-destructive'>*</span>
                </label>
                <Input
                  id='name'
                  name='name'
                  defaultValue={team.name}
                  required
                />
              </div>
              <div className='space-y-2'>
                <label htmlFor='description' className='text-sm font-medium'>
                  Description
                </label>
                <Textarea
                  id='description'
                  name='description'
                  defaultValue={team.description || ""}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type='submit'>Save Changes</Button>
            </CardFooter>
          </form>
        </Card>

        <Card className='border-destructive/50'>
          <CardHeader>
            <CardTitle className='text-destructive'>Danger Zone</CardTitle>
            <CardDescription>
              Actions here cannot be undone. Be careful.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground mb-4'>
              Deleting this team will remove all associated data, including
              workflows and custom blocks. All team members will lose access.
            </p>
            <form
              action={async () => {
                "use server";
                // await deleteTeam(params.id);
                redirect("/teams");
              }}>
              <Button type='submit' variant='destructive' className='w-full'>
                <Trash2 className='mr-2 h-4 w-4' />
                Delete Team
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
