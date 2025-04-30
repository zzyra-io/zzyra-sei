"use client";

import { AuthGate } from "@/components/auth-gate";
import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
import type { WorkflowSummary } from "@/lib/supabase/schema";
import {
  ArrowUpDown,
  Clock,
  LayoutGrid,
  List,
  PlusCircle,
  Search,
  Star,
  Zap,
  Sparkles,
  Activity,
  BarChart3,
  RefreshCw,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Mock data for enhanced visualization
  const workflowStats = {
    successRate: 87,
    totalExecutions: 124,
    averageDuration: "1m 45s",
    activeWorkflows: 3,
  };

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const data = await workflowService.getWorkflows();
      setWorkflows(data);
      setTableExists(true);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      // Check if the error is about the table not existing
      if (
        error instanceof Error &&
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        setTableExists(false);
      } else {
        toast({
          title: "Error fetching workflows",
          description: "Failed to load your workflows. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshWorkflows = async () => {
    setIsRefreshing(true);
    try {
      const data = await workflowService.getWorkflows();
      setWorkflows(data);
      toast({
        title: "Refreshed",
        description: "Your workflows have been refreshed.",
      });
    } catch (error) {
      console.error("Error refreshing workflows:", error);
      toast({
        title: "Error refreshing workflows",
        description: "Failed to refresh your workflows. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 600); // Add slight delay for animation
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [toast]);

  // Filter workflows based on search query and active tab
  const filteredWorkflows = workflows.filter((workflow) => {
    // Search filter
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Tab filter
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "recent" &&
        new Date(workflow.updated_at).getTime() >
          Date.now() - 7 * 24 * 60 * 60 * 1000) ||
      (activeTab === "favorites" && workflow.is_favorite);

    return matchesSearch && matchesTab;
  });

  // Sort workflows
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

  const handleCreateNew = () => {
    router.push("/builder");
  };

  const handleDatabaseSetupComplete = () => {
    fetchWorkflows();
  };

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      // Update local state immediately for responsive UI
      setWorkflows(
        workflows.map((w) =>
          w.id === id ? { ...w, is_favorite: isFavorite } : w
        )
      );

      // Update in database
      await workflowService.updateWorkflow(id, { is_favorite: isFavorite });
    } catch (error) {
      toast({
        title: "Error updating workflow",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive",
      });
      // Revert on error
      setWorkflows(workflows);
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
                  <motion.h1
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70'>
                    Workflow Dashboard
                  </motion.h1>
                  <motion.p
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className='text-muted-foreground mt-1'>
                    Manage and monitor your automated workflows
                  </motion.p>
                </div>
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={handleCreateNew}
                    size='lg'
                    className='shadow-lg group'>
                    <PlusCircle className='mr-2 h-4 w-4 transition-transform group-hover:rotate-90' />
                    Create New Workflow
                  </Button>
                </motion.div>
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
                        disabled={isRefreshing}>
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
                    <div className='grid gap-6 md:grid-cols-4'>
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className='space-y-2'>
                        <div className='flex justify-between items-center'>
                          <h3 className='text-sm font-medium text-muted-foreground'>
                            Success Rate
                          </h3>
                          <Badge
                            variant='outline'
                            className='bg-green-500/10 text-green-600 border-green-200'>
                            Good
                          </Badge>
                        </div>
                        <div className='text-3xl font-bold'>
                          {workflowStats.successRate}%
                        </div>
                        <Progress
                          value={workflowStats.successRate}
                          className='h-2'
                        />
                      </motion.div>

                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className='space-y-2'>
                        <h3 className='text-sm font-medium text-muted-foreground'>
                          Total Executions
                        </h3>
                        <div className='text-3xl font-bold'>
                          {workflowStats.totalExecutions}
                        </div>
                        <div className='text-xs text-muted-foreground flex items-center'>
                          <BarChart3 className='h-3 w-3 mr-1' />
                          <span>+12% from last week</span>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className='space-y-2'>
                        <h3 className='text-sm font-medium text-muted-foreground'>
                          Average Duration
                        </h3>
                        <div className='text-3xl font-bold'>
                          {workflowStats.averageDuration}
                        </div>
                        <div className='text-xs text-muted-foreground flex items-center'>
                          <Clock className='h-3 w-3 mr-1' />
                          <span>-5% from last week</span>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className='space-y-2'>
                        <h3 className='text-sm font-medium text-muted-foreground'>
                          Active Workflows
                        </h3>
                        <div className='text-3xl font-bold'>
                          {workflowStats.activeWorkflows}
                        </div>
                        <div className='text-xs text-muted-foreground flex items-center'>
                          <Sparkles className='h-3 w-3 mr-1' />
                          <span>of {workflows.length} total workflows</span>
                        </div>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className='mb-8 grid gap-4 md:grid-cols-3'>
                <motion.div
                  whileHover={{
                    y: -5,
                    scale: 1.02,
                    transition: { duration: 0.2 },
                  }}
                  whileTap={{ scale: 0.98 }}
                  className='col-span-1'>
                  <Card className='overflow-hidden h-full border-none shadow-md bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 transition-all duration-300'>
                    <CardContent className='p-6 flex flex-col h-full'>
                      <div className='rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4'>
                        <PlusCircle className='h-6 w-6 text-primary' />
                      </div>
                      <h3 className='text-lg font-semibold mb-2'>
                        Create Workflow
                      </h3>
                      <p className='text-sm text-muted-foreground mb-4 flex-grow'>
                        Build a new automated workflow from scratch with our
                        visual editor.
                      </p>
                      <Button
                        variant='outline'
                        className='mt-auto border-primary/20 hover:bg-primary hover:text-primary-foreground'
                        onClick={handleCreateNew}>
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  whileHover={{
                    y: -5,
                    scale: 1.02,
                    transition: { duration: 0.2 },
                  }}
                  whileTap={{ scale: 0.98 }}
                  className='col-span-1'>
                  <Card className='overflow-hidden h-full border-none shadow-md bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 hover:from-yellow-500/10 hover:to-yellow-500/20 transition-all duration-300'>
                    <CardContent className='p-6 flex flex-col h-full'>
                      <div className='rounded-full bg-yellow-500/10 w-12 h-12 flex items-center justify-center mb-4'>
                        <Zap className='h-6 w-6 text-yellow-500' />
                      </div>
                      <h3 className='text-lg font-semibold mb-2'>
                        Use Templates
                      </h3>
                      <p className='text-sm text-muted-foreground mb-4 flex-grow'>
                        Start with pre-built templates to quickly set up common
                        workflows.
                      </p>
                      <Button
                        variant='outline'
                        className='mt-auto border-yellow-500/20 hover:bg-yellow-500 hover:text-white'
                        onClick={() => router.push("/templates")}>
                        Browse Templates
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  whileHover={{
                    y: -5,
                    scale: 1.02,
                    transition: { duration: 0.2 },
                  }}
                  whileTap={{ scale: 0.98 }}
                  className='col-span-1'>
                  <Card className='overflow-hidden h-full border-none shadow-md bg-gradient-to-br from-blue-500/5 to-blue-500/10 hover:from-blue-500/10 hover:to-blue-500/20 transition-all duration-300'>
                    <CardContent className='p-6 flex flex-col h-full'>
                      <div className='rounded-full bg-blue-500/10 w-12 h-12 flex items-center justify-center mb-4'>
                        <Activity className='h-6 w-6 text-blue-500' />
                      </div>
                      <h3 className='text-lg font-semibold mb-2'>
                        View Analytics
                      </h3>
                      <p className='text-sm text-muted-foreground mb-4 flex-grow'>
                        Get detailed insights and performance metrics for your
                        workflows.
                      </p>
                      <Button
                        variant='outline'
                        className='mt-auto border-blue-500/20 hover:bg-blue-500 hover:text-white'
                        onClick={() => router.push("/analytics")}>
                        View Reports
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Workflows Header and Controls */}
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
                        <div className='relative w-full sm:w-64 group'>
                          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary' />
                          <Input
                            type='search'
                            placeholder='Search workflows...'
                            className='pl-8 transition-all duration-300 border-muted focus:border-primary'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {searchQuery && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className='absolute right-2.5 top-2.5'>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-5 w-5 rounded-full'
                                onClick={() => setSearchQuery("")}>
                                <span className='sr-only'>Clear search</span>
                                <X className='h-3 w-3' />
                              </Button>
                            </motion.div>
                          )}
                        </div>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant='outline'
                                  size='icon'
                                  onClick={() => setShowFilters(!showFilters)}
                                  className={cn(showFilters && "bg-muted")}>
                                  <Filter className='h-4 w-4' />
                                </Button>
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent>Filter workflows</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}>
                              <Button variant='outline' size='sm'>
                                <ArrowUpDown className='mr-2 h-4 w-4' />
                                Sort
                                <ChevronDown className='ml-2 h-4 w-4' />
                              </Button>
                            </motion.div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onClick={() => setSortBy("newest")}
                              className='flex items-center cursor-pointer'>
                              <motion.div
                                initial={{ opacity: 0, x: -5 }}
                                animate={{
                                  opacity: sortBy === "newest" ? 1 : 0,
                                  x: sortBy === "newest" ? 0 : -5,
                                }}
                                className='w-2 h-2 rounded-full bg-primary mr-2'
                              />
                              Newest first
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSortBy("oldest")}
                              className='flex items-center cursor-pointer'>
                              <motion.div
                                initial={{ opacity: 0, x: -5 }}
                                animate={{
                                  opacity: sortBy === "oldest" ? 1 : 0,
                                  x: sortBy === "oldest" ? 0 : -5,
                                }}
                                className='w-2 h-2 rounded-full bg-primary mr-2'
                              />
                              Oldest first
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSortBy("name")}
                              className='flex items-center cursor-pointer'>
                              <motion.div
                                initial={{ opacity: 0, x: -5 }}
                                animate={{
                                  opacity: sortBy === "name" ? 1 : 0,
                                  x: sortBy === "name" ? 0 : -5,
                                }}
                                className='w-2 h-2 rounded-full bg-primary mr-2'
                              />
                              Name (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSortBy("last-run")}
                              className='flex items-center cursor-pointer'>
                              <motion.div
                                initial={{ opacity: 0, x: -5 }}
                                animate={{
                                  opacity: sortBy === "last-run" ? 1 : 0,
                                  x: sortBy === "last-run" ? 0 : -5,
                                }}
                                className='w-2 h-2 rounded-full bg-primary mr-2'
                              />
                              Last executed
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className='flex border rounded-md overflow-hidden'>
                          <motion.div
                            whileHover={{
                              backgroundColor:
                                viewMode !== "grid" ? "rgba(0,0,0,0.05)" : "",
                            }}
                            whileTap={{ scale: 0.95 }}>
                            <Button
                              variant={
                                viewMode === "grid" ? "default" : "ghost"
                              }
                              size='sm'
                              className='rounded-none transition-colors duration-300'
                              onClick={() => setViewMode("grid")}>
                              <LayoutGrid className='h-4 w-4' />
                            </Button>
                          </motion.div>
                          <motion.div
                            whileHover={{
                              backgroundColor:
                                viewMode !== "list" ? "rgba(0,0,0,0.05)" : "",
                            }}
                            whileTap={{ scale: 0.95 }}>
                            <Button
                              variant={
                                viewMode === "list" ? "default" : "ghost"
                              }
                              size='sm'
                              className='rounded-none transition-colors duration-300'
                              onClick={() => setViewMode("list")}>
                              <List className='h-4 w-4' />
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Workflow Tabs */}
                  <CardContent className='pt-4'>
                    <Tabs
                      defaultValue='all'
                      value={activeTab}
                      onValueChange={setActiveTab}>
                      <TabsList className='relative w-full justify-start mb-4 bg-transparent p-0 h-auto'>
                        <motion.div
                          className='absolute h-[3px] bottom-0 bg-primary rounded-full'
                          initial={false}
                          animate={{
                            left:
                              activeTab === "all"
                                ? "0%"
                                : activeTab === "recent"
                                ? "33.33%"
                                : "66.66%",
                            width: "33.33%",
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                        <TabsTrigger
                          value='all'
                          className='relative z-10 transition-all duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-10 px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground'>
                          All Workflows
                        </TabsTrigger>
                        <TabsTrigger
                          value='recent'
                          className='relative z-10 transition-all duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-10 px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground'>
                          <Clock className='mr-2 h-4 w-4' />
                          Recent
                        </TabsTrigger>
                        <TabsTrigger
                          value='favorites'
                          className='relative z-10 transition-all duration-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-10 px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground'>
                          <Star className='mr-2 h-4 w-4' />
                          Favorites
                        </TabsTrigger>
                      </TabsList>

                      {/* Filter panel */}
                      <AnimatePresence>
                        {showFilters && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className='overflow-hidden mb-4'>
                            <div className='p-4 border rounded-md bg-muted/50 space-y-4'>
                              <h3 className='font-medium'>Filter Workflows</h3>
                              <div className='grid gap-4 md:grid-cols-3'>
                                <div className='space-y-2'>
                                  <h4 className='text-sm font-medium'>
                                    Status
                                  </h4>
                                  <div className='flex flex-wrap gap-2'>
                                    <Badge
                                      variant='outline'
                                      className='cursor-pointer hover:bg-primary/10'>
                                      Active
                                    </Badge>
                                    <Badge
                                      variant='outline'
                                      className='cursor-pointer hover:bg-primary/10'>
                                      Paused
                                    </Badge>
                                    <Badge
                                      variant='outline'
                                      className='cursor-pointer hover:bg-primary/10'>
                                      Draft
                                    </Badge>
                                  </div>
                                </div>
                                <div className='space-y-2'>
                                  <h4 className='text-sm font-medium'>
                                    Created
                                  </h4>
                                  <div className='flex flex-wrap gap-2'>
                                    <Badge
                                      variant='outline'
                                      className='cursor-pointer hover:bg-primary/10'>
                                      Today
                                    </Badge>
                                    <Badge
                                      variant='outline'
                                      className='cursor-pointer hover:bg-primary/10'>
                                      This Week
                                    </Badge>
                                    <Badge
                                      variant='outline'
                                      className='cursor-pointer hover:bg-primary/10'>
                                      This Month
                                    </Badge>
                                  </div>
                                </div>
                                <div className='space-y-2'>
                                  <h4 className='text-sm font-medium'>Tags</h4>
                                  <div className='flex flex-wrap gap-2'>
                                    <Badge
                                      variant='outline'
                                      className='cursor-pointer hover:bg-primary/10'>
                                      Automation
                                    </Badge>
                                    <Badge
                                      variant='outline'
                                      className='cursor-pointer hover:bg-primary/10'>
                                      Integration
                                    </Badge>
                                    <Badge
                                      variant='outline'
                                      className='cursor-pointer hover:bg-primary/10'>
                                      API
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className='flex justify-end gap-2 pt-2'>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => setShowFilters(false)}>
                                  Cancel
                                </Button>
                                <Button
                                  size='sm'
                                  onClick={() => setShowFilters(false)}>
                                  Apply Filters
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Workflow List */}
                      {isLoading ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className={`grid gap-4 ${
                            viewMode === "grid"
                              ? "sm:grid-cols-2 lg:grid-cols-3"
                              : ""
                          }`}>
                          {[...Array(6)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.05 }}>
                              <Skeleton
                                className={
                                  viewMode === "grid"
                                    ? "h-48 rounded-md"
                                    : "h-20 rounded-md"
                                }
                              />
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : sortedWorkflows.length > 0 ? (
                        <AnimatePresence mode='wait'>
                          <motion.div
                            key={`${viewMode}-${activeTab}-${sortBy}-${searchQuery}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`grid gap-4 ${
                              viewMode === "grid"
                                ? "sm:grid-cols-2 lg:grid-cols-3"
                                : ""
                            }`}>
                            <AnimatePresence>
                              {sortedWorkflows.map((workflow, index) => (
                                <motion.div
                                  key={workflow.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  transition={{
                                    duration: 0.3,
                                    delay: index * 0.05,
                                  }}
                                  layout>
                                  <WorkflowCard
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
                                            "Your workflow has been deleted successfully.",
                                        });
                                      } catch (error) {
                                        toast({
                                          title: "Error deleting workflow",
                                          description:
                                            "Failed to delete workflow. Please try again.",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                  />
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </motion.div>
                        </AnimatePresence>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}>
                          <EmptyState
                            title='No workflows found'
                            description={
                              searchQuery
                                ? "No workflows match your search criteria. Try a different search term."
                                : "You haven't created any workflows yet. Get started by creating your first workflow."
                            }
                            action={
                              searchQuery ? (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant='outline'
                                    onClick={() => setSearchQuery("")}>
                                    Clear Search
                                  </Button>
                                </motion.div>
                              ) : (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  initial={{ scale: 0.9 }}
                                  animate={{ scale: [0.9, 1.05, 1] }}
                                  transition={{
                                    duration: 0.5,
                                    times: [0, 0.7, 1],
                                  }}>
                                  <Button
                                    onClick={handleCreateNew}
                                    className='shadow-md'>
                                    <PlusCircle className='mr-2 h-4 w-4' />
                                    Create Your First Workflow
                                  </Button>
                                </motion.div>
                              )
                            }
                          />
                        </motion.div>
                      )}
                    </Tabs>
                  </CardContent>
                  <CardFooter className='border-t py-3 px-6'>
                    <div className='flex justify-between items-center w-full text-xs text-muted-foreground'>
                      <div>
                        Showing {sortedWorkflows.length} of {workflows.length}{" "}
                        workflows
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={refreshWorkflows}
                        disabled={isRefreshing}>
                        <motion.div
                          animate={{ rotate: isRefreshing ? 360 : 0 }}
                          transition={{
                            duration: 1,
                            ease: "linear",
                            repeat: isRefreshing ? Infinity : 0,
                          }}
                          className='mr-1'>
                          <RefreshCw className='h-3 w-3' />
                        </motion.div>
                        Refresh
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
