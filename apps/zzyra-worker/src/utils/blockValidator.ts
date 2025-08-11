// Import removed as BlockType is not used in this file

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

  if (!Array.isArray(nodes)) {
    errors.push({ nodeId: '', message: 'Invalid nodes array provided' });
    return errors;
  }

  if (!handlerRegistry || typeof handlerRegistry !== 'object') {
    errors.push({ nodeId: '', message: 'Invalid handler registry provided' });
    return errors;
  }

  for (const node of nodes) {
    // Validate node structure
    if (!node || typeof node !== 'object') {
      errors.push({ nodeId: '', message: 'Invalid node structure' });
      continue;
    }

    if (!node.id) {
      errors.push({ nodeId: '', message: 'Node missing id' });
      continue;
    }

    // Consistent node type resolution with fallback hierarchy
    const typeKey = resolveNodeType(node);

    if (!typeKey) {
      errors.push({
        nodeId: node.id,
        message:
          'Node missing type. Expected type in node.type, node.data.type, or node.data.blockType',
      });
      continue;
    }

    // Find handler with case-insensitive matching to handle registry inconsistencies
    const handler = findHandlerByType(handlerRegistry, typeKey);

    if (!handler) {
      const availableTypes = Object.keys(handlerRegistry).join(', ');
      errors.push({
        nodeId: node.id,
        message: `No handler for block type: ${typeKey}. Available types: [${availableTypes}]`,
      });
      continue;
    }

    // Validate block configuration if handler supports it
    try {
      if (typeof handler.validateConfig === 'function') {
        const config = node.data?.config || {};
        const configErrors = handler.validateConfig(config, userId);

        if (Array.isArray(configErrors) && configErrors.length > 0) {
          configErrors.forEach((msg) => {
            if (typeof msg === 'string') {
              errors.push({ nodeId: node.id, message: msg });
            }
          });
        }
      }
    } catch (configError) {
      errors.push({
        nodeId: node.id,
        message: `Configuration validation failed: ${configError instanceof Error ? configError.message : String(configError)}`,
      });
    }

    // Validate required node data fields
    if (node.data && typeof node.data === 'object') {
      validateNodeDataStructure(node, errors);
    }
  }

  return errors;
}

/**
 * Resolve node type with consistent fallback hierarchy
 */
function resolveNodeType(node: any): string | null {
  // Priority 1: Explicit type field at node level
  if (node.type && typeof node.type === 'string') {
    return node.type.trim();
  }

  // Priority 2: Type in node data
  if (node.data?.type && typeof node.data.type === 'string') {
    return node.data.type.trim();
  }

  // Priority 3: BlockType in node data (legacy support)
  if (node.data?.blockType && typeof node.data.blockType === 'string') {
    return node.data.blockType.trim();
  }

  // Priority 4: Check for known type patterns in data
  if (
    node.data?.config?.blockType &&
    typeof node.data.config.blockType === 'string'
  ) {
    return node.data.config.blockType.trim();
  }

  return null;
}

/**
 * Find handler by type with case-insensitive matching
 */
function findHandlerByType(
  handlerRegistry: Record<string, any>,
  typeKey: string,
): any {
  // Direct match first
  if (handlerRegistry[typeKey]) {
    return handlerRegistry[typeKey];
  }

  // Case-insensitive match
  const upperTypeKey = typeKey.toUpperCase();
  for (const [registryKey, handler] of Object.entries(handlerRegistry)) {
    if (registryKey.toUpperCase() === upperTypeKey) {
      return handler;
    }
  }

  // Handle common type variations
  const typeVariations = [
    typeKey.replace(/_/g, '-'), // underscore to dash
    typeKey.replace(/-/g, '_'), // dash to underscore
    typeKey.toLowerCase(), // lowercase
    typeKey.toUpperCase(), // uppercase
  ];

  for (const variation of typeVariations) {
    if (handlerRegistry[variation]) {
      return handlerRegistry[variation];
    }
  }

  return null;
}

/**
 * Validate node data structure for common issues
 */
function validateNodeDataStructure(node: any, errors: ValidationError[]): void {
  // Check for required data structure
  if (!node.data.config && !node.data.parameters) {
    // This is just a warning, not an error, as some blocks might not need configuration
    return;
  }

  // Validate config structure if present
  if (node.data.config && typeof node.data.config !== 'object') {
    errors.push({
      nodeId: node.id,
      message: 'Node config must be an object if provided',
    });
  }

  // Validate parameters structure if present
  if (node.data.parameters && typeof node.data.parameters !== 'object') {
    errors.push({
      nodeId: node.id,
      message: 'Node parameters must be an object if provided',
    });
  }
}
