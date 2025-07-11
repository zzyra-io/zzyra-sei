"use client";
import { Button } from "@/components/ui/button";
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
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

interface WorkflowToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleGrid: () => void;
  onSave: () => void;
  onExecute: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onAlignHorizontal: (alignment: "left" | "center" | "right") => void;
  onAlignVertical: (alignment: "top" | "center" | "bottom") => void;
  onReset: () => void;
  onHelp: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isGridVisible: boolean;
  isExecuting: boolean;
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
  onHelp,
  canUndo,
  canRedo,
  isGridVisible,
  isExecuting,
}: WorkflowToolbarProps) {
  const { theme } = useTheme();

  // Determine modifier key based on platform
  const [modKey, setModKey] = useState("Ctrl");
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    ) {
      setModKey("⌘");
    }
  }, []);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "bg-card/95 backdrop-blur-md border border-border/60 rounded-xl shadow-lg",
          "p-2 flex items-center gap-1",
          "transition-all duration-200 hover:shadow-xl hover:border-border/80",
          theme === "dark" ? "shadow-black/20" : "shadow-gray-200/50"
        )}>
        {/* History Controls */}
        <div className='flex items-center gap-0.5'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onUndo}
                disabled={!canUndo}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-muted/80 hover:scale-105 active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus-visible:ring-2 focus-visible:ring-primary/20"
                )}>
                <Undo2 className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Undo ({modKey}+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onRedo}
                disabled={!canRedo}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-muted/80 hover:scale-105 active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus-visible:ring-2 focus-visible:ring-primary/20"
                )}>
                <Redo2 className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Redo ({modKey}+Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation='vertical' className='h-6 mx-1 bg-border/60' />

        {/* Zoom Controls */}
        <div className='flex items-center gap-0.5'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onZoomIn}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-muted/80 hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-primary/20"
                )}>
                <ZoomIn className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Zoom In ({modKey}++)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onZoomOut}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-muted/80 hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-primary/20"
                )}>
                <ZoomOut className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Zoom Out ({modKey}+-)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onFitView}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-muted/80 hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-primary/20"
                )}>
                <Maximize className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Fit to View ({modKey}+0)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onToggleGrid}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-muted/80 hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-primary/20",
                  isGridVisible
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground"
                )}>
                <Grid className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Toggle Grid ({modKey}+G)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation='vertical' className='h-6 mx-1 bg-border/60' />

        {/* Node Operations */}
        <div className='flex items-center gap-0.5'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onDelete}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-destructive/10 hover:text-destructive hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-destructive/20"
                )}>
                <Trash2 className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Delete Selected (Del)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onCopy}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-muted/80 hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-primary/20"
                )}>
                <Copy className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Duplicate Selected ({modKey}+D)</p>
            </TooltipContent>
          </Tooltip>

          {/* Horizontal Alignment Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={cn(
                      "h-9 w-9 rounded-lg transition-all duration-200",
                      "hover:bg-muted/80 hover:scale-105 active:scale-95",
                      "focus-visible:ring-2 focus-visible:ring-primary/20"
                    )}>
                    <AlignHorizontalJustifyCenter className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent
                side='bottom'
                className='bg-popover/95 backdrop-blur-sm border border-border/60'>
                <p className='font-medium'>Horizontal Alignment</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <DropdownMenuItem
                onClick={() => onAlignHorizontal("left")}
                className='hover:bg-muted/80'>
                <AlignLeft className='h-4 w-4 mr-2' />
                Align Left
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAlignHorizontal("center")}
                className='hover:bg-muted/80'>
                <AlignCenter className='h-4 w-4 mr-2' />
                Align Center
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAlignHorizontal("right")}
                className='hover:bg-muted/80'>
                <AlignRight className='h-4 w-4 mr-2' />
                Align Right
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Vertical Alignment Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={cn(
                      "h-9 w-9 rounded-lg transition-all duration-200",
                      "hover:bg-muted/80 hover:scale-105 active:scale-95",
                      "focus-visible:ring-2 focus-visible:ring-primary/20"
                    )}>
                    <AlignVerticalJustifyCenter className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent
                side='bottom'
                className='bg-popover/95 backdrop-blur-sm border border-border/60'>
                <p className='font-medium'>Vertical Alignment</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <DropdownMenuItem
                onClick={() => onAlignVertical("top")}
                className='hover:bg-muted/80'>
                <AlignStartVertical className='h-4 w-4 mr-2' />
                Align Top
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAlignVertical("center")}
                className='hover:bg-muted/80'>
                <AlignCenterVertical className='h-4 w-4 mr-2' />
                Align Middle
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAlignVertical("bottom")}
                className='hover:bg-muted/80'>
                <AlignEndVertical className='h-4 w-4 mr-2' />
                Align Bottom
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation='vertical' className='h-6 mx-1 bg-border/60' />

        {/* Workflow Operations */}
        <div className='flex items-center gap-0.5'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onSave}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-green-500/10 hover:text-green-600 hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-green-500/20"
                )}
                aria-label='Save Workflow'>
                <Save className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Save Workflow ({modKey}+S)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onExecute}
                disabled={isExecuting}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-primary/20",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label='Execute Workflow'>
                <Play className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Execute Workflow ({modKey}+E)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onReset}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-destructive/10 hover:text-destructive hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-destructive/20"
                )}>
                <RefreshCw className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Reset Canvas ({modKey}+Shift+R)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onHelp}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all duration-200",
                  "hover:bg-blue-500/10 hover:text-blue-600 hover:scale-105 active:scale-95",
                  "focus-visible:ring-2 focus-visible:ring-blue-500/20"
                )}>
                <Info className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              className='bg-popover/95 backdrop-blur-sm border border-border/60'>
              <p className='font-medium'>Show Help & Shortcuts</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
