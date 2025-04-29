"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { type ConnectionLineComponent, useKeyPress, Position } from "reactflow";
import { motion } from "framer-motion";

interface CustomConnectionLineProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromPosition?: Position;
  toPosition?: Position;
  connectionStatus?: string;
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
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStarted, setDrawingStarted] = useState(false);
  const spacePressed = useKeyPress("Space");
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const minDistanceThreshold = 10; // Minimum distance between points to avoid too many points
  const connectionStartedRef = useRef(false);

  // Reset points when connection starts
  useEffect(() => {
    // Only reset when a new connection starts (fromX and fromY change from 0)
    if (fromX !== 0 && fromY !== 0 && !connectionStartedRef.current) {
      connectionStartedRef.current = true;
      setPoints([]);
      setIsDrawing(false);
      setDrawingStarted(false);
      lastPointRef.current = null;
    } else if (fromX === 0 && fromY === 0) {
      // Reset the connection started flag when connection is done
      connectionStartedRef.current = false;
    }
  }, [fromX, fromY]);

  // Handle space key for freeform drawing - fixed to prevent infinite loop
  useEffect(() => {
    // Only start drawing if space is pressed, we haven't started drawing yet,
    // and we have valid coordinates
    if (spacePressed && !drawingStarted && fromX !== 0 && fromY !== 0) {
      setIsDrawing(true);
      setDrawingStarted(true);
      setPoints([{ x: fromX, y: fromY }]);
      lastPointRef.current = { x: fromX, y: fromY };
    }
    // Only stop drawing if space is released and we were drawing
    else if (!spacePressed && drawingStarted) {
      setIsDrawing(false);
      // Note: we don't reset drawingStarted here to prevent toggling
    }
  }, [spacePressed, drawingStarted, fromX, fromY]);

  // Add points when drawing and mouse moves
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (isDrawing) {
        // Get the ReactFlow container bounds
        const reactFlowBounds = document
          .querySelector(".react-flow")
          ?.getBoundingClientRect();
        if (!reactFlowBounds) return;

        // Calculate the position in the ReactFlow coordinate system
        const newPoint = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };

        // Check if the new point is far enough from the last point
        if (lastPointRef.current) {
          const dx = newPoint.x - lastPointRef.current.x;
          const dy = newPoint.y - lastPointRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistanceThreshold) {
            return; // Skip this point if it's too close
          }
        }

        // Add the new point
        setPoints((prevPoints) => [...prevPoints, newPoint]);
        lastPointRef.current = newPoint;
      }
    },
    [isDrawing]
  );

  useEffect(() => {
    if (isDrawing) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDrawing, handleMouseMove]);

  // Generate path for freeform drawing
  const getFreeformPath = () => {
    if (points.length === 0) {
      return `M${fromX},${fromY} L${toX},${toY}`;
    }

    let path = `M${fromX},${fromY} `;

    // Add line segments for each point
    points.forEach((point) => {
      path += `L${point.x},${point.y} `;
    });

    // Add final line to current mouse position
    path += `L${toX},${toY}`;

    return path;
  };

  // Generate path for standard connection
  const getStandardPath = () => {
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

    return `M${fromX},${fromY} C${fromX + sourceOffsetX},${
      fromY + sourceOffsetY
    } ${toX + targetOffsetX},${toY + targetOffsetY} ${toX},${toY}`;
  };

  // Determine connection status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case "valid":
        return "#10b981";
      case "invalid":
        return "#ef4444";
      default:
        return "#64748b";
    }
  };

  // Choose path based on drawing mode
  const path = isDrawing ? getFreeformPath() : getStandardPath();
  const statusColor = getStatusColor();

  return (
    <g>
      {/* Main connection line */}
      <path
        fill='none'
        stroke={statusColor}
        strokeWidth={2}
        className='animated-dash'
        style={{
          strokeDasharray: "5,5",
          animation: "dashdraw 0.5s linear infinite",
        }}
        d={path}
      />

      {/* Glow effect */}
      <path
        fill='none'
        stroke={statusColor}
        strokeWidth={6}
        strokeOpacity={0.2}
        filter='blur(3px)'
        d={path}
      />

      {/* Endpoint indicator */}
      <motion.circle
        cx={toX}
        cy={toY}
        r={5}
        fill={statusColor}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
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
            fill='rgba(0, 0, 0, 0.7)'
            filter='blur(1px)'
          />
          <text
            x={toX + 15}
            y={toY - 15}
            fontSize={12}
            fill='white'
            style={{ pointerEvents: "none" }}>
            Drawing Mode (Space)
          </text>
        </g>
      )}

      {/* Points for freeform drawing (for debugging) */}
      {isDrawing &&
        points.map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={2}
            fill={statusColor}
            opacity={0.5}
            style={{ pointerEvents: "none" }}
          />
        ))}

      <style>
        {`
          @keyframes dashdraw {
            from {
              stroke-dashoffset: 10;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>
    </g>
  );
};
