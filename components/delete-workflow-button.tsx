"use client"

import { deleteWorkflow } from "@/app/actions/workflow-actions"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TrashIcon } from "lucide-react"
import { useState } from "react"

interface DeleteWorkflowButtonProps {
  id: string
}

export function DeleteWorkflowButton({ id }: DeleteWorkflowButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)

    try {
      const result = await deleteWorkflow(id)
      if (result?.error) {
        setError(result.error)
        setIsDeleting(false)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setIsDeleting(false)
      console.error(err)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <TrashIcon className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this workflow and all of its data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm mb-4">{error}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
