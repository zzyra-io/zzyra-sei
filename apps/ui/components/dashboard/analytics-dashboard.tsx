"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Activity,
  Zap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { getAnalytics } from "@/lib/api/enhanced-workflow-generation";

interface AnalyticsDashboardProps {
  className?: string;
  timeRange?: 'hour' | 'day' | 'week' | 'month';
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  description, 
  trend,
  className 
}: MetricCardProps) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
      {change !== undefined && (
        <div className="flex items-center mt-2">
          <TrendingUp className={cn(
            "h-3 w-3 mr-1",
            trend === 'up' ? "text-green-500" : trend === 'down' ? "text-red-500" : "text-gray-500"
          )} />
          <span className={cn(
            "text-xs",
            trend === 'up' ? "text-green-600" : trend === 'down' ? "text-red-600" : "text-gray-600"
          )}>
            {Math.abs(change)}% from last period
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

const SecurityCard = ({ 
  securityData 
}: { 
  securityData: any 
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <Shield className="h-5 w-5 mr-2" />
        Security Overview
      </CardTitle>
      <CardDescription>
        Recent security analysis results
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Violations</span>
          <span className="font-medium">{securityData?.summary?.totalViolations || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Critical Issues</span>
          <span className="font-medium text-red-600">
            {securityData?.summary?.criticalViolations || 0}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>High Risk Issues</span>
          <span className="font-medium text-orange-600">
            {securityData?.summary?.highRiskViolations || 0}
          </span>
        </div>
      </div>

      <Separator />

      {securityData?.recommendations && securityData.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Recommendations</h4>
          <div className="space-y-2">
            {securityData.recommendations.slice(0, 3).map((rec: string, index: number) => (
              <Alert key={index} className="p-2">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs ml-2">
                  {rec}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const UserActivityCard = ({ 
  userActivity 
}: { 
  userActivity: any 
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <Activity className="h-5 w-5 mr-2" />
        Recent Activity
      </CardTitle>
      <CardDescription>
        Latest user actions and events
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {userActivity?.recentEvents?.slice(0, 5).map((event: any, index: number) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                event.outcome === 'success' ? "bg-green-500" : 
                event.outcome === 'failure' ? "bg-red-500" : "bg-yellow-500"
              )} />
              <span className="capitalize">{event.eventType?.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className="text-xs">
                {event.outcome}
              </Badge>
              <span className="text-xs text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )) || (
          <div className="text-center text-gray-500 text-sm py-4">
            No recent activity
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const PerformanceChart = ({ 
  metrics 
}: { 
  metrics: any 
}) => {
  const successRate = metrics?.totalGenerations > 0 
    ? ((metrics.successfulGenerations / metrics.totalGenerations) * 100).toFixed(1)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Performance Metrics
        </CardTitle>
        <CardDescription>
          Generation success rates and performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Success Rate</span>
              <span className="font-medium">{successRate}%</span>
            </div>
            <Progress value={Number(successRate)} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Avg Response Time</span>
              <span className="font-medium">{metrics?.averageResponseTime?.toFixed(0) || 0}ms</span>
            </div>
            <Progress 
              value={Math.min((metrics?.averageResponseTime || 0) / 50, 100)} 
              className="h-2" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics?.successfulGenerations || 0}
              </div>
              <div className="text-xs text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {metrics?.failedGenerations || 0}
              </div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AnalyticsDashboard = React.memo<AnalyticsDashboardProps>(({
  className,
  timeRange: initialTimeRange = 'day'
}) => {
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate time range
        const now = new Date();
        let start: Date;
        
        switch (timeRange) {
          case 'hour':
            start = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case 'day':
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }

        const data = await getAnalytics({ start, end: now });
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Error loading analytics: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { metrics, userActivity, security } = analytics || {};

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hour">Last Hour</SelectItem>
            <SelectItem value="day">Last Day</SelectItem>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Generations"
          value={metrics?.totalGenerations || 0}
          icon={Zap}
          description="AI-powered generations"
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics?.totalGenerations > 0 
            ? ((metrics.successfulGenerations / metrics.totalGenerations) * 100).toFixed(1)
            : 0}%`}
          icon={CheckCircle}
          description="Successful generations"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${Math.round(metrics?.averageResponseTime || 0)}ms`}
          icon={Clock}
          description="Processing time"
        />
        <MetricCard
          title="Auto Corrections"
          value={metrics?.autoCorrections || 0}
          icon={Activity}
          description="Auto-healing applied"
        />
      </div>

      {/* Detailed Charts and Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        <PerformanceChart metrics={metrics} />
        <UserActivityCard userActivity={userActivity} />
      </div>

      {/* Security Overview */}
      {security && (
        <div className="grid gap-4 md:grid-cols-1">
          <SecurityCard securityData={security} />
        </div>
      )}

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics?.validationFailures || 0}
            </div>
            <p className="text-xs text-gray-600">Issues detected and resolved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.securityIssues || 0}
            </div>
            <p className="text-xs text-gray-600">Security violations blocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {userActivity?.totalEvents || 0}
            </div>
            <p className="text-xs text-gray-600">Total user interactions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

AnalyticsDashboard.displayName = "AnalyticsDashboard";