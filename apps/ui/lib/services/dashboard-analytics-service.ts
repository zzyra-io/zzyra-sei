import { createServiceClient } from '@/lib/supabase/serviceClient';
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export interface DashboardMetrics {
  successRate: number;
  totalExecutions: number;
  averageDuration: string;
  activeWorkflows: number;
  rawAverageDurationMs: number;
  changeFromLastWeek?: {
    successRate?: number;
    totalExecutions?: number;
    averageDuration?: number;
  };
}

export class DashboardAnalyticsService {
  private supabase: SupabaseClient<Database> = createServiceClient();

  /**
   * Get dashboard analytics metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Define our time periods
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const twoWeeksAgo = new Date(oneWeekAgo);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);
      
      // Format dates for SQL queries
      const nowStr = now.toISOString();
      const oneWeekAgoStr = oneWeekAgo.toISOString();
      const twoWeeksAgoStr = twoWeeksAgo.toISOString();

      // Get total executions in the last week
      const { data: recentExecutions, error: executionsError } = await this.supabase
        .from('workflow_executions')
        .select('id, status, started_at, completed_at')
        .gte('started_at', oneWeekAgoStr)
        .lte('started_at', nowStr);

      if (executionsError) {
        console.error('Error fetching recent executions:', executionsError);
        throw executionsError;
      }

      // Get executions from the previous week for comparison
      const { data: previousExecutions, error: prevExecutionsError } = await this.supabase
        .from('workflow_executions')
        .select('id, status, started_at, completed_at')
        .gte('started_at', twoWeeksAgoStr)
        .lt('started_at', oneWeekAgoStr);

      if (prevExecutionsError) {
        console.error('Error fetching previous executions:', prevExecutionsError);
      }

      // Count successful executions
      const successfulExecutions = recentExecutions.filter(
        exec => exec.status === 'completed'
      );

      // Calculate success rate
      const successRate = recentExecutions.length > 0
        ? Math.round((successfulExecutions.length / recentExecutions.length) * 100)
        : 0;

      // Calculate previous week success rate for comparison
      const previousSuccessfulExecutions = previousExecutions?.filter(
        exec => exec.status === 'completed'
      ) || [];
      
      const previousSuccessRate = previousExecutions && previousExecutions.length > 0
        ? Math.round((previousSuccessfulExecutions.length / previousExecutions.length) * 100)
        : 0;

      // Calculate average duration for completed executions
      let totalDurationMs = 0;
      let completedWithDuration = 0;

      for (const exec of successfulExecutions) {
        if (exec.completed_at && exec.started_at) {
          const duration = new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime();
          totalDurationMs += duration;
          completedWithDuration++;
        }
      }

      // Calculate previous week average duration
      let previousTotalDurationMs = 0;
      let previousCompletedWithDuration = 0;

      for (const exec of previousSuccessfulExecutions) {
        if (exec.completed_at && exec.started_at) {
          const duration = new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime();
          previousTotalDurationMs += duration;
          previousCompletedWithDuration++;
        }
      }

      const avgDurationMs = completedWithDuration > 0
        ? Math.round(totalDurationMs / completedWithDuration)
        : 0;

      const previousAvgDurationMs = previousCompletedWithDuration > 0
        ? Math.round(previousTotalDurationMs / previousCompletedWithDuration)
        : 0;

      // Format average duration as "Xm Ys"
      const formatDuration = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
      };

      // Get active workflows (workflows with executions in the past week)
      const { data: activeWorkflowsData, error: activeWorkflowsError } = await this.supabase
        .rpc('get_active_workflows_count', { 
          time_period: 7 // days
        });

      if (activeWorkflowsError) {
        console.error('Error fetching active workflows:', activeWorkflowsError);
      }

      const activeWorkflows = activeWorkflowsData || 0;

      // Calculate changes from last week
      const executionChange = previousExecutions && previousExecutions.length > 0
        ? Math.round(((recentExecutions.length - previousExecutions.length) / previousExecutions.length) * 100)
        : 0;

      const durationChange = previousAvgDurationMs > 0
        ? Math.round(((avgDurationMs - previousAvgDurationMs) / previousAvgDurationMs) * 100)
        : 0;

      const successRateChange = previousSuccessRate > 0
        ? successRate - previousSuccessRate
        : 0;

      return {
        successRate,
        totalExecutions: recentExecutions.length,
        averageDuration: formatDuration(avgDurationMs),
        rawAverageDurationMs: avgDurationMs,
        activeWorkflows,
        changeFromLastWeek: {
          successRate: successRateChange,
          totalExecutions: executionChange,
          averageDuration: durationChange
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default values if there's an error
      return {
        successRate: 0,
        totalExecutions: 0,
        averageDuration: '0m 0s',
        rawAverageDurationMs: 0,
        activeWorkflows: 0
      };
    }
  }
}

export const dashboardAnalyticsService = new DashboardAnalyticsService();
