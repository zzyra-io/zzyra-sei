import { createClient } from "@/lib/supabase/client"

export type TeamRole = "owner" | "admin" | "member"

export interface Team {
  id: string
  name: string
  slug: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  created_at: string
  updated_at: string
  // Joined fields from profiles
  full_name?: string
  email?: string
  avatar_url?: string
}

export interface TeamWithMembers extends Team {
  members: TeamMember[]
}

export interface CreateTeamInput {
  name: string
  slug?: string
}

export interface UpdateTeamInput {
  name?: string
  slug?: string
  logo_url?: string
}

export interface InviteTeamMemberInput {
  email: string
  role: TeamRole
}

export class TeamService {
  private supabase = createClient()

  async getUserTeams(): Promise<Team[]> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error } = await this.supabase
        .from("teams")
        .select("*, team_members!inner(user_id)")
        .eq("team_members.user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      // Remove the team_members field from the response
      return data.map(({ team_members, ...team }) => team)
    } catch (error) {
      console.error("Error fetching user teams:", error)
      throw error
    }
  }

  async getTeam(teamId: string): Promise<TeamWithMembers> {
    try {
      // Get team details
      const { data: team, error: teamError } = await this.supabase.from("teams").select("*").eq("id", teamId).single()

      if (teamError) {
        throw teamError
      }

      // Get team members with profile information
      const { data: members, error: membersError } = await this.supabase
        .from("team_members")
        .select(`
          id, team_id, user_id, role, created_at, updated_at,
          profiles:user_id (full_name, avatar_url),
          users:user_id (email)
        `)
        .eq("team_id", teamId)

      if (membersError) {
        throw membersError
      }

      // Format the members data
      const formattedMembers = members.map((member) => ({
        id: member.id,
        team_id: member.team_id,
        user_id: member.user_id,
        role: member.role,
        created_at: member.created_at,
        updated_at: member.updated_at,
        full_name: member.profiles?.full_name,
        email: member.users?.email,
        avatar_url: member.profiles?.avatar_url,
      }))

      return {
        ...team,
        members: formattedMembers,
      }
    } catch (error) {
      console.error("Error fetching team:", error)
      throw error
    }
  }

  async createTeam(input: CreateTeamInput): Promise<Team> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Generate a slug if not provided
      const slug = input.slug || input.name.toLowerCase().replace(/\s+/g, "-")

      // Start a transaction
      const { data: team, error: teamError } = await this.supabase
        .from("teams")
        .insert({
          name: input.name,
          slug,
        })
        .select()
        .single()

      if (teamError) {
        throw teamError
      }

      // Add the creator as an owner
      const { error: memberError } = await this.supabase.from("team_members").insert({
        team_id: team.id,
        user_id: user.id,
        role: "owner",
      })

      if (memberError) {
        // Rollback by deleting the team
        await this.supabase.from("teams").delete().eq("id", team.id)
        throw memberError
      }

      return team
    } catch (error) {
      console.error("Error creating team:", error)
      throw error
    }
  }

  async updateTeam(teamId: string, input: UpdateTeamInput): Promise<Team> {
    try {
      const { data, error } = await this.supabase.from("teams").update(input).eq("id", teamId).select().single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error("Error updating team:", error)
      throw error
    }
  }

  async deleteTeam(teamId: string): Promise<void> {
    try {
      const { error } = await this.supabase.from("teams").delete().eq("id", teamId)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error("Error deleting team:", error)
      throw error
    }
  }

  async inviteTeamMember(teamId: string, input: InviteTeamMemberInput): Promise<void> {
    try {
      // Check if user exists
      const { data: user, error: userError } = await this.supabase
        .from("users")
        .select("id")
        .eq("email", input.email)
        .single()

      if (userError) {
        // User doesn't exist, send an invitation email
        // This would typically be handled by a serverless function
        throw new Error("User not found. Invitation emails not implemented yet.")
      }

      // Add user to team
      const { error } = await this.supabase.from("team_members").insert({
        team_id: teamId,
        user_id: user.id,
        role: input.role,
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error("Error inviting team member:", error)
      throw error
    }
  }

  async updateTeamMemberRole(teamMemberId: string, role: TeamRole): Promise<void> {
    try {
      const { error } = await this.supabase.from("team_members").update({ role }).eq("id", teamMemberId)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error("Error updating team member role:", error)
      throw error
    }
  }

  async removeTeamMember(teamMemberId: string): Promise<void> {
    try {
      const { error } = await this.supabase.from("team_members").delete().eq("id", teamMemberId)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error("Error removing team member:", error)
      throw error
    }
  }

  async getTeamWorkflows(teamId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from("workflows")
        .select("*")
        .eq("team_id", teamId)
        .order("updated_at", { ascending: false })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error("Error fetching team workflows:", error)
      throw error
    }
  }
}

export const teamService = new TeamService()
