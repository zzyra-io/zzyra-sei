"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createTeam } from "@/app/actions/team-actions"
import { toast } from "@/components/ui/use-toast"

export function CreateTeamForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    try {
      const result = await createTeam(formData)

      if (result.error) {
        toast({
          title: "Error creating team",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Team created",
        description: "Your team has been created successfully.",
      })

      router.push(`/teams/${result.team.id}`)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new team</CardTitle>
        <CardDescription>Teams allow you to collaborate with others on workflows and projects.</CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Team Name <span className="text-destructive">*</span>
            </label>
            <Input id="name" name="name" placeholder="Enter team name" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea id="description" name="description" placeholder="Describe what this team does" rows={3} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Team"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
