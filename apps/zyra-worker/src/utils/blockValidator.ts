
import { BlockType } from '@zyra/types';


export interface ValidationError {
  nodeId: string;
  message: string;
}

export function validateWorkflowDefinition(
  nodes: any[],
  handlerRegistry: Record<string, any>,
  userId: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const node of nodes) {
    // Identify node type: support data.type, data.blockType, or top-level type
    const typeKey = node.data?.type ?? node.data?.blockType ?? node.type;
    if (!node.id) {
      errors.push({ nodeId: '', message: 'Node missing id' });
      continue;
    }
    if (!typeKey) {
      console.log('Node missing type:', JSON.stringify(node));
      errors.push({ nodeId: node.id, message: 'Node missing type' });
      continue;
    }
    console.log('typeKey', typeKey, 'for node', node.id, 'data:', JSON.stringify(node.data));
    const handler = handlerRegistry[typeKey];
    if (!handler) {
      errors.push({
        nodeId: node.id,
        message: `No handler for block type: ${typeKey}`,
      });
      continue;
    }
    // Optional: per-block config validation
    if (typeof handler.validateConfig === 'function') {
      const configErrors = handler.validateConfig(
        node.data?.config || {},
        userId,
      );
      if (configErrors.length) {
        configErrors.forEach((msg) =>
          errors.push({ nodeId: node.id, message: msg }),
        );
      }
    }
    // Optional: permission checks
    // if (!userHasPermission(userId, node)) {
    //   errors.push({ nodeId: node.id, message: 'User lacks permission for this block' });
    // }
  }
  return errors;
}
