import { useMutation } from '@tanstack/react-query';
import { workflowService } from '@/lib/services/workflow-service';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { useToast } from '@/components/ui/use-toast';
import { type Node, type Edge } from '@xyflow/react';

type WorkflowExecutionParams = {
  id?: string;
  nodes: Node[];
  edges: Edge[];
}

export function useWorkflowExecution() {
  const { 
    workflowId, 
    nodes, 
    edges, 
    setExecutionId, 
    setExecuting 
  } = useWorkflowStore();
  const { toast } = useToast();

  const executeWorkflowMutation = useMutation({
    mutationFn: (workflowData: WorkflowExecutionParams = { id: workflowId, nodes, edges }) => {
      return workflowService.executeWorkflow(workflowData);
    },
    onMutate: () => {
      setExecuting(true);
    },
    onSuccess: (data) => {
      setExecutionId(data.id);
      toast({
        title: 'Execution started',
        description: 'Workflow execution has begun.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to execute workflow.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setExecuting(false);
    },
  });

  const executeWorkflow = (customParams?: WorkflowExecutionParams) => {
    const params = customParams || { id: workflowId, nodes, edges };
    executeWorkflowMutation.mutate(params);
  };

  return {
    executeWorkflow,
    isExecuting: executeWorkflowMutation.isPending,
    executionError: executeWorkflowMutation.error,
  };
}
