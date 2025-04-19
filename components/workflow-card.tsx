"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { WorkflowSummary } from "@/lib/supabase/schema"
import {
  MoreHorizontal,
  Play,
  Pencil,
  Copy,
  Trash2,
  Clock,
  Star,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowCardProps {
  workflow: WorkflowSummary
  viewMode?: "grid" | "list"
  onDelete: () => Promise<void>
  onFavoriteToggle: (isFavorite: boolean) => void
}

export function WorkflowCard({ workflow, viewMode = "grid", onDelete, onFavoriteToggle }: WorkflowCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete()
    setIsDeleting(false)
    setIsDeleteDialogOpen(false)
  }

  const getStatusIcon = () => {
    if (!workflow.last_status) return null

    switch (workflow.last_status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Play className="h-4 w-4 text-blue-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-amber-500" />
    }
  }

  if (viewMode === "list") {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {workflow.is_favorite ? (
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              ) : (
                <div className="font-medium text-primary">{workflow.name.charAt(0).toUpperCase()}</div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/workflow/${workflow.id}`} className="hover:underline">
              <h3 className="font-medium truncate">{workflow.name}</h3>
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center">
                <Clock className="mr-1 h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(workflow.updated_at), { addSuffix: true })}
              </span>
              {workflow.last_status && (
                <span className="flex items-center">
                  {getStatusIcon()}
                  <span className="ml-1 capitalize">{workflow.last_status}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/workflow/${workflow.id}`}>
            <Button size="sm" variant="ghost">
              View
            </Button>
          </Link>
          <Link href={`/builder/${workflow.id}`}>
            <Button size="sm" variant="ghost">
              Edit
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onFavoriteToggle(!workflow.is_favorite)}>
                <Star className={cn("mr-2 h-4 w-4", workflow.is_favorite && "fill-amber-500 text-amber-500")} />
                {workflow.is_favorite ? "Remove from favorites" : "Add to favorites"}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this workflow?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the workflow and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="line-clamp-1">{workflow.name}</CardTitle>
            <CardDescription className="line-clamp-1">
              {formatDistanceToNow(new Date(workflow.updated_at), { addSuffix: true })}
            </CardDescription>
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onFavoriteToggle(!workflow.is_favorite)}
            >
              <Star className={cn("h-4 w-4", workflow.is_favorite && "fill-amber-500 text-amber-500")} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/builder/${workflow.id}`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {workflow.description || "No description provided."}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 pt-2">
        {workflow.tags && workflow.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {workflow.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {workflow.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{workflow.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center text-sm text-muted-foreground">
            {workflow.last_status && (
              <div className="flex items-center">
                {getStatusIcon()}
                <span className="ml-1 capitalize">{workflow.last_status}</span>
              </div>
            )}
          </div>
          <Link href={`/workflow/${workflow.id}`}>
            <Button size="sm" variant="ghost" className="gap-1">
              View
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardFooter>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workflow and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
