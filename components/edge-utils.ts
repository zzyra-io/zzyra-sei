import {
  Position,
  internalsSymbol,
  type Node,
  type XYPosition,
  type Edge,
} from "reactflow";

// Helper function to get the center of a node
export function getNodeCenter(node: Node): XYPosition {
  if (!node) return { x: 0, y: 0 };

  const nodeWidth = node.width || 0;
  const nodeHeight = node.height || 0;

  return {
    x: node.position.x + nodeWidth / 2,
    y: node.position.y + nodeHeight / 2,
  };
}

// Helper function to get the position on the node based on the handle position
export function getHandlePosition(node: Node, handleId: string): XYPosition {
  if (!node || !handleId) return getNodeCenter(node);

  // If we're in a browser environment
  if (typeof document !== "undefined") {
    const nodeElement = document.querySelector(
      `.react-flow__node[data-id="${node.id}"]`
    );
    if (!nodeElement) return getNodeCenter(node);

    const handleElement = nodeElement.querySelector(
      `.react-flow__handle[data-handleid="${handleId}"]`
    );
    if (!handleElement) return getNodeCenter(node);

    const nodeRect = nodeElement.getBoundingClientRect();
    const handleRect = handleElement.getBoundingClientRect();

    return {
      x:
        node.position.x +
        (handleRect.left - nodeRect.left) +
        handleRect.width / 2,
      y:
        node.position.y +
        (handleRect.top - nodeRect.top) +
        handleRect.height / 2,
    };
  }

  // Fallback for SSR or when elements aren't available
  return getNodeCenter(node);
}

// Helper function to get the position on the node based on the side
export function getNodePositionOnSide(node: Node, side: Position): XYPosition {
  if (!node) return { x: 0, y: 0 };

  const nodeWidth = node.width || 0;
  const nodeHeight = node.height || 0;

  switch (side) {
    case Position.Top:
      return { x: node.position.x + nodeWidth / 2, y: node.position.y };
    case Position.Right:
      return {
        x: node.position.x + nodeWidth,
        y: node.position.y + nodeHeight / 2,
      };
    case Position.Bottom:
      return {
        x: node.position.x + nodeWidth / 2,
        y: node.position.y + nodeHeight,
      };
    case Position.Left:
      return { x: node.position.x, y: node.position.y + nodeHeight / 2 };
    default:
      return getNodeCenter(node);
  }
}

// Helper function to determine the best side for an edge to connect to
export function getBestSidePosition(
  sourceNode: Node,
  targetNode: Node
): {
  sourcePosition: Position;
  targetPosition: Position;
  sourcePos: XYPosition;
  targetPos: XYPosition;
} {
  if (!sourceNode || !targetNode) {
    return {
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      sourcePos: { x: 0, y: 0 },
      targetPos: { x: 0, y: 0 },
    };
  }

  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  let sourcePosition: Position;
  let targetPosition: Position;

  // Determine if the connection is more horizontal or vertical
  if (Math.abs(dx) > Math.abs(dy)) {
    // More horizontal
    if (dx > 0) {
      sourcePosition = Position.Right;
      targetPosition = Position.Left;
    } else {
      sourcePosition = Position.Left;
      targetPosition = Position.Right;
    }
  } else {
    // More vertical
    if (dy > 0) {
      sourcePosition = Position.Bottom;
      targetPosition = Position.Top;
    } else {
      sourcePosition = Position.Top;
      targetPosition = Position.Bottom;
    }
  }

  const sourcePos = getNodePositionOnSide(sourceNode, sourcePosition);
  const targetPos = getNodePositionOnSide(targetNode, targetPosition);

  return { sourcePosition, targetPosition, sourcePos, targetPos };
}

// Helper function to get control points for a bezier curve
export function getBezierControlPoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position
): [number, number, number, number] {
  // Calculate the distance between source and target
  const deltaX = Math.abs(targetX - sourceX);
  const deltaY = Math.abs(targetY - sourceY);

  // Adjust control point distance based on the total distance
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const controlPointDistance = Math.min(distance * 0.5, 150); // Cap at 150px

  // Set control point offsets based on handle positions
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

  return [
    sourceX + sourceOffsetX,
    sourceY + sourceOffsetY,
    targetX + targetOffsetX,
    targetY + targetOffsetY,
  ];
}

// Helper function to get path for different edge types
export function getEdgePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  type: "default" | "straight" | "step" | "smoothstep" | "floating" = "default",
  controlPoints?: { x: number; y: number }[]
): string {
  // For straight lines, just connect the points directly
  if (type === "straight") {
    return `M${sourceX},${sourceY} L${targetX},${targetY}`;
  }

  // For step edges, create a path with right angles
  if (type === "step") {
    const midX = (sourceX + targetX) / 2;

    // Handle special cases for different handle positions
    if (
      (sourcePosition === Position.Left && targetPosition === Position.Right) ||
      (sourcePosition === Position.Right && targetPosition === Position.Left)
    ) {
      return `M${sourceX},${sourceY} L${midX},${sourceY} L${midX},${targetY} L${targetX},${targetY}`;
    }

    if (
      (sourcePosition === Position.Top && targetPosition === Position.Bottom) ||
      (sourcePosition === Position.Bottom && targetPosition === Position.Top)
    ) {
      return `M${sourceX},${sourceY} L${sourceX},${
        (sourceY + targetY) / 2
      } L${targetX},${(sourceY + targetY) / 2} L${targetX},${targetY}`;
    }

    // Handle mixed orientations
    if (
      (sourcePosition === Position.Left || sourcePosition === Position.Right) &&
      (targetPosition === Position.Top || targetPosition === Position.Bottom)
    ) {
      return `M${sourceX},${sourceY} L${targetX},${sourceY} L${targetX},${targetY}`;
    }

    if (
      (sourcePosition === Position.Top || sourcePosition === Position.Bottom) &&
      (targetPosition === Position.Left || targetPosition === Position.Right)
    ) {
      return `M${sourceX},${sourceY} L${sourceX},${targetY} L${targetX},${targetY}`;
    }

    // Default step path
    return `M${sourceX},${sourceY} L${midX},${sourceY} L${midX},${targetY} L${targetX},${targetY}`;
  }

  // For smoothstep edges, create a path with smooth corners
  if (type === "smoothstep") {
    const offset =
      Math.min(Math.abs(targetX - sourceX), Math.abs(targetY - sourceY)) * 0.5;
    const cornerRadius = Math.min(offset, 50); // Cap corner radius at 50px

    // Handle horizontal case
    if (
      (sourcePosition === Position.Left && targetPosition === Position.Right) ||
      (sourcePosition === Position.Right && targetPosition === Position.Left)
    ) {
      const midX = (sourceX + targetX) / 2;
      return `M${sourceX},${sourceY} 
              L${midX - cornerRadius},${sourceY} 
              Q${midX},${sourceY} ${midX},${sourceY + cornerRadius} 
              L${midX},${targetY - cornerRadius} 
              Q${midX},${targetY} ${midX + cornerRadius},${targetY} 
              L${targetX},${targetY}`;
    }

    // Handle vertical case
    if (
      (sourcePosition === Position.Top && targetPosition === Position.Bottom) ||
      (sourcePosition === Position.Bottom && targetPosition === Position.Top)
    ) {
      const midY = (sourceY + targetY) / 2;
      return `M${sourceX},${sourceY} 
              L${sourceX},${midY - cornerRadius} 
              Q${sourceX},${midY} ${sourceX + cornerRadius},${midY} 
              L${targetX - cornerRadius},${midY} 
              Q${targetX},${midY} ${targetX},${midY + cornerRadius} 
              L${targetX},${targetY}`;
    }

    // Handle mixed orientations with smooth corners
    if (
      (sourcePosition === Position.Left || sourcePosition === Position.Right) &&
      (targetPosition === Position.Top || targetPosition === Position.Bottom)
    ) {
      return `M${sourceX},${sourceY} 
              L${targetX - cornerRadius},${sourceY} 
              Q${targetX},${sourceY} ${targetX},${sourceY + cornerRadius} 
              L${targetX},${targetY}`;
    }

    if (
      (sourcePosition === Position.Top || sourcePosition === Position.Bottom) &&
      (targetPosition === Position.Left || targetPosition === Position.Right)
    ) {
      return `M${sourceX},${sourceY} 
              L${sourceX},${targetY - cornerRadius} 
              Q${sourceX},${targetY} ${sourceX + cornerRadius},${targetY} 
              L${targetX},${targetY}`;
    }

    // Default smoothstep path
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    return `M${sourceX},${sourceY} 
            C${sourceX},${sourceY + offset} ${
      midX - offset
    },${midY} ${midX},${midY} 
            C${midX + offset},${midY} ${targetX},${
      targetY - offset
    } ${targetX},${targetY}`;
  }

  // For custom bezier with control points
  if (type === "default" && controlPoints && controlPoints.length >= 2) {
    return `M${sourceX},${sourceY} C${controlPoints[0].x},${controlPoints[0].y} ${controlPoints[1].x},${controlPoints[1].y} ${targetX},${targetY}`;
  }

  // Default bezier curve
  const [sourceControlX, sourceControlY, targetControlX, targetControlY] =
    getBezierControlPoints(
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition
    );

  return `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`;
}

// Helper function to calculate the position of a point along a path
export function getPointOnPath(path: string, offset: number): XYPosition {
  if (typeof document === "undefined") return { x: 0, y: 0 };

  try {
    const tempPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    tempPath.setAttribute("d", path);

    const length = tempPath.getTotalLength();
    if (isNaN(length) || length === 0) {
      return { x: 0, y: 0 };
    }

    const point = tempPath.getPointAtLength(offset * length);
    return { x: point.x, y: point.y };
  } catch (error) {
    console.error("Error calculating point on path:", error);
    return { x: 0, y: 0 };
  }
}

// Helper function to calculate the position of a control point
export function getControlPoint(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offset = 0.5
): XYPosition {
  return {
    x: sourceX + (targetX - sourceX) * offset,
    y: sourceY + (targetY - sourceY) * offset,
  };
}

// Helper function to calculate the distance between two points
export function getDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Helper function to check if a point is near a path
export function isPointNearPath(
  x: number,
  y: number,
  path: string,
  threshold = 10
): boolean {
  if (typeof document === "undefined") return false;

  try {
    const tempPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    tempPath.setAttribute("d", path);

    const length = tempPath.getTotalLength();
    if (isNaN(length) || length === 0) {
      return false;
    }

    // Check multiple points along the path
    const steps = Math.max(10, Math.floor(length / 10));
    for (let i = 0; i <= steps; i++) {
      const point = tempPath.getPointAtLength((i / steps) * length);
      const distance = getDistance(x, y, point.x, point.y);
      if (distance <= threshold) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking if point is near path:", error);
    return false;
  }
}

// Helper function to get the closest edge to a point
export function getClosestEdge(
  x: number,
  y: number,
  edges: Edge[],
  edgePaths: Record<string, string>,
  threshold = 10
): Edge | null {
  let closestEdge: Edge | null = null;
  let minDistance = threshold;

  edges.forEach((edge) => {
    const path = edgePaths[edge.id];
    if (!path) return;

    try {
      const tempPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      tempPath.setAttribute("d", path);

      const length = tempPath.getTotalLength();
      if (isNaN(length) || length === 0) {
        return;
      }

      // Check multiple points along the path
      const steps = Math.max(10, Math.floor(length / 10));
      for (let i = 0; i <= steps; i++) {
        const point = tempPath.getPointAtLength((i / steps) * length);
        const distance = getDistance(x, y, point.x, point.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestEdge = edge;
        }
      }
    } catch (error) {
      console.error("Error finding closest edge:", error);
    }
  });

  return closestEdge;
}

// Helper function to get the tangent at a point on a path
export function getTangentAtPoint(
  path: string,
  offset: number
): { x: number; y: number } {
  if (typeof document === "undefined") return { x: 0, y: 0 };

  try {
    const tempPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    tempPath.setAttribute("d", path);

    const length = tempPath.getTotalLength();
    if (isNaN(length) || length === 0) {
      return { x: 0, y: 0 };
    }

    const pointPos = offset * length;
    const point1 = tempPath.getPointAtLength(Math.max(0, pointPos - 0.1));
    const point2 = tempPath.getPointAtLength(Math.min(length, pointPos + 0.1));

    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const mag = Math.sqrt(dx * dx + dy * dy);

    return {
      x: dx / mag,
      y: dy / mag,
    };
  } catch (error) {
    console.error("Error calculating tangent:", error);
    return { x: 0, y: 0 };
  }
}
