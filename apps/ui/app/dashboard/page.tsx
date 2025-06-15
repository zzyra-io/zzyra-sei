"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardMetricsCards } from "@/components/dashboard-metrics";
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
import { useDashboardMetrics } from "@/hooks/useDashboardMetricsData";
import {
  useDeleteWorkflow,
  useToggleFavorite,
  useWorkflows,
} from "@/hooks/useWorkflowsData";
import {
  ArrowUpDown,
  ChevronDown,
  LayoutGrid,
  List,
  PlusCircle,
  RefreshCw,
  Search,
  Star,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SortOption = "newest" | "oldest" | "name" | "last-run";
type ViewMode = "grid" | "list";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const workflowsPerPage = 9; // Pagination limit

  // Use TanStack Query hooks for data fetching
  const { 
    data: workflows = [], 
    isLoading, 
    refetch: refetchWorkflows 
  } = useWorkflows();
  
  const { 
    data: dashboardMetrics = {
      successRate: 0,
      totalExecutions: 0,
      averageDuration: "0m 0s",
      rawAverageDurationMs: 0,
      activeWorkflows: 0,
    }, 
    isLoading: isLoadingMetrics, 
    refetch: refetchMetrics 
  } = useDashboardMetrics();
  
  const { mutateAsync: deleteWorkflow } = useDeleteWorkflow();
  const { mutateAsync: toggleWorkflowFavorite } = useToggleFavorite();

  const { toast } = useToast();
  const router = useRouter();

  // Refresh workflows and metrics
  const refreshWorkflows = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchWorkflows(), refetchMetrics()]);
      toast({
        title: "Refreshed",
        description: "Workflows and metrics refreshed successfully.",
      });
    } catch (err) {
      console.error("Error refreshing workflows:", err);
      toast({
        title: "Error refreshing workflows",
        description: "Failed to refresh workflows. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle workflow favorite status
  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      await toggleWorkflowFavorite({ id, isFavorite });
      // No need to manually update state - TanStack Query handles this
    } catch (err) {
      console.error("Error toggling favorite:", err);
      // Error handling is done in the mutation hook
    }
  };

  // Filter workflows based on search query and active tab
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
      (activeTab === "favorites" && workflow.isFavorite);
    return matchesSearch && matchesTab;
  });

  // Sort workflows based on selected sort option
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

  // Navigate to workflow builder
  const handleCreateNew = () => router.push("/builder");

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30">
      <DashboardHeader />
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Dashboard Header */}
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Workflow Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage and monitor your automated workflows
              </p>
            </div>
            <Button
              onClick={handleCreateNew}
              size="lg"
              className="shadow-lg"
              aria-label="Create new workflow"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Workflow
            </Button>
          </div>

          {/* Dashboard Metrics */}
          <div className="mb-8">
            <DashboardMetricsCards
              metrics={dashboardMetrics}
              isLoading={isLoadingMetrics}
            />
          </div>

          {/* Workflows List */}
          <div className="mb-8">
            <Card>
              <CardHeader className="border-b px-6 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle>Your Workflows</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshWorkflows}
                      disabled={isRefreshing}
                      aria-label="Refresh workflows"
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                      />
                      Refresh
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label="Change view mode"
                        >
                          {viewMode === "grid" ? (
                            <LayoutGrid className="mr-2 h-4 w-4" />
                          ) : (
                            <List className="mr-2 h-4 w-4" />
                          )}
                          View
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setViewMode("grid")}
                          className={
                            viewMode === "grid" ? "bg-muted/50" : ""
                          }
                        >
                          <LayoutGrid className="mr-2 h-4 w-4" />
                          Grid
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setViewMode("list")}
                          className={
                            viewMode === "list" ? "bg-muted/50" : ""
                          }
                        >
                          <List className="mr-2 h-4 w-4" />
                          List
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label="Sort workflows"
                        >
                          <ArrowUpDown className="mr-2 h-4 w-4" />
                          Sort
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setSortBy("newest")}
                          className={
                            sortBy === "newest" ? "bg-muted/50" : ""
                          }
                        >
                          Newest First
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSortBy("oldest")}
                          className={
                            sortBy === "oldest" ? "bg-muted/50" : ""
                          }
                        >
                          Oldest First
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSortBy("name")}
                          className={sortBy === "name" ? "bg-muted/50" : ""}
                        >
                          Name (A-Z)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSortBy("last-run")}
                          className={
                            sortBy === "last-run" ? "bg-muted/50" : ""
                          }
                        >
                          Last Run
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <div className="px-6 py-4 border-b">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search workflows..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full sm:w-auto"
                  >
                    <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="recent">Recent</TabsTrigger>
                      <TabsTrigger value="favorites">
                        <Star className="mr-1 h-4 w-4" />
                        Favorites
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              <CardContent className="p-6">
                <Tabs value="workflows" className="w-full">
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          className="h-[220px] rounded-lg"
                        />
                      ))}
                    </div>
                  ) : paginatedWorkflows.length > 0 ? (
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                          : "flex flex-col gap-4"
                      }
                    >
                      {paginatedWorkflows.map((workflow) => (
                        <WorkflowCard
                          key={workflow.id}
                          workflow={workflow as any}
                          viewMode={viewMode}
                          onFavoriteToggle={(isFavorite) =>
                            toggleFavorite(workflow.id, isFavorite)
                          }
                          onDelete={async () => {
                            try {
                              await deleteWorkflow(workflow.id);
                              // No need to manually update state - TanStack Query handles this
                            } catch (err) {
                              console.error("Error deleting workflow", err);
                              // Error handling is done in the mutation hook
                            }
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No workflows found"
                      description={
                        searchQuery
                          ? "No workflows match your search criteria."
                          : "You haven't created any workflows yet."
                      }
                      action={
                        searchQuery ? (
                          <Button
                            variant="outline"
                            onClick={() => setSearchQuery("")}
                          >
                            Clear Search
                          </Button>
                        ) : (
                          <Button onClick={handleCreateNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Your First Workflow
                          </Button>
                        )
                      }
                    />
                  )}
                </Tabs>
              </CardContent>
              <CardFooter className="border-t py-3 px-6 flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  Showing {paginatedWorkflows.length} of{" "}
                  {sortedWorkflows.length} workflows
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    aria-label="Previous page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      currentPage === totalPages || totalPages === 0
                    }
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
