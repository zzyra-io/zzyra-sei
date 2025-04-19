"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmptyState } from "@/components/empty-state"
import { WorkflowCard } from "@/components/workflow-card"
import { DatabaseSetup } from "@/components/database-setup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { workflowService } from "@/lib/services/workflow-service"
import type { WorkflowSummary } from "@/lib/supabase/schema"
import { PlusCircle, Search, Clock, Star, Zap, ArrowUpDown, LayoutGrid, List } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type SortOption = "newest" | "oldest" | "name" | "last-run"
type ViewMode = "grid" | "list"

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [tableExists, setTableExists] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()
  const router = useRouter()

  const fetchWorkflows = async () => {
    setIsLoading(true)
    try {
      const data = await workflowService.getUserWorkflows()
      setWorkflows(data)
      setTableExists(true)
    } catch (error) {
      console.error("Error fetching workflows:", error)
      // Check if the error is about the table not existing
      if (error instanceof Error && error.message.includes("relation") && error.message.includes("does not exist")) {
        setTableExists(false)
      } else {
        toast({
          title: "Error fetching workflows",
          description: "Failed to load your workflows. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [toast])

  // Filter workflows based on search query and active tab
  const filteredWorkflows = workflows.filter((workflow) => {
    // Search filter
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    // Tab filter
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "recent" && new Date(workflow.updated_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) ||
      (activeTab === "favorites" && workflow.is_favorite)

    return matchesSearch && matchesTab
  })

  // Sort workflows
  const sortedWorkflows = [...filteredWorkflows].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case "name":
        return a.name.localeCompare(b.name)
      case "last-run":
        return new Date(b.last_run || 0).getTime() - new Date(a.last_run || 0).getTime()
      default:
        return 0
    }
  })

  const handleCreateNew = () => {
    router.push("/builder")
  }

  const handleDatabaseSetupComplete = () => {
    fetchWorkflows()
  }

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      // Update local state immediately for responsive UI
      setWorkflows(workflows.map((w) => (w.id === id ? { ...w, is_favorite: isFavorite } : w)))

      // Update in database
      await workflowService.updateWorkflow(id, { is_favorite: isFavorite })
    } catch (error) {
      toast({
        title: "Error updating workflow",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive",
      })
      // Revert on error
      setWorkflows(workflows)
    }
  }

  if (!tableExists) {
    return (
      <AuthGate>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-bold tracking-tight">My Workflows</h1>
              </div>
              <div className="py-8">
                <DatabaseSetup onSetupComplete={handleDatabaseSetupComplete} />
              </div>
            </div>
          </main>
        </div>
      </AuthGate>
    )
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Dashboard Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Workflows</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workflows.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {workflows.length > 0
                      ? `Last created on ${new Date(workflows[0].created_at).toLocaleDateString()}`
                      : "No workflows created yet"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Recent Executions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground mt-1">No recent executions</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCreateNew} className="flex-1">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Workflow
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push("/templates")}>
                    <Zap className="mr-2 h-4 w-4" />
                    Templates
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Workflows Header and Controls */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <h1 className="text-2xl font-bold tracking-tight">My Workflows</h1>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search workflows..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        Sort
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest first</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest first</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("name")}>Name (A-Z)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("last-run")}>Last executed</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex border rounded-md overflow-hidden">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button onClick={handleCreateNew} className="whitespace-nowrap">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New
                  </Button>
                </div>
              </div>
            </div>

            {/* Workflow Tabs */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All Workflows</TabsTrigger>
                <TabsTrigger value="recent">
                  <Clock className="mr-2 h-4 w-4" />
                  Recent
                </TabsTrigger>
                <TabsTrigger value="favorites">
                  <Star className="mr-2 h-4 w-4" />
                  Favorites
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Workflow List */}
            {isLoading ? (
              <div className={`grid gap-4 ${viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className={viewMode === "grid" ? "h-48 rounded-md" : "h-20 rounded-md"} />
                ))}
              </div>
            ) : sortedWorkflows.length > 0 ? (
              <div className={`grid gap-4 ${viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
                {sortedWorkflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    viewMode={viewMode}
                    onFavoriteToggle={(isFavorite) => toggleFavorite(workflow.id, isFavorite)}
                    onDelete={async () => {
                      try {
                        await workflowService.deleteWorkflow(workflow.id)
                        setWorkflows(workflows.filter((w) => w.id !== workflow.id))
                        toast({
                          title: "Workflow deleted",
                          description: "Your workflow has been deleted successfully.",
                        })
                      } catch (error) {
                        toast({
                          title: "Error deleting workflow",
                          description: "Failed to delete workflow. Please try again.",
                          variant: "destructive",
                        })
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
                    ? "No workflows match your search criteria. Try a different search term."
                    : "You haven't created any workflows yet. Get started by creating your first workflow."
                }
                action={
                  searchQuery ? (
                    <Button variant="outline" onClick={() => setSearchQuery("")}>
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
          </div>
        </main>
      </div>
    </AuthGate>
  )
}
