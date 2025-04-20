import { type EdgeProps, getBezierPath } from "reactflow"

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
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <path
      id={id}
      style={{
        ...style,
        strokeWidth: 2,
        stroke: style.stroke || "#10b981",
      }}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
    />
  )
}
