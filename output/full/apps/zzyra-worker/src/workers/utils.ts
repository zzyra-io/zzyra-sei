export function safeSerialize(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  const seen = new WeakSet();

  const replacer = (key: string, value: any): any => {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'symbol') return value.toString();
      if (typeof value === 'bigint') return value.toString() + 'n';
      return value;
    }
    if (seen.has(value)) return '[Circular Reference]';
    seen.add(value);
    if (Array.isArray(value))
      return value.map((item, index) => replacer(String(index), item));
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Error)
      return { name: value.name, message: value.message, stack: value.stack };
    if (value instanceof Map) return Object.fromEntries(value.entries());
    if (value instanceof Set) return Array.from(value);
    if (value instanceof RegExp) return value.toString();
    return value;
  };

  try {
    return JSON.parse(JSON.stringify(obj, replacer));
  } catch (err) {
    return createSimplifiedObject(obj);
  }
}

export function createSimplifiedObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object')
    return {
      type: typeof obj,
      value:
        String(obj).substring(0, 100) + (String(obj).length > 100 ? '...' : ''),
    };
  if (Array.isArray(obj))
    return {
      type: 'array',
      length: obj.length,
      sample: obj
        .slice(0, 5)
        .map((item) =>
          typeof item === 'object' && item !== null
            ? { type: item.constructor ? item.constructor.name : 'Object' }
            : item,
        ),
    };

  const keys = Object.keys(obj);
  const simplified: Record<string, any> = {
    type: obj.constructor ? obj.constructor.name : 'Object',
    keyCount: keys.length,
  };
  if (keys.length > 0) {
    simplified.properties = {};
    keys.slice(0, 10).forEach((key) => {
      try {
        const value = obj[key];
        simplified.properties[key] =
          typeof value !== 'object' || value === null
            ? value
            : { type: value.constructor ? value.constructor.name : 'Object' };
      } catch {
        simplified.properties[key] = '[Error accessing property]';
      }
    });
  }
  return simplified;
}
