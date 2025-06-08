"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  Users,
  CreditCard,
  Activity,
  TrendingUp,
} from "lucide-react";

// Mock data for the analytics dashboard
const generateMockData = () => {
  const now = new Date();
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split("T")[0];
  });

  const userSignups = last30Days.map((date) => ({
    date,
    count: Math.floor(Math.random() * 10) + 1,
  }));

  const revenue = last30Days.map((date) => ({
    date,
    amount: Math.floor(Math.random() * 500) + 100,
  }));

  const workflowExecutions = last30Days.map((date) => ({
    date,
    count: Math.floor(Math.random() * 100) + 10,
  }));

  const activeUsers = last30Days.map((date) => ({
    date,
    count: Math.floor(Math.random() * 50) + 20,
  }));

  return {
    userSignups,
    revenue,
    workflowExecutions,
    activeUsers,
  };
};

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [data, setData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate API call to fetch analytics data
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would be an API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setData(generateMockData());
      } catch (error) {
        toast({
          title: "Error fetching analytics",
          description: "Failed to load analytics data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange, toast]);

  // Calculate summary metrics
  const getTotalSignups = () => {
    if (!data) return 0;
    return data.userSignups.reduce(
      (sum: number, item: any) => sum + item.count,
      0
    );
  };

  const getTotalRevenue = () => {
    if (!data) return 0;
    return data.revenue.reduce(
      (sum: number, item: any) => sum + item.amount,
      0
    );
  };

  const getTotalExecutions = () => {
    if (!data) return 0;
    return data.workflowExecutions.reduce(
      (sum: number, item: any) => sum + item.count,
      0
    );
  };

  const getAverageActiveUsers = () => {
    if (!data) return 0;
    const total = data.activeUsers.reduce(
      (sum: number, item: any) => sum + item.count,
      0
    );
    return Math.round(total / data.activeUsers.length);
  };

  return (
    <>
      <div className='flex min-h-screen flex-col'>
        <DashboardHeader />
        <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            <div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
              <div>
                <h1 className='text-2xl font-bold tracking-tight'>Analytics</h1>
                <p className='text-muted-foreground'>
                  Monitor your SaaS metrics and performance.
                </p>
              </div>
              <div className='flex items-center gap-4'>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Select time range' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='7d'>Last 7 days</SelectItem>
                    <SelectItem value='30d'>Last 30 days</SelectItem>
                    <SelectItem value='90d'>Last 90 days</SelectItem>
                    <SelectItem value='1y'>Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant='outline'>
                  <Download className='mr-2 h-4 w-4' />
                  Export
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6'>
              {isLoading ? (
                <>
                  <Skeleton className='h-32 rounded-md' />
                  <Skeleton className='h-32 rounded-md' />
                  <Skeleton className='h-32 rounded-md' />
                  <Skeleton className='h-32 rounded-md' />
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between pb-2'>
                      <CardTitle className='text-sm font-medium text-muted-foreground'>
                        New Users
                      </CardTitle>
                      <Users className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {getTotalSignups()}
                      </div>
                      <p className='text-xs text-muted-foreground mt-1'>
                        +{Math.floor(Math.random() * 20) + 5}% from last period
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between pb-2'>
                      <CardTitle className='text-sm font-medium text-muted-foreground'>
                        Revenue
                      </CardTitle>
                      <CreditCard className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        ${getTotalRevenue().toLocaleString()}
                      </div>
                      <p className='text-xs text-muted-foreground mt-1'>
                        +{Math.floor(Math.random() * 15) + 10}% from last period
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between pb-2'>
                      <CardTitle className='text-sm font-medium text-muted-foreground'>
                        Workflow Executions
                      </CardTitle>
                      <Activity className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {getTotalExecutions().toLocaleString()}
                      </div>
                      <p className='text-xs text-muted-foreground mt-1'>
                        +{Math.floor(Math.random() * 30) + 15}% from last period
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between pb-2'>
                      <CardTitle className='text-sm font-medium text-muted-foreground'>
                        Active Users
                      </CardTitle>
                      <TrendingUp className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {getAverageActiveUsers()}
                      </div>
                      <p className='text-xs text-muted-foreground mt-1'>
                        +{Math.floor(Math.random() * 10) + 2}% from last period
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <Tabs defaultValue='overview' className='space-y-4'>
              <TabsList>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
                <TabsTrigger value='users'>Users</TabsTrigger>
                <TabsTrigger value='revenue'>Revenue</TabsTrigger>
                <TabsTrigger value='usage'>Usage</TabsTrigger>
              </TabsList>

              <TabsContent value='overview' className='space-y-4'>
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                    <CardDescription>
                      New user signups over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className='h-[350px] w-full' />
                    ) : (
                      <ChartContainer
                        config={{
                          count: {
                            label: "New Users",
                            color: "hsl(var(--chart-1))",
                          },
                        }}
                        className='h-[350px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart data={data.userSignups}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='date' />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                              type='monotone'
                              dataKey='count'
                              stroke='var(--color-count)'
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue</CardTitle>
                    <CardDescription>Daily revenue in USD</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className='h-[350px] w-full' />
                    ) : (
                      <ChartContainer
                        config={{
                          amount: {
                            label: "Revenue",
                            color: "hsl(var(--chart-2))",
                          },
                        }}
                        className='h-[350px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <BarChart data={data.revenue}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='date' />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey='amount' fill='var(--color-amount)' />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='users' className='space-y-4'>
                <Card>
                  <CardHeader>
                    <CardTitle>User Signups</CardTitle>
                    <CardDescription>
                      New user registrations over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className='h-[350px] w-full' />
                    ) : (
                      <ChartContainer
                        config={{
                          count: {
                            label: "Signups",
                            color: "hsl(var(--chart-1))",
                          },
                        }}
                        className='h-[350px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <BarChart data={data.userSignups}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='date' />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey='count' fill='var(--color-count)' />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Active Users</CardTitle>
                    <CardDescription>Daily active users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className='h-[350px] w-full' />
                    ) : (
                      <ChartContainer
                        config={{
                          count: {
                            label: "Active Users",
                            color: "hsl(var(--chart-3))",
                          },
                        }}
                        className='h-[350px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart data={data.activeUsers}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='date' />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                              type='monotone'
                              dataKey='count'
                              stroke='var(--color-count)'
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='revenue' className='space-y-4'>
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue</CardTitle>
                    <CardDescription>Daily revenue in USD</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className='h-[350px] w-full' />
                    ) : (
                      <ChartContainer
                        config={{
                          amount: {
                            label: "Revenue",
                            color: "hsl(var(--chart-2))",
                          },
                        }}
                        className='h-[350px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart data={data.revenue}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='date' />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                              type='monotone'
                              dataKey='amount'
                              stroke='var(--color-amount)'
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='usage' className='space-y-4'>
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Executions</CardTitle>
                    <CardDescription>Daily workflow executions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className='h-[350px] w-full' />
                    ) : (
                      <ChartContainer
                        config={{
                          count: {
                            label: "Executions",
                            color: "hsl(var(--chart-4))",
                          },
                        }}
                        className='h-[350px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <BarChart data={data.workflowExecutions}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='date' />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey='count' fill='var(--color-count)' />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </>
  );
}
