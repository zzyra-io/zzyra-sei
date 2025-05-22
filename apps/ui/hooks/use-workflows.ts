import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Define the Workflow type based on the API response
export interface Workflow {
  id: string;
  userId: string;
  user_id: string; // Legacy field for compatibility
  name: string;
  description?: string;
  nodes?: any;
  edges?: any;
  isPublic?: boolean;
  is_public?: boolean; // Legacy field for compatibility
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
  isFavorite: boolean;
}

/**
 * Hook for fetching all workflows
 */
export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await fetch('/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      return response.json();
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
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      });

      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }

      return response.json();
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
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow');
      }

      return response.json();
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
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the workflows query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

/**
 * Hook for toggling a workflow's favorite status
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const response = await fetch(`/api/workflows/${id}/favorite`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFavorite }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the workflows query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
