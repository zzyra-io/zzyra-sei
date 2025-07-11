import { BaseEdge, getStraightPath, useInternalNode } from "@xyflow/react";
import { getEdgeParams } from "./edge-utils";
import "./fe.css";
import { useEffect } from "react";

interface FloatingEdgeProps {
  id: string;
  source: string;
  target: string;
  markerEnd?: string;
  style?: React.CSSProperties;
  data?: unknown;
}

function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
}: FloatingEdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  // Check if either source or target node is in a running state
  const sourceStatus = sourceNode?.data?.status;
  const targetStatus = targetNode?.data?.status;
  const shouldAnimate =
    sourceStatus === "running" || targetStatus === "running";

  // Animation state effect
  useEffect(() => {
    if (shouldAnimate) {
      const timer = setTimeout(() => {
        // Animation cleanup if needed
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [shouldAnimate]);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  const [path] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  const gradientId = `gradient-${id}`;
  const pathId = `path-${id}`;

  return (
    <g>
      {/* Gradient definition for animated flow */}
      <defs>
        <linearGradient id={gradientId} x1='0%' y1='0%' x2='100%' y2='0%'>
          <stop offset='0%' stopColor='transparent' />
          <stop
            offset='50%'
            stopColor={shouldAnimate ? "#3b82f6" : "transparent"}
            stopOpacity={shouldAnimate ? 0.8 : 0}
          />
          <stop offset='100%' stopColor='transparent' />
          {shouldAnimate && (
            <animateTransform
              attributeName='gradientTransform'
              type='translate'
              values='0 0; 100 0; 0 0'
              dur='2s'
              repeatCount='indefinite'
            />
          )}
        </linearGradient>
      </defs>

      {/* Base edge path */}
      <BaseEdge
        id={id}
        className='react-flow__edge-path'
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: shouldAnimate ? "#3b82f6" : style?.stroke || "#b1b1b7",
          strokeWidth: shouldAnimate ? 2 : style?.strokeWidth || 1,
        }}
      />

      {/* Animated overlay for data flow */}
      {shouldAnimate && (
        <path
          id={pathId}
          d={path}
          fill='none'
          stroke={`url(#${gradientId})`}
          strokeWidth='3'
          strokeDasharray='5,5'
          opacity='0.7'>
          <animate
            attributeName='stroke-dashoffset'
            values='0;-10;0'
            dur='1s'
            repeatCount='indefinite'
          />
        </path>
      )}

      {/* Animated particles along the path */}
      {shouldAnimate && (
        <circle r='2' fill='#3b82f6' opacity='0.8'>
          <animateMotion dur='2s' repeatCount='indefinite'>
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}
    </g>
  );
}

export default FloatingEdge;
