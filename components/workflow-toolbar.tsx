"use client"
import { Button } from "@/components/ui/button"
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Save,
  Play,
  Trash2,
  Copy,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  RefreshCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface WorkflowToolbarProps {
  onUndo: () => void
  onRedo: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onToggleGrid: () => void
  onSave: () => void
  onExecute: () => void
  onDelete: () => void
  onCopy: () => void
  onAlignHorizontal: (alignment: "left" | "center" | "right") => void
  onAlignVertical: (alignment: "top" | "center" | "bottom") => void
  onReset: () => void
  canUndo: boolean
  canRedo: boolean
  isGridVisible: boolean
  isExecuting: boolean
}

export function WorkflowToolbar({
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleGrid,
  onSave,
  onExecute,
  onDelete,
  onCopy,
  onAlignHorizontal,
  onAlignVertical,
  onReset,
  canUndo,
  canRedo,
  isGridVisible,
  isExecuting,
}: WorkflowToolbarProps) {
  return (
    <TooltipProvider>
      <div className="bg-background/80 backdrop-blur-sm border rounded-lg shadow-md p-1 flex items-center space-x-1">
        {/* History Controls */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} className="h-8 w-8">
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} className="h-8 w-8">
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Zoom Controls */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onZoomIn} className="h-8 w-8">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-8 w-8">
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onFitView} className="h-8 w-8">
                <Maximize className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleGrid}
                className={cn("h-8 w-8", isGridVisible ? "text-primary" : "text-muted-foreground")}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Grid</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Node Operations */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Selected</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onCopy} className="h-8 w-8">
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate Selected</TooltipContent>
          </Tooltip>

          {/* Horizontal Alignment Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <AlignHorizontalJustifyCenter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Horizontal Alignment</TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onAlignHorizontal("left")}>
                <AlignLeft className="h-4 w-4 mr-2" />
                Align Left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAlignHorizontal("center")}>
                <AlignCenter className="h-4 w-4 mr-2" />
                Align Center
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAlignHorizontal("right")}>
                <AlignRight className="h-4 w-4 mr-2" />
                Align Right
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Vertical Alignment Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <AlignVerticalJustifyCenter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Vertical Alignment</TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onAlignVertical("top")}>
                <AlignStartVertical className="h-4 w-4 mr-2" />
                Align Top
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAlignVertical("center")}>
                <AlignCenterVertical className="h-4 w-4 mr-2" />
                Align Middle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAlignVertical("bottom")}>
                <AlignEndVertical className="h-4 w-4 mr-2" />
                Align Bottom
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Workflow Operations */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save Workflow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onExecute} disabled={isExecuting} className="h-8 w-8">
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Execute Workflow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onReset} className="h-8 w-8 text-destructive">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset Canvas</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
