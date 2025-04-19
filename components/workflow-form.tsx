"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Workflow } from "@/app/actions/workflow-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"

interface WorkflowFormProps {
  workflow?: Workflow
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>
}

export function WorkflowForm({ workflow, action }: WorkflowFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await action(formData)

      if (result.error) {
        setError(result.error)
      } else {
        router.push("/workflows")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="My Workflow" required defaultValue={workflow?.name || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your workflow..."
              rows={3}
              defaultValue={workflow?.description || ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="finance, automation, monitoring"
              defaultValue={workflow?.tags.join(", ") || ""}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="is_public" name="is_public" defaultChecked={workflow?.is_public || false} />
            <Label htmlFor="is_public">Make this workflow public</Label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {workflow ? "Updating..." : "Creating..."}
              </>
            ) : workflow ? (
              "Update Workflow"
            ) : (
              "Create Workflow"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
