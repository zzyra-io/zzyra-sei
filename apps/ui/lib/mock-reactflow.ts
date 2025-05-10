export interface Node {
  id: string
  type?: string
  position: {
    x: number
    y: number
  }
  data: any
  selected?: boolean
}

export interface Edge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  animated?: boolean
  label?: string
  style?: any
}

// Mock implementation of ReactFlow functions
export const applyNodeChanges = (changes: any[], nodes: Node[]) => {
  return nodes
    .map((node) => {
      const change = changes.find((c) => c.id === node.id)
      if (change) {
        if (change.type === "position" && change.position) {
          return {
            ...node,
            position: change.position,
          }
        }
        if (change.type === "select") {
          return {
            ...node,
            selected: change.selected,
          }
        }
        if (change.type === "remove") {
          return null
        }
      }
      return node
    })
    .filter(Boolean) as Node[]
}

export const applyEdgeChanges = (changes: any[], edges: Edge[]) => {
  return edges
    .map((edge) => {
      const change = changes.find((c) => c.id === edge.id)
      if (change && change.type === "remove") {
        return null
      }
      return edge
    })
    .filter(Boolean) as Edge[]
}

export const addEdge = (params: any, edges: Edge[]) => {
  const newEdge = {
    id: params.id || `edge-${Date.now()}`,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
    type: params.type || "default",
    animated: params.animated,
    label: params.label,
    style: params.style,
  }
  return [...edges, newEdge]
}
