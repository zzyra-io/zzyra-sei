"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { createWorkflow, updateWorkflow } from "@/app/actions/workflow-actions"
import { useRouter } from "next/navigation"

interface WorkflowFormProps {
  workflow?: {
    id: string
    name: string
    description: string
    is_public: boolean
    tags: string[]
  }
  mode: "create" | "edit"
}

export function WorkflowForm({ workflow, mode }: WorkflowFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)

    try {
      if (mode === "create") {
        const result = await createWorkflow(formData)
        if (result?.error) {
          setError(result.error)
        }
      } else if (workflow) {
        const result = await updateWorkflow(workflow.id, formData)
        if (result?.error) {
          setError(result.error)
        }
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create New Workflow" : "Edit Workflow"}</CardTitle>
        <CardDescription>
          {mode === "create" ? "Create a new workflow to automate your tasks" : "Update your workflow details"}
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Awesome Workflow"
              defaultValue={workflow?.name || ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe what this workflow does"
              defaultValue={workflow?.description || ""}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="automation, finance, monitoring"
              defaultValue={workflow?.tags?.join(", ") || ""}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="isPublic" name="isPublic" defaultChecked={workflow?.is_public || false} value="true" />
            <Label htmlFor="isPublic">Make this workflow public</Label>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : mode === "create" ? "Create Workflow" : "Update Workflow"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
