import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkflowExecutionProvider } from './BlockExecutionMonitor';
import { WorkflowExecutionPanel } from './WorkflowExecutionPanel';
import { useHttpRequestExecution, useDatabaseExecution, useAIExecution } from '@/hooks/useBlockExecution';

// Example workflow with multiple block types
function ExampleWorkflow() {
  const httpBlock = useHttpRequestExecution('http-1');
  const dbBlock = useDatabaseExecution('db-1');
  const aiBlock = useAIExecution('ai-1');

  const runWorkflow = async () => {
    try {
      // Step 1: HTTP Request
      await httpBlock.executeHttpRequest({
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      // Step 2: Database operation (simulate storing the data)
      await dbBlock.executeQuery(
        'INSERT INTO posts (title, body) VALUES ($1, $2)',
        ['Sample Title', 'Sample Body']
      );

      // Step 3: AI processing
      await aiBlock.generateResponse(
        'Analyze this data and provide insights',
        'gpt-3.5-turbo'
      );

    } catch (error) {
      console.error('Workflow failed:', error);
    }
  };

  return (
    <div className="p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Example Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">HTTP Request Block</div>
                <div className="text-xs text-muted-foreground">
                  Status: {httpBlock.currentState}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => httpBlock.executeHttpRequest({
                  url: 'https://jsonplaceholder.typicode.com/posts/1',
                  method: 'GET',
                  headers: { 'Accept': 'application/json' },
                })}
                disabled={httpBlock.isRunning}
              >
                Test HTTP
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">Database Block</div>
                <div className="text-xs text-muted-foreground">
                  Status: {dbBlock.currentState}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => dbBlock.executeQuery('SELECT * FROM posts LIMIT 10')}
                disabled={dbBlock.isRunning}
              >
                Test DB
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">AI Assistant Block</div>
                <div className="text-xs text-muted-foreground">
                  Status: {aiBlock.currentState}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => aiBlock.generateResponse('Hello, how are you?')}
                disabled={aiBlock.isRunning}
              >
                Test AI
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button onClick={runWorkflow} className="w-full">
                Run Complete Workflow
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main example component
export function WorkflowExecutionExample() {
  const [showPanel, setShowPanel] = useState(true);

  return (
    <WorkflowExecutionProvider>
      <div className="h-screen flex">
        {/* Left side - Workflow builder/editor */}
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Workflow Execution Demo</h1>
              <Button
                variant="outline"
                onClick={() => setShowPanel(!showPanel)}
              >
                {showPanel ? 'Hide' : 'Show'} Execution Panel
              </Button>
            </div>
            
            <ExampleWorkflow />
          </div>
        </div>

        {/* Right side - Execution monitoring panel */}
        {showPanel && (
          <div className="w-96 border-l bg-muted/20">
            <WorkflowExecutionPanel />
          </div>
        )}
      </div>
    </WorkflowExecutionProvider>
  );
}

// Integration with existing block configs
export function EnhancedHttpRequestConfig(props: any) {
  const httpExecution = useHttpRequestExecution(props.blockId || 'http-block');

  return (
    <div>
      {/* Your existing HTTP request config component */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">HTTP Request Configuration</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              httpExecution.currentState === 'running' ? 'bg-blue-500' :
              httpExecution.currentState === 'success' ? 'bg-green-500' :
              httpExecution.currentState === 'error' ? 'bg-red-500' :
              'bg-gray-300'
            }`} />
            <span className="text-xs text-muted-foreground capitalize">
              {httpExecution.currentState}
            </span>
          </div>
        </div>
        
        {/* Your existing form fields */}
        
        <div className="mt-4 pt-4 border-t">
          <Button
            onClick={() => httpExecution.executeHttpRequest({
              url: 'https://api.example.com/test',
              method: 'GET',
            })}
            disabled={httpExecution.isRunning}
            className="w-full"
          >
            {httpExecution.isRunning ? 'Testing...' : 'Test Request'}
          </Button>
        </div>
      </div>
    </div>
  );
}