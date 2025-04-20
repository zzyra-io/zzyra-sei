"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createTeam(formData: FormData) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string

  if (!name) {
    return { error: "Team name is required" }
  }

  try {
    // Create the team
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name,
        description,
        created_by: user.id,
      })
      .select()
      .single()

    if (teamError) {
      return { error: teamError.message }
    }

    // Add the creator as an owner
    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "owner",
    })

    if (memberError) {
      // Rollback by deleting the team
      await supabase.from("teams").delete().eq("id", team.id)
      return { error: memberError.message }
    }

    revalidatePath("/teams")
    return { success: true, team }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getTeams() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { teams: [], error: "Not authenticated" }
  }

  try {
    const { data: teamMembers, error: memberError } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", user.id)

    if (memberError) {
      return { teams: [], error: memberError.message }
    }

    if (!teamMembers.length) {
      return { teams: [], error: null }
    }

    const teamIds = teamMembers.map((member) => member.team_id)

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*")
      .in("id", teamIds)
      .order("created_at", { ascending: false })

    if (teamsError) {
      return { teams: [], error: teamsError.message }
    }

    // Combine teams with role information
    const teamsWithRoles = teams.map((team) => {
      const membership = teamMembers.find((member) => member.team_id === team.id)
      return {
        ...team,
        role: membership?.role || "member",
      }
    })

    return { teams: teamsWithRoles, error: null }
  } catch (error: any) {
    return { teams: [], error: error.message }
  }
}

export async function deleteTeam(teamId: string) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    // Check if user is owner
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return { error: "You don't have permission to delete this team" }
    }

    if (membership.role !== "owner") {
      return { error: "Only team owners can delete teams" }
    }

    // Delete the team (cascade will handle team_members)
    const { error } = await supabase.from("teams").delete().eq("id", teamId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath("/teams")
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
