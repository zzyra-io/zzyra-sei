/**
 * @zyra/wallet - Environment Utilities
 * 
 * This file contains utilities for detecting and handling different environments (browser vs Node.js).
 */

/**
 * Check if running in browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if running in Node.js environment
 */
export const isNode = !isBrowser;

/**
 * Get the current environment
 */
export function getEnvironment(): 'browser' | 'node' {
  return isBrowser ? 'browser' : 'node';
}

/**
 * Dynamically import the appropriate module based on environment
 * 
 * @param browserModule Function that returns browser implementation
 * @param nodeModule Function that returns Node.js implementation
 * @returns The appropriate implementation for the current environment
 */
export async function getImplementation<T>(
  browserModule: () => Promise<T>,
  nodeModule: () => Promise<T>
): Promise<T> {
  if (isBrowser) {
    return browserModule();
  } else {
    return nodeModule();
  }
}
