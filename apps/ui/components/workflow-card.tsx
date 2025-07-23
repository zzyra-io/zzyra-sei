"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Activity,
  Zap,
  Timer,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface WorkflowCardProps {
  workflow: any;
  viewMode?: "grid" | "list";
  onDelete: () => Promise<void>;
  onFavoriteToggle: (isFavorite: boolean) => void;
}

export function WorkflowCard({
  workflow,
  viewMode = "grid",
  onDelete,
  onFavoriteToggle,
}: WorkflowCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };

  const getStatusIcon = () => {
    if (!workflow.last_status) return null;

    switch (workflow.last_status) {
      case "success":
        return <CheckCircle2 className='h-4 w-4 text-green-500' />;
      case "failed":
        return <XCircle className='h-4 w-4 text-red-500' />;
      case "running":
        return <Play className='h-4 w-4 text-blue-500' />;
      default:
        return <AlertCircle className='h-4 w-4 text-amber-500' />;
    }
  };

  if (viewMode === "list") {
    return (
      <div className='flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors'>
        <div className='flex items-center gap-4 flex-1 min-w-0'>
          <div className='flex-shrink-0'>
            <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
              {workflow.is_favorite ? (
                <Star className='h-5 w-5 text-amber-500 fill-amber-500' />
              ) : (
                <div className='font-medium text-primary'>
                  {workflow.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className='flex-1 min-w-0'>
            <Link href={`/workflow/${workflow.id}`} className='hover:underline'>
              <h3 className='font-medium truncate'>{workflow.name}</h3>
            </Link>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <span className='flex items-center'>
                <Clock className='mr-1 h-3.5 w-3.5' />
                {(() => {
                  if (!workflow.updated_at) return "Unknown";
                  const date = new Date(workflow.updated_at);
                  if (isNaN(date.getTime())) return "Unknown";
                  return formatDistanceToNow(date, { addSuffix: true });
                })()}
              </span>
              {workflow.last_status && (
                <span className='flex items-center'>
                  {getStatusIcon()}
                  <span className='ml-1 capitalize'>
                    {workflow.last_status}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Link href={`/workflow/${workflow.id}`}>
            <Button size='sm' variant='outline'>
              View
            </Button>
          </Link>
          <Link href={`/builder?id=${workflow.id}`}>
            <Button size='sm' variant='ghost'>
              Edit
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8'>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={() => onFavoriteToggle(!workflow.is_favorite)}>
                <Star
                  className={cn(
                    "mr-2 h-4 w-4",
                    workflow.is_favorite && "fill-amber-500 text-amber-500"
                  )}
                />
                {workflow.is_favorite
                  ? "Remove from favorites"
                  : "Add to favorites"}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className='mr-2 h-4 w-4' />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className='text-red-600'>
                <Trash2 className='mr-2 h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this workflow?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                workflow and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className='bg-red-600 hover:bg-red-700'>
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const stats = workflow.statistics || {};

  return (
    <motion.div
      className='group relative overflow-hidden transition-all hover:shadow-lg border bg-background/50 backdrop-blur-sm rounded-lg'
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}>
      <Card className='border-0 bg-transparent shadow-none'>
        {/* Gradient overlay on hover */}
        <motion.div
          className='absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100'
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between'>
            <div className='flex-1 min-w-0'>
              <CardTitle className='line-clamp-1 text-lg bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground group-hover:from-primary group-hover:to-purple-600 transition-all duration-300'>
                {workflow.name}
              </CardTitle>
              <CardDescription className='line-clamp-1 flex items-center mt-1'>
                <Clock className='mr-1 h-3 w-3 text-primary opacity-60' />
                {(() => {
                  if (!workflow.updated_at) return "Unknown";
                  const date = new Date(workflow.updated_at);
                  if (isNaN(date.getTime())) return "Unknown";
                  return formatDistanceToNow(date, { addSuffix: true });
                })()}
              </CardDescription>
            </div>
            <div className='flex items-center'>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => onFavoriteToggle(!workflow.is_favorite)}>
                <Star
                  className={cn(
                    "h-4 w-4",
                    workflow.is_favorite && "fill-amber-500 text-amber-500"
                  )}
                />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-8 w-8'>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem asChild>
                    <Link href={`/builder?id=${workflow.id}`}>
                      <Pencil className='mr-2 h-4 w-4' />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className='mr-2 h-4 w-4' />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className='text-red-600'>
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className='pb-3 space-y-4'>
          <p className='line-clamp-2 text-sm text-muted-foreground'>
            {workflow.description || "No description provided."}
          </p>

          {/* Statistics Summary */}
          <div className='grid grid-cols-2 gap-3'>
            {/* Executions */}
            <div className='flex items-center gap-2 p-2 rounded-md bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-200/20'>
              <div className='p-1 rounded-full bg-blue-500/20'>
                <Activity className='h-3 w-3 text-blue-600' />
              </div>
              <div>
                <p className='text-xs font-medium text-blue-600'>
                  {stats.totalExecutions || 0}
                </p>
                <p className='text-[10px] text-muted-foreground'>Executions</p>
              </div>
            </div>

            {/* Success Rate */}
            <div className='flex items-center gap-2 p-2 rounded-md bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200/20'>
              <div className='p-1 rounded-full bg-green-500/20'>
                <CheckCircle2 className='h-3 w-3 text-green-600' />
              </div>
              <div>
                <p className='text-xs font-medium text-green-600'>
                  {stats.successRate || 0}%
                </p>
                <p className='text-[10px] text-muted-foreground'>Success</p>
              </div>
            </div>

            {/* Avg Time */}
            <div className='flex items-center gap-2 p-2 rounded-md bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200/20'>
              <div className='p-1 rounded-full bg-purple-500/20'>
                <Timer className='h-3 w-3 text-purple-600' />
              </div>
              <div>
                <p className='text-xs font-medium text-purple-600'>
                  {stats.avgExecutionTime || 0}s
                </p>
                <p className='text-[10px] text-muted-foreground'>Avg Time</p>
              </div>
            </div>

            {/* Complexity */}
            <div className='flex items-center gap-2 p-2 rounded-md bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-200/20'>
              <div className='p-1 rounded-full bg-orange-500/20'>
                <GitBranch className='h-3 w-3 text-orange-600' />
              </div>
              <div>
                <p className='text-xs font-medium text-orange-600'>
                  {stats.nodeCount || 0}
                </p>
                <p className='text-[10px] text-muted-foreground'>Nodes</p>
              </div>
            </div>
          </div>

          {/* Status and Last Execution */}
          {stats.lastStatus && stats.lastStatus !== "none" && (
            <div className='flex items-center justify-between p-2 rounded-md bg-muted/50'>
              <div className='flex items-center gap-2'>
                {getStatusIcon()}
                <span className='text-xs font-medium capitalize'>
                  {stats.lastStatus}
                </span>
              </div>
              {stats.lastExecutedAt && (
                <span className='text-[10px] text-muted-foreground'>
                  {formatDistanceToNow(new Date(stats.lastExecutedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className='flex flex-col items-start gap-3 pt-2'>
          {workflow.tags && workflow.tags.length > 0 && (
            <div className='flex flex-wrap gap-1'>
              {workflow.tags.slice(0, 3).map((tag: string) => (
                <Badge
                  key={tag}
                  variant='secondary'
                  className='text-xs bg-gradient-to-r from-primary/10 to-purple-500/10'>
                  {tag}
                </Badge>
              ))}
              {workflow.tags.length > 3 && (
                <Badge
                  variant='secondary'
                  className='text-xs bg-gradient-to-r from-primary/10 to-purple-500/10'>
                  +{workflow.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className='flex w-full justify-between items-center'>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href={`/builder?id=${workflow.id}`}>
                <Button
                  size='sm'
                  variant='outline'
                  className='gap-1 hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/10'>
                  <Pencil className='h-3.5 w-3.5' />
                  Edit
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href={`/workflow/${workflow.id}`}>
                <Button size='sm' variant='default' className='gap-1'>
                  View
                  <motion.div
                    initial={{ x: 0 }}
                    whileHover={{ x: 3 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 10,
                    }}>
                    <ArrowRight className='h-3.5 w-3.5' />
                  </motion.div>
                </Button>
              </Link>
            </motion.div>
          </div>
        </CardFooter>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this workflow?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                workflow and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className='bg-red-600 hover:bg-red-700'>
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </motion.div>
  );
}
