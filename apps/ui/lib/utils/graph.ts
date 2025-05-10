import { Node, Edge } from 'reactflow';

// Detect cycles using DFS
export function validateAcyclic(nodes: Node[], edges: Edge[]): void {
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
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

  nodes.forEach(n => dfs(n.id));
}

// Topological sort (Kahn's algorithm)
export function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target as string);
    inDegree.set(e.target as string, (inDegree.get(e.target as string) || 0) + 1);
  });
  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });
  const sorted: Node[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    sorted.push(nodes.find(n => n.id === id)!);
    (adj.get(id) || []).forEach(nxt => {
      inDegree.set(nxt, (inDegree.get(nxt) || 0) - 1);
      if (inDegree.get(nxt) === 0) queue.push(nxt);
    });
  }
  if (sorted.length !== nodes.length) throw new Error('Cycle detected or orphan nodes exist');
  return sorted;
}

// Ensure every non-trigger node has at least one incoming edge
export function validateOrphans(nodes: Node[], edges: Edge[]): void {
  const hasIncoming = new Set(edges.map(e => e.target as string));
  nodes.forEach(n => {
    if (!hasIncoming.has(n.id) && edges.some(e => e.source === n.id)) {
      // it's a source node, allowed
    } else if (!hasIncoming.has(n.id) && !edges.some(e => e.source === n.id)) {
      throw new Error(`Orphan node detected: ${n.id}`);
    }
  });
}

// Ensure terminal nodes are action blocks (no outgoing, must be action)
import { BlockType } from '@/types/workflow';
import { BlockType } from '@zyra/types';

export function validateTerminals(nodes: Node[], edges: Edge[]): void {
  const hasOutgoing = new Set(edges.map(e => e.source));
  nodes.forEach(n => {
    if (!hasOutgoing.has(n.id)) {
      const cfg = (n.data as any).config || n.data;
      const type = (n.data as any).blockType;
      if (![BlockType.EMAIL, BlockType.TRANSACTION, BlockType.DATABASE, BlockType.NOTIFICATION].includes(type)) {
        throw new Error(`Terminal node ${n.id} is not an action block`);
      }
    }
  });
}
