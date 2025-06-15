"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { workflowService, type Workflow } from "@/lib/services/workflow-service";

/**
 * Custom hook for fetching all workflows
 */
export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async (): Promise<Workflow[]> => {
      return await workflowService.getWorkflows();
    },
  });
}

/**
 * Custom hook for fetching a single workflow by ID
 */
export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: async (): Promise<Workflow> => {
      return await workflowService.getWorkflow(id);
    },
    enabled: !!id,
  });
}

/**
 * Custom hook for creating a new workflow
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workflowData: Partial<Workflow>) => {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create workflow');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate workflows query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({
        title: "Workflow created",
        description: "Your workflow has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Custom hook for updating a workflow
 */
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Workflow> }) => {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update workflow');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate specific workflow query and all workflows query
      queryClient.invalidateQueries({ queryKey: ['workflow', data.id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({
        title: "Workflow updated",
        description: "Your workflow has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Custom hook for deleting a workflow
 */
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete workflow');
      }
      
      return id;
    },
    onSuccess: (id) => {
      // Invalidate specific workflow query and all workflows query
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({
        title: "Workflow deleted",
        description: "Your workflow has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Custom hook for toggling workflow favorite status
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string, isFavorite: boolean }) => {
      const response = await fetch(`/api/workflows/${id}/favorite`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFavorite }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update favorite status');
      }
      
      return { id, isFavorite };
    },
    onSuccess: ({ id }) => {
      // Invalidate specific workflow query and all workflows query
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating favorite status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
