"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import {
  workflowService,
  type Workflow,
} from "@/lib/services/workflow-service";
import api from "@/lib/services/api";
import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for fetching all workflows
 */
export const useWorkflows = () => {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const result = await workflowService.getWorkflows();
      return result.data; // Return just the data array for backward compatibility
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Custom hook for fetching a single workflow by ID
 */
export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ["workflow", id],
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
      const response = await api.post("/workflows", workflowData);

      return response.data;
    },
    onSuccess: () => {
      // Invalidate workflows query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
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
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Workflow>;
    }) => {
      const response = await api.put(`/workflows/${id}`, data);

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate specific workflow query and all workflows query
      queryClient.invalidateQueries({ queryKey: ["workflow", data.id] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
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
      await api.delete(`/workflows/${id}`);

      return { id };
    },
    onSuccess: (id) => {
      // Invalidate specific workflow query and all workflows query
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
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
    mutationFn: async ({
      id,
      isFavorite,
    }: {
      id: string;
      isFavorite: boolean;
    }) => {
      const response = await api.post(`/workflows/toggle-favorite`, {
        id,
        isFavorite,
      });

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific workflow query and all workflows query
      queryClient.invalidateQueries({ queryKey: ["workflow", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
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

// Infinite query for workflows with pagination
export const useWorkflowsInfinite = (pageSize = 9) => {
  return useInfiniteQuery({
    queryKey: ["workflows", "infinite"],
    queryFn: ({ pageParam = 1 }) =>
      workflowService.getWorkflows(pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return lastPage.data.length === pageSize ? nextPage : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Utility hook for infinite scroll intersection observer
export const useInfiniteScroll = (
  hasNextPage: boolean | undefined,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void
) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return lastElementRef;
};
