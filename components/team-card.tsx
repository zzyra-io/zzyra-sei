"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Settings, Trash2 } from "lucide-react"
import { deleteTeam } from "@/app/actions/team-actions"

interface TeamCardProps {
  id: string
  name: string
  description?: string
  memberCount: number
  role: string
  createdAt: string
}

export function TeamCard({ id, name, description, memberCount, role, createdAt }: TeamCardProps) {
  const isOwner = role === "owner"
  const formattedDate = new Date(createdAt).toLocaleDateString()

  async function handleDelete() {
    if (confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      await deleteTeam(id)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {name}
        </CardTitle>
        <CardDescription>{description || "No description provided"}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            <span className="font-medium">{memberCount}</span> {memberCount === 1 ? "member" : "members"}
          </div>
          <div>Created on {formattedDate}</div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between bg-muted/20 p-4">
        <div className="text-xs font-medium">
          Your role: <span className="capitalize">{role}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/teams/${id}`}>View</Link>
          </Button>
          {isOwner && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/teams/${id}/settings`}>
                  <Settings className="mr-1 h-4 w-4" />
                  Settings
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
