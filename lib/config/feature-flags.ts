"use client";

/**
 * Feature flags configuration for Zyra
 * Enables gradual rollout of production optimizations
 */

// Helper functions for checking feature availability
const isEnabled = (flag: string): boolean => {
  if (typeof window === 'undefined') {
    // Server-side - use environment variables
    return process.env[`NEXT_PUBLIC_FEATURE_${flag}`] === 'true';
  }
  
  // Client-side - check localstorage for overrides first
  const override = localStorage.getItem(`feature_${flag.toLowerCase()}`);
  if (override !== null) {
    return override === 'true';
  }
  
  // Fall back to environment variables
  return process.env[`NEXT_PUBLIC_FEATURE_${flag}`] === 'true';
};

/**
 * Feature flags for the workflow builder optimization
 */
export const WorkflowFeatures = {
  // Use optimized workflow store structure
  OPTIMIZED_STORE: isEnabled('OPTIMIZED_STORE'),
  
  // Use optimized flow canvas component
  OPTIMIZED_CANVAS: isEnabled('OPTIMIZED_CANVAS'),
  
  // Enable enhanced error handling
  ENHANCED_ERROR_HANDLING: isEnabled('ENHANCED_ERROR_HANDLING'),
  
  // Enable performance monitoring
  PERFORMANCE_MONITORING: isEnabled('PERFORMANCE_MONITORING'),
  
  // Enable optimized validation
  ENHANCED_VALIDATION: isEnabled('ENHANCED_VALIDATION'),
};

/**
 * Override a feature flag for testing
 * This only affects the current browser session
 */
export const overrideFeature = (feature: string, enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(`feature_${feature.toLowerCase()}`, enabled ? 'true' : 'false');
  
  // Optional - refresh the page to ensure all components pick up the change
  // window.location.reload();
};
