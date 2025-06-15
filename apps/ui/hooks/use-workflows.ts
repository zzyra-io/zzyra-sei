import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workflowService, type Workflow } from '@/lib/services/workflow-service';

/**
 * Hook for fetching all workflows
 */
export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      return await workflowService.getWorkflows();
    },
  });
}

/**
 * Hook for creating a new workflow
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflow: Partial<Workflow>) => {
      return await workflowService.createWorkflow(workflow);
    },
    onSuccess: () => {
      // Invalidate the workflows query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

/**
 * Hook for updating an existing workflow
 */
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Workflow> & { id: string }) => {
      return await workflowService.updateWorkflow(id, data);
    },
    onSuccess: () => {
      // Invalidate the workflows query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

/**
 * Hook for deleting a workflow
 */
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await workflowService.deleteWorkflow(id);
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate the workflows query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

/**
 * Hook for toggling a workflow's favorite status
 * TODO: Implement favorite functionality in the backend
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      // TODO: Implement favorite endpoint in backend
      console.warn('Favorite functionality not yet implemented in backend');
      return { success: true, id, isFavorite };
    },
    onSuccess: () => {
      // Invalidate the workflows query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
