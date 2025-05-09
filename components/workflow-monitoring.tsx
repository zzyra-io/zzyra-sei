"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

/**
 * Workflow Performance Tracking Component
 * Monitors and reports on performance metrics for the workflow builder
 */
export function WorkflowPerformanceMonitor() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<{
    renderTime: number;
    nodeCount: number;
    edgeCount: number;
    memoryUsage: number | null;
  }>({
    renderTime: 0,
    nodeCount: 0,
    edgeCount: 0,
    memoryUsage: null,
  });

  // Only track detailed metrics in development
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!isDev) return;

    // Setup performance observer
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      // Filter for slow renders (> 100ms)
      const slowRenders = entries.filter(
        (entry) => entry.duration > 100 && entry.name.includes("render")
      );
      
      if (slowRenders.length > 0) {
        const longestRender = slowRenders.reduce(
          (longest, entry) => (entry.duration > longest.duration ? entry : longest),
          slowRenders[0]
        );
        
        console.warn(
          `[Performance Warning] Slow render detected: ${longestRender.name} took ${longestRender.duration.toFixed(2)}ms`
        );
        
        // Update metric state
        setMetrics((prev) => ({
          ...prev,
          renderTime: longestRender.duration,
        }));
      }
    });

    // Start observing render performance
    observer.observe({ entryTypes: ["measure"] });

    // Track memory usage if available
    const memoryInterval = setInterval(() => {
      if (window.performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        setMetrics((prev) => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / (1024 * 1024)),
        }));
        
        // Warn about high memory usage
        if (memory.usedJSHeapSize > 0.8 * memory.jsHeapSizeLimit) {
          toast({
            title: "High Memory Usage",
            description: "Consider saving and refreshing the page",
            variant: "destructive",
          });
        }
      }
    }, 10000);

    return () => {
      observer.disconnect();
      clearInterval(memoryInterval);
    };
  }, [isDev, toast]);

  // Don't render anything in production
  if (!isDev) return null;

  return (
    <div className="fixed bottom-2 right-2 bg-black/80 text-white text-xs p-2 rounded-md z-50 pointer-events-none opacity-70">
      <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
      {metrics.memoryUsage && <div>Memory: {metrics.memoryUsage}MB</div>}
    </div>
  );
}

/**
 * Error tracking component for workflow builder
 */
export function WorkflowErrorBoundary({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { toast } = useToast();
  const [hasError, setHasError] = useState(false);

  // Create error handler
  useEffect(() => {
    // Global error handler
    const errorHandler = (event: ErrorEvent) => {
      console.error("Workflow Error:", event.error);
      
      // Show user-friendly error toast
      toast({
        title: "Something went wrong",
        description: "An error occurred in the workflow builder. Your work has been saved automatically.",
        variant: "destructive",
      });
      
      setHasError(true);
      
      // Prevent the default error handler
      event.preventDefault();
    };

    // Monitor unhandled errors
    window.addEventListener("error", errorHandler);
    
    return () => {
      window.removeEventListener("error", errorHandler);
    };
  }, [toast]);

  // Provide recovery option if error occurs
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Something went wrong
          </h2>
          <p className="mb-6 text-slate-600">
            An error occurred in the workflow builder. Don't worry, your work has been saved automatically.
          </p>
          <button
            onClick={() => {
              // Reset error state
              setHasError(false);
              
              // Force refresh if needed
              if (window.location.href.includes("?")) {
                window.location.href = window.location.href;
              } else {
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Reload the builder
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
