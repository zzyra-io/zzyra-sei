import { Node, Edge } from 'reactflow';

// Detect cycles using DFS
export function validateAcyclic(nodes: Node[], edges: Edge[]): void {
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    adj.get(e.source)?.push(e.target as string);
  });
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(id: string) {
    if (stack.has(id)) throw new Error(`Cycle detected at node ${id}`);
    if (visited.has(id)) return;
    visited.add(id);
    stack.add(id);
    (adj.get(id) || []).forEach(dfs);
    stack.delete(id);
  }

  nodes.forEach((n) => dfs(n.id));
}

// Topological sort (Kahn's algorithm)
export function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });
  edges.forEach((e) => {
    adj.get(e.source)?.push(e.target as string);
    inDegree.set(
      e.target as string,
      (inDegree.get(e.target as string) || 0) + 1,
    );
  });
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });
  const sorted: Node[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    sorted.push(nodes.find((n) => n.id === id)!);
    (adj.get(id) || []).forEach((nxt) => {
      inDegree.set(nxt, (inDegree.get(nxt) || 0) - 1);
      if (inDegree.get(nxt) === 0) queue.push(nxt);
    });
  }
  if (sorted.length !== nodes.length)
    throw new Error('Cycle detected or orphan nodes exist');
  return sorted;
}

// Ensure every node is properly connected (no orphan nodes)
export function validateOrphans(nodes: Node[], edges: Edge[]): void {
  // For single node workflows, no orphan validation needed
  if (nodes.length <= 1) {
    return;
  }

  const hasIncoming = new Set(edges.map((e) => e.target as string));
  const hasOutgoing = new Set(edges.map((e) => e.source as string));

  nodes.forEach((n) => {
    const hasIncomingEdge = hasIncoming.has(n.id);
    const hasOutgoingEdge = hasOutgoing.has(n.id);

    // A node is orphan if it has neither incoming nor outgoing connections
    // in a multi-node workflow
    if (!hasIncomingEdge && !hasOutgoingEdge) {
      throw new Error(
        `Orphan node detected: ${n.id} - Node has no connections`,
      );
    }
  });
}

// Ensure terminal nodes are action blocks (no outgoing, must be action)
import { NodeCategory, BLOCK_CATALOG, getBlockType } from '@zyra/types';

// Configurable set of allowed categories for terminal nodes (comma-separated env var)
const TERMINAL_ALLOWED_CATEGORIES: Set<NodeCategory> = new Set(
  (
    process.env.TERMINAL_ALLOWED_CATEGORIES ??
    `${NodeCategory.ACTION},${NodeCategory.TRIGGER}`
  )
    .split(',')
    .map((c) => c.trim() as NodeCategory),
);
export function validateTerminals(nodes: Node[], edges: Edge[]): void {
  const hasOutgoing = new Set(edges.map((e) => e.source));
  nodes.forEach((n) => {
    if (!hasOutgoing.has(n.id)) {
      console.log('Terminal node detected:', n.id, n);

      // First try to get category from block type
      const type = getBlockType(n.data as any);
      const category = BLOCK_CATALOG[type]?.category;

      // If category is valid from block type, allow it
      if (category && TERMINAL_ALLOWED_CATEGORIES.has(category)) {
        return;
      }

      // If block type category check failed, try nodeType
      if (n.data?.nodeType) {
        // Convert nodeType to uppercase for comparison
        const nodeTypeCategory = n.data.nodeType.toUpperCase() as NodeCategory;
        // Convert allowed categories to uppercase when comparing
        const allowedCategoriesUpper = Array.from(
          TERMINAL_ALLOWED_CATEGORIES,
        ).map((cat) => (typeof cat === 'string' ? cat.toUpperCase() : cat));

        if (allowedCategoriesUpper.includes(nodeTypeCategory)) {
          return; // Node type is valid, allow it
        }
      }

      // If both checks failed, throw error
      throw new Error(
        `Terminal node ${n.id} is not an allowed terminal block type. Only ${Array.from(TERMINAL_ALLOWED_CATEGORIES).join(', ')} categories are allowed as terminal nodes.`,
      );
    }
  });
}
