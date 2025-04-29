"use client";

import type React from "react";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  useReactFlow,
  type EdgeProps,
  EdgeLabelRenderer,
  useKeyPress,
} from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NodeCategory } from "@/types/workflow";
import {
  Trash2,
  Edit2,
  MoreHorizontal,
  Check,
  X,
  ArrowUpRight,
  PenLineIcon as StraightLine,
  CornerDownRight,
  ChevronsUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getEdgePath, getPointOnPath, getDistance } from "./edge-utils";

// Edge types
export type EdgeType =
  | "default"
  | "straight"
  | "step"
  | "smoothstep"
  | "floating";

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  interactionWidth = 20,
}: EdgeProps & { interactionWidth?: number }) {
  const { getNode, setEdges, deleteElements } = useReactFlow();
  const edgeRef = useRef<SVGPathElement>(null);
  const [edgePath, setEdgePath] = useState<string>("");
  const [pathLength, setPathLength] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [labelText, setLabelText] = useState(data?.label || "");
  const [controlPoints, setControlPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [isDraggingControl, setIsDraggingControl] = useState<number | null>(
    null
  );
  const [edgeType, setEdgeType] = useState<EdgeType>(data?.type || "default");
  const [edgePathCache, setEdgePathCache] = useState<string>("");
  const [isMouseOverPath, setIsMouseOverPath] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const controlPointsBeforeDragRef = useRef<{ x: number; y: number }[]>([]);
  const initialControlPointsSetRef = useRef(false);
  const spacePressed = useKeyPress("Space");

  // Get source node to determine edge color based on node category
  const sourceNode = getNode(source);
  const targetNode = getNode(target);
  const sourceCategory = sourceNode?.data?.nodeType || NodeCategory.ACTION;

  // Determine edge color based on source node category
  const getEdgeColor = useCallback(() => {
    switch (sourceCategory) {
      case NodeCategory.TRIGGER:
        return "#3b82f6"; // blue
      case NodeCategory.ACTION:
        return "#10b981"; // green
      case NodeCategory.LOGIC:
        return "#8b5cf6"; // purple
      case NodeCategory.FINANCE:
        return "#f59e0b"; // amber
      default:
        return "#64748b"; // slate
    }
  }, [sourceCategory]);

  const edgeColor = getEdgeColor();

  // Calculate the initial path without control points
  useEffect(() => {
    if (!sourceNode || !targetNode) return;

    try {
      // Generate initial path based on edge type
      const path = getEdgePath(
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        edgeType
      );

      // Cache the path for performance
      setEdgePathCache(path);
      setEdgePath(path);

      // Only set control points once when the edge is first created
      if (!initialControlPointsSetRef.current && edgeType === "default") {
        const cp1 = getPointOnPath(path, 0.3);
        const cp2 = getPointOnPath(path, 0.7);
        setControlPoints([cp1, cp2]);
        initialControlPointsSetRef.current = true;
      }
    } catch (error) {
      console.error("Error calculating edge path:", error);
      // Fallback to a simple straight line if there's an error
      setEdgePath(`M${sourceX},${sourceY} L${targetX},${targetY}`);
    }
  }, [
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    edgeType,
    sourceNode,
    targetNode,
  ]);

  // Update path when control points change (only during dragging)
  useEffect(() => {
    if (
      isDraggingControl !== null &&
      edgeType === "default" &&
      controlPoints.length >= 2
    ) {
      const newPath = `M${sourceX},${sourceY} C${controlPoints[0].x},${controlPoints[0].y} ${controlPoints[1].x},${controlPoints[1].y} ${targetX},${targetY}`;
      setEdgePath(newPath);
    }
  }, [
    isDraggingControl,
    controlPoints,
    edgeType,
    sourceX,
    sourceY,
    targetX,
    targetY,
  ]);

  // Reset control points when edge type changes
  useEffect(() => {
    if (edgeType !== "default") {
      initialControlPointsSetRef.current = false;
    }
  }, [edgeType]);

  // Calculate path length for animations
  useEffect(() => {
    if (edgeRef.current) {
      try {
        const length = edgeRef.current.getTotalLength();
        setPathLength(isNaN(length) ? 0 : length);
      } catch (error) {
        console.error("Error calculating path length:", error);
        setPathLength(0);
      }
    }
  }, [edgePath]);

  // Update edge data when type changes
  useEffect(() => {
    if (data?.type !== edgeType) {
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id === id) {
            return {
              ...edge,
              data: {
                ...edge.data,
                type: edgeType,
              },
            };
          }
          return edge;
        })
      );
    }
  }, [edgeType, data?.type, id, setEdges]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [isEditing]);

  // Handle control point dragging
  const handleControlPointDragStart = (
    index: number,
    event: React.MouseEvent
  ) => {
    // Store the initial mouse position
    dragStartPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    // Store the initial control points
    controlPointsBeforeDragRef.current = [...controlPoints];

    setIsDraggingControl(index);

    // Prevent event propagation to avoid unwanted selections
    event.stopPropagation();
  };

  const handleControlPointDrag = useCallback(
    (event: React.MouseEvent | MouseEvent, index: number) => {
      if (isDraggingControl === index) {
        // Get the current mouse position in the ReactFlow coordinate system
        const reactFlowBounds = document
          .querySelector(".react-flow")
          ?.getBoundingClientRect();
        if (!reactFlowBounds) return;

        const newControlPoints = [...controlPoints];

        // Calculate the position in the ReactFlow coordinate system
        newControlPoints[index] = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };

        setControlPoints(newControlPoints);
      }
    },
    [isDraggingControl, controlPoints]
  );

  const handleControlPointDragEnd = () => {
    // Reset drag references
    dragStartPositionRef.current = null;
    controlPointsBeforeDragRef.current = [];

    setIsDraggingControl(null);
  };

  // Set up global mouse move and mouse up handlers for smooth dragging
  useEffect(() => {
    if (isDraggingControl !== null) {
      const handleMouseMove = (event: MouseEvent) => {
        handleControlPointDrag(event, isDraggingControl);
      };

      const handleMouseUp = () => {
        handleControlPointDragEnd();
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingControl, handleControlPointDrag]);

  // Handle edge deletion
  const handleDelete = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      deleteElements({ edges: [{ id }] });
    },
    [deleteElements, id]
  );

  // Handle label editing
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabelText(e.target.value);
  };

  const handleLabelSave = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: {
              ...edge.data,
              label: labelText,
            },
          };
        }
        return edge;
      })
    );
    setIsEditing(false);
  };

  const handleLabelCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setLabelText(data?.label || "");
    setIsEditing(false);
  };

  // Handle mouse events for better hover detection
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!edgePathCache || isEditing) return;

      try {
        // Check if the mouse is near the path
        const reactFlowBounds = document
          .querySelector(".react-flow")
          ?.getBoundingClientRect();
        if (!reactFlowBounds) return;

        const mouseX = event.clientX - reactFlowBounds.left;
        const mouseY = event.clientY - reactFlowBounds.top;

        // Create a temporary SVG path element to check proximity
        const tempPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        tempPath.setAttribute("d", edgePathCache);

        const pathLength = tempPath.getTotalLength();
        if (isNaN(pathLength) || pathLength === 0) return;

        // Check multiple points along the path
        const steps = Math.max(10, Math.floor(pathLength / 10));
        let isNear = false;

        for (let i = 0; i <= steps; i++) {
          const point = tempPath.getPointAtLength((i / steps) * pathLength);
          const distance = getDistance(mouseX, mouseY, point.x, point.y);

          if (distance <= interactionWidth) {
            isNear = true;
            break;
          }
        }

        setIsMouseOverPath(isNear);
      } catch (error) {
        console.error("Error in handleMouseMove:", error);
      }
    },
    [edgePathCache, isEditing, interactionWidth]
  );

  // Determine edge thickness based on state
  const getStrokeWidth = () => {
    if (selected) return 3;
    if (isHovered || isMouseOverPath) return 2.5;
    return 2;
  };

  // Determine edge opacity based on state
  const getOpacity = () => {
    if (selected) return 1;
    if (isHovered || isMouseOverPath) return 0.9;
    return 0.7;
  };

  // Edge type icon mapping
  const edgeTypeIcons = {
    default: <ArrowUpRight className='h-3 w-3' />,
    straight: <StraightLine className='h-3 w-3' />,
    step: <CornerDownRight className='h-3 w-3' />,
    smoothstep: <ChevronsUpDown className='h-3 w-3' />,
    floating: <ArrowUpRight className='h-3 w-3 rotate-45' />,
  };

  // Calculate label position
  const getLabelPosition = () => {
    try {
      if (!edgePath)
        return { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };

      // Get the midpoint of the path
      const point = getPointOnPath(edgePath, 0.5);
      return point;
    } catch (error) {
      console.error("Error calculating label position:", error);
      return { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };
    }
  };

  const labelPosition = getLabelPosition();

  return (
    <>
      {/* Base edge path */}
      <path
        id={`edge-path-${id}`}
        ref={edgeRef}
        style={{
          ...style,
          strokeWidth: getStrokeWidth(),
          stroke: style.stroke || edgeColor,
          opacity: getOpacity(),
          transition: "stroke-width 0.2s, opacity 0.2s",
          cursor: "pointer",
        }}
        className='react-flow__edge-path'
        d={edgePath}
        markerEnd={markerEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
      />

      {/* Invisible wider path for better hover/click detection */}
      <path
        style={{
          strokeWidth: interactionWidth * 2,
          stroke: "transparent",
          fill: "none",
          cursor: "pointer",
        }}
        d={edgePath}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
      />

      {/* Glow effect for selected edges */}
      {selected && (
        <path
          style={{
            stroke: edgeColor,
            strokeWidth: 8,
            strokeOpacity: 0.2,
            filter: "blur(4px)",
          }}
          className='react-flow__edge-path'
          d={edgePath}
        />
      )}

      {/* Animated particles flowing along the edge */}
      {data?.animated && pathLength > 0 && (
        <>
          <motion.circle
            r={3}
            fill={edgeColor}
            filter='drop-shadow(0 0 2px rgba(255,255,255,0.7))'
            animate={{
              offsetDistance: ["0%", "100%"],
            }}
            transition={{
              duration: 2,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
              delay: 0,
            }}
            style={{
              offsetPath: `path("${edgePath}")`,
            }}
          />

          <motion.circle
            r={3}
            fill={edgeColor}
            filter='drop-shadow(0 0 2px rgba(255,255,255,0.7))'
            animate={{
              offsetDistance: ["0%", "100%"],
            }}
            transition={{
              duration: 2,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
              delay: 1,
            }}
            style={{
              offsetPath: `path("${edgePath}")`,
            }}
          />
        </>
      )}

      {/* Control points for dragging (visible when selected) */}
      {selected &&
        edgeType === "default" &&
        controlPoints.map((point, index) => (
          <g key={`control-point-${index}`}>
            {/* Larger invisible hit area */}
            <circle
              cx={point.x}
              cy={point.y}
              r={12}
              fill='transparent'
              style={{ cursor: "move" }}
              onMouseDown={(e) => handleControlPointDragStart(index, e)}
            />
            {/* Visible control point */}
            <circle
              cx={point.x}
              cy={point.y}
              r={6}
              fill={edgeColor}
              stroke='white'
              strokeWidth={2}
              style={{
                cursor: "move",
                opacity: isDraggingControl === index ? 1 : 0.7,
                filter:
                  isDraggingControl === index
                    ? `drop-shadow(0 0 3px ${edgeColor})`
                    : "none",
              }}
              onMouseDown={(e) => handleControlPointDragStart(index, e)}
            />
          </g>
        ))}

      {/* Edge label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelPosition.x}px, ${labelPosition.y}px)`,
            pointerEvents: "all",
            zIndex: 1000,
          }}>
          {isEditing ? (
            <div className='flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-md shadow-md border border-gray-200 dark:border-slate-700'>
              <Input
                ref={labelInputRef}
                value={labelText}
                onChange={handleLabelChange}
                className='h-7 w-32 text-xs'
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLabelSave();
                  if (e.key === "Escape") handleLabelCancel();
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                size='icon'
                variant='ghost'
                className='h-6 w-6'
                onClick={handleLabelSave}>
                <Check className='h-3 w-3' />
              </Button>
              <Button
                size='icon'
                variant='ghost'
                className='h-6 w-6'
                onClick={handleLabelCancel}>
                <X className='h-3 w-3' />
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              {(selected || isHovered || isMouseOverPath || data?.label) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className='flex items-center gap-1'>
                  <Badge
                    variant='outline'
                    className={cn(
                      "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm",
                      "flex items-center gap-1",
                      selected && "shadow-md",
                      data?.animated && "transition-all duration-300"
                    )}
                    style={{
                      borderColor: edgeColor,
                      color: edgeColor,
                      boxShadow: selected
                        ? `0 0 0 1px ${edgeColor}20, 0 2px 4px ${edgeColor}10`
                        : undefined,
                    }}>
                    {edgeTypeIcons[edgeType]}
                    {data?.label || ""}
                    {data?.animated && (
                      <motion.div
                        className='ml-1 h-1.5 w-1.5 rounded-full'
                        style={{ backgroundColor: edgeColor }}
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                    )}
                  </Badge>

                  {(selected || isHovered || isMouseOverPath) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className='flex items-center'>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size='icon'
                              variant='outline'
                              className='h-6 w-6 bg-white dark:bg-slate-800'
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsEditing(true);
                              }}>
                              <Edit2 className='h-3 w-3' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit label</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <DropdownMenu>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size='icon'
                                  variant='outline'
                                  className='h-6 w-6 ml-1 bg-white dark:bg-slate-800'
                                  onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className='h-3 w-3' />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edge options</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <DropdownMenuContent align='center' className='w-40'>
                          <DropdownMenuLabel className='text-xs'>
                            Edge Type
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            className='text-xs flex items-center gap-2'
                            onClick={() => setEdgeType("default")}>
                            <ArrowUpRight className='h-3 w-3' />
                            <span>Bezier</span>
                            {edgeType === "default" && (
                              <Check className='h-3 w-3 ml-auto' />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='text-xs flex items-center gap-2'
                            onClick={() => setEdgeType("straight")}>
                            <StraightLine className='h-3 w-3' />
                            <span>Straight</span>
                            {edgeType === "straight" && (
                              <Check className='h-3 w-3 ml-auto' />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='text-xs flex items-center gap-2'
                            onClick={() => setEdgeType("step")}>
                            <CornerDownRight className='h-3 w-3' />
                            <span>Step</span>
                            {edgeType === "step" && (
                              <Check className='h-3 w-3 ml-auto' />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='text-xs flex items-center gap-2'
                            onClick={() => setEdgeType("smoothstep")}>
                            <ChevronsUpDown className='h-3 w-3' />
                            <span>Smooth Step</span>
                            {edgeType === "smoothstep" && (
                              <Check className='h-3 w-3 ml-auto' />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className='text-xs flex items-center gap-2 text-red-500'
                            onClick={handleDelete}>
                            <Trash2 className='h-3 w-3' />
                            <span>Delete Edge</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size='icon'
                              variant='outline'
                              className='h-6 w-6 ml-1 bg-white dark:bg-slate-800 text-red-500 border-red-200 dark:border-red-800'
                              onClick={handleDelete}>
                              <Trash2 className='h-3 w-3' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete edge</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
