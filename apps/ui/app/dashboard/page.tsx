"use client";

import { AuthGate } from "@/components/auth-gate";
import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { WorkflowCard } from "@/components/workflow-card";
import { workflowService } from "@/lib/services/workflow-service";
import {
  dashboardAnalyticsService,
  type DashboardMetrics,
} from "@/lib/services/dashboard-analytics-service";
import { DashboardMetricsCards } from "@/components/dashboard-metrics";
import type { WorkflowSummary } from "@/lib/supabase/schema";
import {
  ArrowUpDown,
  Clock,
  LayoutGrid,
  List,
  PlusCircle,
  Search,
  Star,
  RefreshCw,
  Filter,
  ChevronDown,
  X,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "name" | "last-run";
type ViewMode = "grid" | "list";

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableExists, setTableExists] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTab, setActiveTab] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    successRate: 0,
    totalExecutions: 0,
    averageDuration: "0m 0s",
    rawAverageDurationMs: 0,
    activeWorkflows: 0,
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const workflowsPerPage = 9; // Pagination limit

  const { toast } = useToast();
  const router = useRouter();

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const data = await workflowService.getWorkflows();
      setWorkflows(data);
      setTableExists(true);
    } catch (err) {
      console.error("Error fetching workflows:", err);
      if (err instanceof Error && err.message.includes("does not exist")) {
        setTableExists(false);
      } else {
        toast({
          title: "Error fetching workflows",
          description: "Failed to load workflows. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const metrics = await dashboardAnalyticsService.getDashboardMetrics();
      setDashboardMetrics(metrics);
    } catch (err) {
      console.error("Error fetching dashboard metrics:", err);
      toast({
        title: "Error fetching metrics",
        description: "Failed to load metrics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const refreshWorkflows = async () => {
    setIsRefreshing(true);
    try {
      const [data, metrics] = await Promise.all([
        workflowService.getWorkflows(),
        dashboardAnalyticsService.getDashboardMetrics(),
      ]);
      setWorkflows(data);
      setDashboardMetrics(metrics);
      toast({
        title: "Refreshed",
        description: "Workflows and metrics refreshed successfully.",
      });
    } catch (err) {
      console.error("Error refreshing workflows:", err);
      toast({
        title: "Error refreshing workflows",
        description: "Failed to refresh. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchDashboardMetrics();
  }, []); // Removed toast from dependencies

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "recent" &&
        new Date(workflow.updated_at).getTime() >
          Date.now() - 7 * 24 * 60 * 60 * 1000) ||
      (activeTab === "favorites" && workflow.is_favorite);
    return matchesSearch && matchesTab;
  });

  const sortedWorkflows = [...filteredWorkflows].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "oldest":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "name":
        return a.name.localeCompare(b.name);
      case "last-run":
        return (
          new Date(b.last_run || 0).getTime() -
          new Date(a.last_run || 0).getTime()
        );
      default:
        return 0;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedWorkflows.length / workflowsPerPage);
  const paginatedWorkflows = sortedWorkflows.slice(
    (currentPage - 1) * workflowsPerPage,
    currentPage * workflowsPerPage
  );

  const handleCreateNew = () => router.push("/builder");

  const handleDatabaseSetup = async () => {
    try {
      // Placeholder: Implement actual database setup logic here
      await workflowService.initializeDatabase(); // Assume this exists
      setTableExists(true);
      fetchWorkflows();
      toast({
        title: "Database Setup Complete",
        description: "Workflows are now available.",
      });
    } catch (err) {
      console.error("Error setting up database:", err);
      toast({
        title: "Setup Failed",
        description: "Could not set up the database. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    const previousWorkflows = [...workflows];
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, is_favorite: isFavorite } : w))
    );
    try {
      await workflowService.updateWorkflow(id, { is_favorite: isFavorite });
    } catch (err) {
      console.error("Error toggling favorite:", err);
      toast({
        title: "Error updating workflow",
        description: "Failed to update favorite status.",
        variant: "destructive",
      });
      setWorkflows(previousWorkflows); // Revert to previous state on error
    }
  };

  if (!tableExists) {
    return (
      <AuthGate>
        <div className='flex min-h-screen flex-col'>
          <DashboardHeader />
          <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
            <div className='mx-auto max-w-7xl'>
              <div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
                <h1 className='text-2xl font-bold tracking-tight'>
                  My Workflows
                </h1>
              </div>
              <EmptyState
                title='Database Setup Required'
                description='The workflows table does not exist. Please set up the database to continue.'
                action={
                  <Button
                    onClick={handleDatabaseSetup}
                    aria-label='Set up database'>
                    Set Up Database
                  </Button>
                }
              />
            </div>
          </main>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <MotionConfig
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}>
        <div className='flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30'>
          <DashboardHeader />
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className='flex-1 px-4 py-6 sm:px-6 lg:px-8'>
            <div className='mx-auto max-w-7xl'>
              {/* Dashboard Header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className='mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
                <div>
                  <h1 className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70'>
                    Workflow Dashboard
                  </h1>
                  <p className='text-muted-foreground mt-1'>
                    Manage and monitor your automated workflows
                  </p>
                </div>
                <Button
                  onClick={handleCreateNew}
                  size='lg'
                  className='shadow-lg'
                  aria-label='Create new workflow'>
                  <PlusCircle className='mr-2 h-4 w-4' />
                  Create New Workflow
                </Button>
              </motion.div>

              {/* Dashboard Overview Cards */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className='mb-8'>
                <Card className='overflow-hidden border-none shadow-lg bg-gradient-to-br from-card/50 to-card'>
                  <CardHeader className='pb-2 border-b'>
                    <div className='flex justify-between items-center'>
                      <CardTitle className='text-xl font-semibold flex items-center'>
                        <Activity className='h-5 w-5 mr-2 text-primary' />
                        Workflow Performance
                      </CardTitle>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={refreshWorkflows}
                        disabled={isRefreshing}
                        aria-label='Refresh workflows and metrics'>
                        <motion.div
                          animate={{ rotate: isRefreshing ? 360 : 0 }}
                          transition={{
                            duration: 1,
                            ease: "linear",
                            repeat: isRefreshing ? Infinity : 0,
                          }}>
                          <RefreshCw className='h-4 w-4 mr-1' />
                        </motion.div>
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className='pt-6'>
                    <DashboardMetricsCards
                      metrics={dashboardMetrics}
                      isLoading={isLoadingMetrics}
                      workflowCount={workflows.length}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Workflows Section */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className='mb-6'>
                <Card className='border-none shadow-md overflow-hidden'>
                  <CardHeader className='pb-0 pt-4'>
                    <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
                      <CardTitle className='text-xl'>My Workflows</CardTitle>
                      <div className='flex flex-wrap gap-2 items-center'>
                        <div className='relative w-full sm:w-64'>
                          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                          <Input
                            type='search'
                            placeholder='Search workflows...'
                            className='pl-8'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label='Search workflows'
                          />
                          {searchQuery && (
                            <Button
                              variant='ghost'
                              size='icon'
                              className='absolute right-2.5 top-2.5 h-5 w-5'
                              onClick={() => setSearchQuery("")}
                              aria-label='Clear search'>
                              <X className='h-3 w-3' />
                            </Button>
                          )}
                        </div>
                        <Button
                          variant='outline'
                          size='icon'
                          onClick={refreshWorkflows}
                          aria-label='Refresh workflows'>
                          <RefreshCw className='h-4 w-4' />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='outline'
                              size='sm'
                              aria-label='Sort options'>
                              <ArrowUpDown className='mr-2 h-4 w-4' />
                              Sort
                              <ChevronDown className='ml-2 h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onClick={() => setSortBy("newest")}>
                              Newest first
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSortBy("oldest")}>
                              Oldest first
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy("name")}>
                              Name (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSortBy("last-run")}>
                              Last executed
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className='flex border rounded-md'>
                          <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size='sm'
                            onClick={() => setViewMode("grid")}
                            aria-label='Grid view'>
                            <LayoutGrid className='h-4 w-4' />
                          </Button>
                          <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size='sm'
                            onClick={() => setViewMode("list")}
                            aria-label='List view'>
                            <List className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className='pt-4'>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className='grid w-full grid-cols-3 mb-4'>
                        <TabsTrigger value='all' aria-label='All workflows'>
                          All Workflows
                        </TabsTrigger>
                        <TabsTrigger
                          value='recent'
                          aria-label='Recent workflows'>
                          <Clock className='mr-2 h-4 w-4' />
                          Recent
                        </TabsTrigger>
                        <TabsTrigger
                          value='favorites'
                          aria-label='Favorite workflows'>
                          <Star className='mr-2 h-4 w-4' />
                          Favorites
                        </TabsTrigger>
                      </TabsList>

                      {isLoading ? (
                        <div
                          className={`grid gap-4 ${
                            viewMode === "grid"
                              ? "sm:grid-cols-2 lg:grid-cols-3"
                              : ""
                          }`}>
                          {[...Array(6)].map((_, i) => (
                            <Skeleton
                              key={i}
                              className={viewMode === "grid" ? "h-48" : "h-20"}
                            />
                          ))}
                        </div>
                      ) : paginatedWorkflows.length > 0 ? (
                        <motion.div
                          className={`grid gap-4 ${
                            viewMode === "grid"
                              ? "sm:grid-cols-2 lg:grid-cols-3"
                              : ""
                          }`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}>
                          {paginatedWorkflows.map((workflow) => (
                            <WorkflowCard
                              key={workflow.id}
                              workflow={workflow}
                              viewMode={viewMode}
                              onFavoriteToggle={(isFavorite) =>
                                toggleFavorite(workflow.id, isFavorite)
                              }
                              onDelete={async () => {
                                try {
                                  await workflowService.deleteWorkflow(
                                    workflow.id
                                  );
                                  setWorkflows(
                                    workflows.filter(
                                      (w) => w.id !== workflow.id
                                    )
                                  );
                                  toast({
                                    title: "Workflow deleted",
                                    description:
                                      "Workflow deleted successfully.",
                                  });
                                } catch (err) {
                                  console.error("Error deleting workflow", err);
                                  toast({
                                    title: "Error deleting workflow",
                                    description: "Failed to delete workflow.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            />
                          ))}
                        </motion.div>
                      ) : (
                        <EmptyState
                          title='No workflows found'
                          description={
                            searchQuery
                              ? "No workflows match your search criteria."
                              : "You haven’t created any workflows yet."
                          }
                          action={
                            searchQuery ? (
                              <Button
                                variant='outline'
                                onClick={() => setSearchQuery("")}>
                                Clear Search
                              </Button>
                            ) : (
                              <Button onClick={handleCreateNew}>
                                <PlusCircle className='mr-2 h-4 w-4' />
                                Create Your First Workflow
                              </Button>
                            )
                          }
                        />
                      )}
                    </Tabs>
                  </CardContent>
                  <CardFooter className='border-t py-3 px-6 flex justify-between items-center'>
                    <div className='text-xs text-muted-foreground'>
                      Showing {paginatedWorkflows.length} of{" "}
                      {sortedWorkflows.length} workflows
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                        aria-label='Previous page'>
                        Previous
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={
                          currentPage === totalPages || totalPages === 0
                        }
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        aria-label='Next page'>
                        Next
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            </div>
          </motion.main>
        </div>
      </MotionConfig>
    </AuthGate>
  );
}
