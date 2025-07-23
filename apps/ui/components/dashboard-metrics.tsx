"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface DashboardMetrics {
  successRate: number;
  totalExecutions: number;
  averageDuration: string;
  rawAverageDurationMs: number;
  activeWorkflows: number;
  changeFromLastWeek?: {
    successRate?: number;
    totalExecutions?: number;
    averageDuration?: number;
  };
}

interface DashboardMetricsCardProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
  workflowCount: number;
}

export function DashboardMetricsCards({
  metrics,
  isLoading,
  workflowCount,
}: DashboardMetricsCardProps) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
      {/* Success Rate Card */}
      <Card className='shadow-sm hover:shadow-md transition-shadow duration-300'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground flex justify-between items-center'>
            Success Rate
            {!isLoading && (
              <>
                {metrics.successRate > 80 ? (
                  <Badge
                    variant='outline'
                    className='bg-green-50 text-green-600 hover:bg-green-50 px-2 py-0 h-5 text-[10px]'>
                    Good
                  </Badge>
                ) : metrics.successRate > 50 ? (
                  <Badge
                    variant='outline'
                    className='bg-yellow-50 text-yellow-600 hover:bg-yellow-50 px-2 py-0 h-5 text-[10px]'>
                    Fair
                  </Badge>
                ) : (
                  <Badge
                    variant='outline'
                    className='bg-red-50 text-red-600 hover:bg-red-50 px-2 py-0 h-5 text-[10px]'>
                    Needs Improvement
                  </Badge>
                )}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className='h-8 w-16 mb-2' />
          ) : (
            <div className='text-2xl font-bold mb-1'>
              {metrics.successRate}%
            </div>
          )}
          <div className='flex items-center'>
            {isLoading ? (
              <Skeleton className='h-2 w-full' />
            ) : (
              <Progress value={metrics.successRate} className='h-2' />
            )}
          </div>
          {isLoading ? (
            <Skeleton className='h-4 w-28 mt-2' />
          ) : (
            <p className='text-xs text-muted-foreground mt-2'>
              {metrics.changeFromLastWeek?.successRate ? (
                metrics.changeFromLastWeek.successRate > 0 ? (
                  <span className='text-green-600 font-medium flex items-center'>
                    <TrendingUp className='h-3 w-3 mr-1' />
                    {Math.abs(metrics.changeFromLastWeek.successRate)}%
                  </span>
                ) : metrics.changeFromLastWeek.successRate < 0 ? (
                  <span className='text-red-600 font-medium flex items-center'>
                    <TrendingDown className='h-3 w-3 mr-1' />
                    {Math.abs(metrics.changeFromLastWeek.successRate)}%
                  </span>
                ) : (
                  <span className='text-muted-foreground'>No change</span>
                )
              ) : (
                <span className='text-muted-foreground'>No previous data</span>
              )}
              {" from last week"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Total Executions Card */}
      <Card className='shadow-sm hover:shadow-md transition-shadow duration-300'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>
            Total Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className='h-8 w-16 mb-2' />
          ) : (
            <div className='text-2xl font-bold'>{metrics.totalExecutions}</div>
          )}
          {isLoading ? (
            <Skeleton className='h-4 w-28 mt-2' />
          ) : (
            <p className='text-xs text-muted-foreground mt-2'>
              {metrics.changeFromLastWeek?.totalExecutions ? (
                metrics.changeFromLastWeek.totalExecutions > 0 ? (
                  <span className='text-green-600 font-medium flex items-center'>
                    <TrendingUp className='h-3 w-3 mr-1' />
                    {Math.abs(metrics.changeFromLastWeek.totalExecutions)}%
                  </span>
                ) : metrics.changeFromLastWeek.totalExecutions < 0 ? (
                  <span className='text-red-600 font-medium flex items-center'>
                    <TrendingDown className='h-3 w-3 mr-1' />
                    {Math.abs(metrics.changeFromLastWeek.totalExecutions)}%
                  </span>
                ) : (
                  <span className='text-muted-foreground'>No change</span>
                )
              ) : (
                <span className='text-muted-foreground'>No previous data</span>
              )}
              {" from last week"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Average Duration Card */}
      <Card className='shadow-sm hover:shadow-md transition-shadow duration-300'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>
            Average Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className='h-8 w-16 mb-2' />
          ) : (
            <div className='text-2xl font-bold'>{metrics.averageDuration}</div>
          )}
          {isLoading ? (
            <Skeleton className='h-4 w-28 mt-2' />
          ) : (
            <p className='text-xs text-muted-foreground mt-2'>
              {metrics.changeFromLastWeek?.averageDuration ? (
                // For duration, lower is better
                metrics.changeFromLastWeek.averageDuration < 0 ? (
                  <span className='text-green-600 font-medium flex items-center'>
                    <TrendingDown className='h-3 w-3 mr-1' />
                    {Math.abs(metrics.changeFromLastWeek.averageDuration)}%
                  </span>
                ) : metrics.changeFromLastWeek.averageDuration > 0 ? (
                  <span className='text-red-600 font-medium flex items-center'>
                    <TrendingUp className='h-3 w-3 mr-1' />
                    {Math.abs(metrics.changeFromLastWeek.averageDuration)}%
                  </span>
                ) : (
                  <span className='text-muted-foreground'>No change</span>
                )
              ) : (
                <span className='text-muted-foreground'>No previous data</span>
              )}
              {" from last week"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Active Workflows Card */}
      <Card className='shadow-sm hover:shadow-md transition-shadow duration-300'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>
            Active Workflows
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className='h-8 w-16 mb-2' />
          ) : (
            <div className='text-2xl font-bold'>{metrics.activeWorkflows}</div>
          )}
          {isLoading ? (
            <Skeleton className='h-4 w-32 mt-2' />
          ) : (
            <p className='text-xs text-muted-foreground mt-2'>
              <span className='text-muted-foreground'>
                of {workflowCount} total workflows
              </span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
