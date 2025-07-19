import { useCallback } from 'react';
import { useWorkflowExecution, BlockExecutionState, LogLevel } from '@/components/workflow/BlockExecutionMonitor';

export interface UseBlockExecutionProps {
  blockId: string;
  blockType: string;
  blockName: string;
}

export function useBlockExecution({ blockId, blockType, blockName }: UseBlockExecutionProps) {
  const { execution, updateBlockState, addLog } = useWorkflowExecution();
  
  const currentBlock = execution?.blocks[blockId];

  // Update block state
  const updateState = useCallback((state: BlockExecutionState, metadata?: any) => {
    updateBlockState(blockId, {
      blockId,
      blockType,
      blockName,
      state,
      ...metadata,
      ...(state === 'running' && { startTime: new Date().toISOString() }),
      ...(state === 'success' || state === 'error' || state === 'warning') && { 
        endTime: new Date().toISOString(),
        duration: metadata?.startTime ? 
          new Date().getTime() - new Date(metadata.startTime).getTime() : 
          undefined
      }
    });
  }, [blockId, blockType, blockName, updateBlockState]);

  // Log a message
  const log = useCallback((level: LogLevel, message: string, data?: any) => {
    addLog({
      level,
      message,
      blockId,
      blockType,
      data,
    });
  }, [addLog, blockId, blockType]);

  // Helper functions for common patterns
  const startExecution = useCallback((inputData?: any) => {
    updateState('running');
    log('info', `Starting ${blockType} execution`, inputData);
  }, [updateState, log, blockType]);

  const completeExecution = useCallback((outputData?: any) => {
    updateState('success', { outputData });
    log('info', `${blockType} execution completed`, outputData);
  }, [updateState, log, blockType]);

  const failExecution = useCallback((error: string, errorData?: any) => {
    updateState('error', { error });
    log('error', `${blockType} execution failed: ${error}`, errorData);
  }, [updateState, log, blockType]);

  const warnExecution = useCallback((warning: string, warningData?: any) => {
    updateState('warning');
    log('warn', `${blockType} warning: ${warning}`, warningData);
  }, [updateState, log, blockType]);

  // Set input data
  const setInputData = useCallback((inputData: any) => {
    updateBlockState(blockId, { inputData });
    log('debug', 'Input data received', inputData);
  }, [blockId, updateBlockState, log]);

  // Set output data
  const setOutputData = useCallback((outputData: any) => {
    updateBlockState(blockId, { outputData });
    log('debug', 'Output data generated', outputData);
  }, [blockId, updateBlockState, log]);

  return {
    // Current state
    currentState: currentBlock?.state || 'idle',
    currentBlock,
    
    // State management
    updateState,
    startExecution,
    completeExecution,
    failExecution,
    warnExecution,
    
    // Data management
    setInputData,
    setOutputData,
    
    // Logging
    log,
    
    // Utility
    isRunning: currentBlock?.state === 'running',
    isComplete: currentBlock?.state === 'success',
    hasError: currentBlock?.state === 'error',
    hasWarning: currentBlock?.state === 'warning',
  };
}

// Example usage for HTTP Request block
export function useHttpRequestExecution(blockId: string) {
  const execution = useBlockExecution({
    blockId,
    blockType: 'HTTP Request',
    blockName: `HTTP Request ${blockId}`,
  });

  const executeHttpRequest = useCallback(async (config: any) => {
    try {
      execution.startExecution(config);
      
      // Log the request details
      execution.log('info', `Making ${config.method} request to ${config.url}`);
      
      // Simulate HTTP request
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      execution.setOutputData({
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: data,
        url: config.url,
        method: config.method,
        timestamp: new Date().toISOString(),
        success: true,
      });

      execution.completeExecution();
      
    } catch (error) {
      execution.failExecution(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [execution]);

  return {
    ...execution,
    executeHttpRequest,
  };
}

// Example usage for Database block
export function useDatabaseExecution(blockId: string) {
  const execution = useBlockExecution({
    blockId,
    blockType: 'Database',
    blockName: `Database ${blockId}`,
  });

  const executeQuery = useCallback(async (query: string, params?: any[]) => {
    try {
      execution.startExecution({ query, params });
      
      execution.log('info', `Executing query: ${query}`);
      
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockResult = {
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
        fields: ['id', 'name'],
      };
      
      execution.setOutputData(mockResult);
      execution.completeExecution();
      
    } catch (error) {
      execution.failExecution(error instanceof Error ? error.message : 'Query failed');
    }
  }, [execution]);

  return {
    ...execution,
    executeQuery,
  };
}

// Example usage for AI/LLM block
export function useAIExecution(blockId: string) {
  const execution = useBlockExecution({
    blockId,
    blockType: 'AI Assistant',
    blockName: `AI Assistant ${blockId}`,
  });

  const generateResponse = useCallback(async (prompt: string, model?: string) => {
    try {
      execution.startExecution({ prompt, model });
      
      execution.log('info', `Generating response using ${model || 'default'} model`);
      
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResponse = {
        response: "This is a mock AI response",
        model: model || 'gpt-3.5-turbo',
        tokens: 150,
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150,
        },
      };
      
      execution.setOutputData(mockResponse);
      execution.completeExecution();
      
    } catch (error) {
      execution.failExecution(error instanceof Error ? error.message : 'AI generation failed');
    }
  }, [execution]);

  return {
    ...execution,
    generateResponse,
  };
}