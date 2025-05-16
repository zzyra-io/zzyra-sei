import { useState, useEffect, DependencyList } from 'react';

/**
 * A hook that delays component mounting to prevent race conditions
 * This is useful for components that depend on contexts that may not be immediately available
 *
 * @param delay - Time in milliseconds to delay mounting (default: 0)
 * @param dependencies - Optional array of dependencies that trigger remounting
 * @returns boolean indicating if component should mount
 */
export function useDelayedMount(delay = 0, dependencies: DependencyList = []): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(false);
    
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, delay);

    return () => clearTimeout(timer);
  }, dependencies);

  return isMounted;
}
