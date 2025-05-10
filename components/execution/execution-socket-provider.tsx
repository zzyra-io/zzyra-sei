"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ExecutionStatus } from '@/hooks/use-workflow-execution';
import { useToast } from '@/components/ui/use-toast';

// Environment variables should be properly configured in production
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a context for execution status
type ExecutionContextType = {
  executionStatus: Record<string, ExecutionStatus>;
  isConnected: boolean;
  subscribedExecutions: string[];
  subscribeToExecution: (executionId: string) => void;
  unsubscribeFromExecution: (executionId: string) => void;
};

const ExecutionContext = createContext<ExecutionContextType>({
  executionStatus: {},
  isConnected: false,
  subscribedExecutions: [],
  subscribeToExecution: () => {},
  unsubscribeFromExecution: () => {},
});

export const useExecutionSocket = () => useContext(ExecutionContext);

export function ExecutionSocketProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  const [isConnected, setIsConnected] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<Record<string, ExecutionStatus>>({});
  const [subscribedExecutions, setSubscribedExecutions] = useState<string[]>([]);
  const { toast } = useToast();

  // Handle connection setup
  useEffect(() => {
    // Initialize Supabase realtime
    const setupRealtime = async () => {
      try {
        // Enable realtime
        await supabase.realtime.setAuth(SUPABASE_ANON_KEY);
        await supabase.realtime.connect();
        setIsConnected(true);
        console.log('Supabase realtime connection established');
      } catch (error) {
        console.error('Error connecting to Supabase realtime:', error);
        setIsConnected(false);
        toast({
          title: 'Connection Error',
          description: 'Could not connect to execution status service',
          variant: 'destructive',
        });
      }
    };

    setupRealtime();

    // Cleanup on unmount
    return () => {
      supabase.realtime.disconnect();
      console.log('Supabase realtime connection closed');
    };
  }, [supabase, toast]);

  // Subscribe to a specific execution
  const subscribeToExecution = (executionId: string) => {
    if (!executionId || subscribedExecutions.includes(executionId)) return;
    
    console.log(`Subscribing to execution updates for ID: ${executionId}`);
    
    // Add to tracked subscriptions
    setSubscribedExecutions(prev => [...prev, executionId]);
    
    // Subscribe to the workflow_executions table for this execution
    const channel = supabase
      .channel(`execution-${executionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_executions',
          filter: `id=eq.${executionId}`,
        },
        (payload) => {
          console.log(`Received execution update for ${executionId}:`, payload);
          const newStatus = payload.new as unknown as ExecutionStatus;
          
          setExecutionStatus(prev => ({
            ...prev,
            [executionId]: newStatus,
          }));
          
          // If execution is complete, unsubscribe
          if (['completed', 'failed'].includes(newStatus.status)) {
            setTimeout(() => unsubscribeFromExecution(executionId), 10000); // Unsubscribe after 10 seconds
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for execution ${executionId}:`, status);
      });
      
    // Store channel for cleanup
    return () => {
      channel.unsubscribe();
    };
  };

  // Unsubscribe from a specific execution
  const unsubscribeFromExecution = (executionId: string) => {
    if (!executionId) return;
    
    console.log(`Unsubscribing from execution updates for ID: ${executionId}`);
    
    // Remove from subscription list
    setSubscribedExecutions(prev => prev.filter(id => id !== executionId));
    
    // Unsubscribe from channel
    supabase.channel(`execution-${executionId}`).unsubscribe();
  };

  // Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      subscribedExecutions.forEach(id => {
        supabase.channel(`execution-${id}`).unsubscribe();
      });
    };
  }, [subscribedExecutions, supabase]);

  return (
    <ExecutionContext.Provider 
      value={{ 
        executionStatus, 
        isConnected, 
        subscribedExecutions,
        subscribeToExecution, 
        unsubscribeFromExecution 
      }}
    >
      {children}
    </ExecutionContext.Provider>
  );
}
