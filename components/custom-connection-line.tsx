"use client";

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { type ConnectionLineComponent, useKeyPress, Position, ConnectionState } from "@xyflow/react";
import { motion } from "framer-motion";
import { throttle } from "lodash";

interface CustomConnectionLineProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromPosition?: Position;
  toPosition?: Position;
  connectionStatus?: ConnectionState | null;
}

export const CustomConnectionLine: ConnectionLineComponent = ({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
}: CustomConnectionLineProps) => {
  // State for tracking points in freeform drawing mode
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStarted, setDrawingStarted] = useState(false);
  
  // References for performance optimizations
  const spacePressed = useKeyPress("Space");
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const connectionStartedRef = useRef(false);
  const reactFlowBoundsRef = useRef<DOMRect | null>(null);
  
  // Configuration constants
  const minDistanceThreshold = 15; // Minimum distance between points
  const maxPoints = 100; // Maximum points to store (prevents memory issues)
  const debugMode = false; // Set to true only when debugging

  // Reset drawing state when a new connection starts
  useEffect(() => {
    if (fromX !== 0 && fromY !== 0 && !connectionStartedRef.current) {
      // New connection started
      connectionStartedRef.current = true;
      setPoints([]);
      setIsDrawing(false);
      setDrawingStarted(false);
      lastPointRef.current = null;
    } else if (fromX === 0 && fromY === 0) {
      // Connection ended
      connectionStartedRef.current = false;
    }
  }, [fromX, fromY]);

  // Cache ReactFlow container bounds
  useEffect(() => {
    const updateBounds = () => {
      reactFlowBoundsRef.current = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect() || null;
    };
    
    // Initial update and listen for resize
    updateBounds();
    window.addEventListener('resize', updateBounds);
    
    return () => {
      window.removeEventListener('resize', updateBounds);
    };
  }, []);

  // Handle space key for freeform drawing mode
  useEffect(() => {
    // Skip if no active connection
    if (fromX === 0 && fromY === 0) return;
    
    if (spacePressed && !drawingStarted && fromX !== 0 && fromY !== 0) {
      // Start drawing mode
      setIsDrawing(true);
      setDrawingStarted(true);
      setPoints([{ x: fromX, y: fromY }]);
      lastPointRef.current = { x: fromX, y: fromY };
    } else if (!spacePressed && isDrawing) {
      // Stop drawing mode
      setIsDrawing(false);
    }
  }, [spacePressed, drawingStarted, isDrawing, fromX, fromY]);

  // Define the mouse move handler with proper dependencies
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDrawing) return;
    
    // Update or get bounds if needed
    if (!reactFlowBoundsRef.current) {
      reactFlowBoundsRef.current = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect() || null;
      if (!reactFlowBoundsRef.current) return;
    }

    // Convert screen coordinates to ReactFlow coordinates
    const newPoint = {
      x: event.clientX - (reactFlowBoundsRef.current?.left || 0),
      y: event.clientY - (reactFlowBoundsRef.current?.top || 0),
    };

    // Filter points that are too close together
    if (lastPointRef.current) {
      const dx = newPoint.x - lastPointRef.current.x;
      const dy = newPoint.y - lastPointRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistanceThreshold) return;
    }

    // Update points with limit to prevent performance issues
    setPoints(prevPoints => {
      const newPoints = [...prevPoints, newPoint];
      return newPoints.length > maxPoints ? newPoints.slice(-maxPoints) : newPoints;
    });
    
    lastPointRef.current = newPoint;
  }, [isDrawing, minDistanceThreshold, maxPoints]);
  
  // Create a throttled version of the handler
  const throttledMouseMove = useMemo(
    () => throttle(handleMouseMove, 16), // ~60fps throttling
    [handleMouseMove]
  );

  // Attach/detach mousemove listener
  useEffect(() => {
    if (isDrawing) {
      window.addEventListener("mousemove", throttledMouseMove);
    }
    return () => window.removeEventListener("mousemove", throttledMouseMove);
  }, [isDrawing, throttledMouseMove]);

  // Generate path for freeform drawing
  const getFreeformPath = useCallback(() => {
    if (points.length === 0) {
      return `M${fromX},${fromY} L${toX},${toY}`;
    }

    let path = `M${fromX},${fromY} `;
    points.forEach(point => path += `L${point.x},${point.y} `);
    path += `L${toX},${toY}`;

    return path;
  }, [fromX, fromY, toX, toY, points]);

  // Generate path for standard connection
  const getStandardPath = useCallback(() => {
    // Default positions if not provided
    const sourcePosition = fromPosition || Position.Right;
    const targetPosition = toPosition || Position.Left;

    // Calculate control points based on positions
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    const controlPointDistance = Math.min(
      Math.sqrt(dx * dx + dy * dy) * 0.5,
      150
    );

    let sourceOffsetX = 0;
    let sourceOffsetY = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;

    switch (sourcePosition) {
      case Position.Left:
        sourceOffsetX = -controlPointDistance;
        break;
      case Position.Right:
        sourceOffsetX = controlPointDistance;
        break;
      case Position.Top:
        sourceOffsetY = -controlPointDistance;
        break;
      case Position.Bottom:
        sourceOffsetY = controlPointDistance;
        break;
    }

    switch (targetPosition) {
      case Position.Left:
        targetOffsetX = -controlPointDistance;
        break;
      case Position.Right:
        targetOffsetX = controlPointDistance;
        break;
      case Position.Top:
        targetOffsetY = -controlPointDistance;
        break;
      case Position.Bottom:
        targetOffsetY = controlPointDistance;
        break;
    }

    return `M${fromX},${fromY} C${fromX + sourceOffsetX},${fromY + sourceOffsetY} ${toX + targetOffsetX},${toY + targetOffsetY} ${toX},${toY}`;
  }, [fromX, fromY, toX, toY, fromPosition, toPosition]);

  // Determine connection status color
  const getStatusColor = useCallback(() => {
    switch (connectionStatus) {
      case "valid":
        return "#10b981";
      case "invalid":
        return "#ef4444";
      default:
        return "#64748b";
    }
  }, [connectionStatus]);

  // Memoize path calculation and status color
  const path = useMemo(
    () => isDrawing ? getFreeformPath() : getStandardPath(),
    [isDrawing, getFreeformPath, getStandardPath]
  );
  
  const statusColor = useMemo(
    () => getStatusColor(), 
    [getStatusColor]
  );

  // No inline styles - they are defined in CSS

  return (
    <g>
      {/* Main connection line */}
      <path
        fill="none"
        stroke={statusColor}
        strokeWidth={2}
        className="animated-dash"
        d={path}
      />

      {/* Glow effect */}
      <path
        fill="none"
        stroke={statusColor}
        strokeWidth={6}
        strokeOpacity={0.2}
        filter="blur(3px)"
        d={path}
      />

      {/* Endpoint indicator - optimized animation */}
      <motion.circle
        cx={toX}
        cy={toY}
        r={5}
        fill={statusColor}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ 
          duration: 1, 
          repeat: 5, // Limited repeats instead of infinite for better performance
          repeatType: "loop" 
        }}
      />

      {/* Drawing mode indicator */}
      {spacePressed && (
        <g>
          <rect
            x={toX + 10}
            y={toY - 30}
            width={140}
            height={20}
            rx={4}
            fill="rgba(0, 0, 0, 0.7)"
            filter="blur(1px)"
          />
          <text
            x={toX + 15}
            y={toY - 15}
            fontSize={12}
            fill="white"
            className="connection-label">
            Drawing Mode (Space)
          </text>
        </g>
      )}

      {/* Points visualization - only in debug mode */}
      {isDrawing && debugMode &&
        // Only show every 3rd point to reduce rendering overhead
        points.filter((_, i) => i % 3 === 0).map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={2}
            fill={statusColor}
            opacity={0.5}
            className="connection-point"
          />
        ))}

      {/* Styles moved to global CSS */}
    </g>
  );
};
