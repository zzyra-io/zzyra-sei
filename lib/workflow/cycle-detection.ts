import type { Node, Edge, Connection } from "reactflow"

/**
 * Check if adding a new connection would create a cycle in the graph
 * @param nodes Array of nodes
 * @param edges Array of existing edges
 * @param newConnection The new connection to check
 * @returns True if adding the connection would create a cycle
 */
export function wouldCreateCycle(nodes: Node[], edges: Edge[], newConnection: Connection): boolean {
  // If source or target is not specified, no cycle can be created
  if (!newConnection.source || !newConnection.target) {
    return false
  }

  // If source and target are the same, it's a self-loop - this is a cycle
  if (newConnection.source === newConnection.target) {
    return true
  }

  // Create an adjacency list representation of the graph
  const graph: Record<string, string[]> = {}

  // Initialize empty adjacency list for each node
  nodes.forEach((node) => {
    graph[node.id] = []
  })

  // Add existing edges to the graph
  edges.forEach((edge) => {
    if (edge.source && edge.target) {
      graph[edge.source].push(edge.target)
    }
  })

  // Add the new connection to the graph
  graph[newConnection.source].push(newConnection.target)

  // Set to keep track of visited nodes
  const visited = new Set<string>()
  // Set to keep track of nodes in the current path
  const recursionStack = new Set<string>()

  // Depth-first search to detect cycles
  function dfs(nodeId: string): boolean {
    // If node is already in recursion stack, we found a cycle
    if (recursionStack.has(nodeId)) {
      return true
    }

    // If node is already visited (but not in recursion stack), no cycle found in this path
    if (visited.has(nodeId)) {
      return false
    }

    // Mark node as visited and add to recursion stack
    visited.add(nodeId)
    recursionStack.add(nodeId)

    // Visit all neighbors
    for (const neighbor of graph[nodeId] || []) {
      if (dfs(neighbor)) {
        return true
      }
    }

    // Remove node from recursion stack (backtrack)
    recursionStack.delete(nodeId)
    return false
  }

  // Start DFS from the source node of the new connection
  return dfs(newConnection.source)
}
