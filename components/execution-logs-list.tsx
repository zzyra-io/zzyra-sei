"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react"
import { formatDistanceToNow, formatDistance } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

interface ExecutionLogsListProps {
  logs: any[]
  workflowId: string
}

export function ExecutionLogsList({ logs: initialLogs, workflowId }: ExecutionLogsListProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [logs, setLogs] = useState<any[]>(initialLogs || [])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({}) // Track expanded state for each log+node combination
  // Filtering and sorting state
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'started_at'|'duration'>('started_at')
  const [sortAsc, setSortAsc] = useState<boolean>(false)

  // Real-time subscription for workflow_executions
  useEffect(() => {
    const execSub = supabase
      .channel('realtime-workflow-execs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_executions', filter: `workflow_id=eq.${workflowId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLogs((prev) => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setLogs((prev) => prev.map((l) => (l.id === payload.new.id ? payload.new : l)))
        }
      })
      .subscribe()

    // Subscribe to node_executions for real-time node data
    const nodeSub = supabase
      .channel('realtime-node-execs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'node_executions' }, (payload) => {
        const newNode = payload.new as any
        setLogs((prev) =>
          prev.map((log) =>
            log.id === newNode.execution_id
              ? { ...log, node_executions: [...(log.node_executions || []), newNode] }
              : log
          )
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(execSub)
      supabase.removeChannel(nodeSub)
    }
  }, [workflowId])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      
      // 1. Fetch workflow definition to get all nodes
      const { data: workflowData, error: workflowError } = await supabase
        .from("workflows")
        .select("nodes")
        .eq("id", workflowId)
        .single();
        
      if (workflowError) {
        console.error("Error fetching workflow definition:", workflowError);
      }
      
      // Ensure nodes is an array
      const workflowNodes = Array.isArray(workflowData?.nodes) ? workflowData.nodes : [];
      
      // 2. Fetch execution logs with node executions
      let query = supabase
        .from("workflow_executions")
        .select("*, node_executions(*)")
        .eq("workflow_id", workflowId)
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      
      if (sortKey === 'started_at') {
        query = query.order('started_at', { ascending: sortAsc })
      }
      
      // Sorting by duration (completed only)
      if (sortKey === 'duration') {
        // client-side sort after fetch
        const { data, error } = await query
        if (error) throw new Error(`Failed to fetch execution logs: ${error.message}`)
        
        const sorted = (data || []).slice().sort((a, b) => {
          const aDur = a.completed_at && a.started_at ? new Date(a.completed_at).getTime() - new Date(a.started_at).getTime() : 0
          const bDur = b.completed_at && b.started_at ? new Date(b.completed_at).getTime() - new Date(b.started_at).getTime() : 0
          return sortAsc ? aDur - bDur : bDur - aDur
        })
        
        // Enhance each execution with complete node list
        const enhancedLogs = sorted.map(log => {
          // Create a map of existing node executions
          const nodeExecutions = Array.isArray(log.node_executions) ? log.node_executions : [];
          const nodeExecMap = new Map(
            nodeExecutions.map((ne: any) => [ne.node_id, ne])
          );
          
          // Merge workflow nodes with executions
          const mergedNodes = workflowNodes.map((node: any) => {
            const exec = nodeExecMap.get(node.id);
            if (exec) return exec;
            
            // Create a pending node execution if not found
            return {
              id: `pending-${node.id}-${log.id}`,
              execution_id: log.id,
              node_id: node.id,
              status: 'pending',
              started_at: null,
              completed_at: null,
            };
          });
          
          return { ...log, node_executions: mergedNodes };
        });
        
        setLogs(enhancedLogs);
        return;
      }
      
      const { data, error } = await query
      if (error) throw new Error(`Failed to fetch execution logs: ${error.message}`)
      
      // Enhance each execution with complete node list
      const enhancedLogs = (data || []).map(log => {
        // Create a map of existing node executions
        const nodeExecutions = Array.isArray(log.node_executions) ? log.node_executions : [];
        const nodeExecMap = new Map(
          nodeExecutions.map((ne: any) => [ne.node_id, ne])
        );
        
        // Merge workflow nodes with executions
        const mergedNodes = workflowNodes.map((node: any) => {
          const exec = nodeExecMap.get(node.id);
          if (exec) return exec;
          
          // Create a pending node execution if not found
          return {
            id: `pending-${node.id}-${log.id}`,
            execution_id: log.id,
            node_id: node.id,
            status: 'pending',
            started_at: null,
            completed_at: null,
          };
        });
        
        return { ...log, node_executions: mergedNodes };
      });
      
      setLogs(enhancedLogs)
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setIsLoading(false)
    }
  }


  // Initial load of logs with node_executions
  useEffect(() => {
    fetchLogs()
  }, [workflowId, statusFilter, sortKey, sortAsc])

  const toggleLogExpanded = (logId: string, nodeId: string) => {
    const key = `${logId}-${nodeId}`
    setExpandedLogs(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Failed
          </Badge>
        )
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Running
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return `${date.toLocaleString()} (${formatDistanceToNow(date, { addSuffix: true })})`
    } catch (e) {
      return dateString
    }
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No execution logs yet</h3>
        <p className="text-muted-foreground text-center mb-6">Execute your workflow to see logs appear here.</p>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Execution Logs</h2>
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Status:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
          </select>
          <label className="text-sm font-medium ml-4">Sort by:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            aria-label="Sort by field"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as 'started_at'|'duration')}
          >
            <option value="started_at">Start Time</option>
            <option value="duration">Duration</option>
          </select>
          <Button variant="ghost" size="icon" onClick={() => setSortAsc(a => !a)} title={sortAsc ? 'Ascending' : 'Descending'}>
            {sortAsc ? <span>&uarr;</span> : <span>&darr;</span>}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={isLoading ? "animate-spin mr-2 h-4 w-4" : "mr-2 h-4 w-4"} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {logs.map((log: any) => (
          <Card key={log.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    Execution {log.id.substring(0, 8)}
                  </CardTitle>
                  <CardDescription>Started: {formatDate(log.started_at)}</CardDescription>
                </div>
                {getStatusBadge(log.status)}
              </div>
            </CardHeader>

            <Accordion
              type="single"
              collapsible
              value={expandedLogs[log.id] ? log.id : ""}
              onValueChange={(val) => {
                setExpandedLogs(prev => ({
                  ...prev,
                  [log.id]: val === log.id
                }))
              }}
            >
              <AccordionItem value={log.id} className="border-0">
                <AccordionTrigger className="py-2 px-6">View Details</AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Started</p>
                          <p className="text-sm text-muted-foreground">{formatDate(log.started_at)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Completed</p>
                          <p className="text-sm text-muted-foreground">
                            {log.completed_at ? formatDate(log.completed_at) : "Not completed"}
                          </p>
                        </div>
                      </div>

                      {log.error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-sm font-medium text-red-800">Error</p>
                          <p className="text-sm text-red-700">{log.error}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium mb-2">Node Executions</p>
                        {!log.node_executions ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Loading node executions...</span>
                          </div>
                        ) : (
                          <div className="border rounded-md divide-y">
                            {log.node_executions.map((nodeExec: any) => (
                              <div key={nodeExec.id} className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(nodeExec.status)}
                                    <span className="text-sm font-medium">Node: {nodeExec.node_id}</span>
                                  </div>
                                  {getStatusBadge(nodeExec.status)}
                                </div>

                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(nodeExec.completed_at || nodeExec.started_at)}
                                </p>
                                
                                {/* Actionable Controls - Contextual based on node status */}
                                <div className="flex flex-wrap gap-2 mt-3 items-center justify-between border-t pt-2">
                                  <div className="flex gap-1.5">
                                    {/* Show pause only for running nodes */}
                                    {nodeExec.status === 'running' && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-7 text-xs px-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                        onClick={async () => {
                                          try {
                                            await fetch(`/api/executions/${log.id}/pause`, {method: 'POST'});
                                            toast({ title: 'Execution paused', variant: 'default' });
                                            fetchLogs();
                                          } catch (err) {
                                            toast({ title: 'Failed to pause', variant: 'destructive' });
                                          }
                                        }}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                        Pause
                                      </Button>
                                    )}
                                    
                                    {/* Show cancel for running or paused nodes */}
                                    {(nodeExec.status === 'running' || nodeExec.status === 'paused') && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-7 text-xs px-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                                        onClick={async () => {
                                          try {
                                            await fetch(`/api/executions/${log.id}/cancel`, {method: 'POST'});
                                            toast({ title: 'Execution canceled', variant: 'default' });
                                            fetchLogs();
                                          } catch (err) {
                                            toast({ title: 'Failed to cancel', variant: 'destructive' });
                                          }
                                        }}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        Cancel
                                      </Button>
                                    )}
                                    
                                    {/* Show retry for failed nodes */}
                                    {nodeExec.status === 'failed' && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-7 text-xs px-2 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
                                        onClick={async () => {
                                          try {
                                            await fetch(`/api/executions/${log.id}/retry`, {
                                              method: 'POST',
                                              body: JSON.stringify({ nodeId: nodeExec.node_id })
                                            });
                                            toast({ title: 'Retry enqueued', variant: 'default' });
                                            fetchLogs();
                                          } catch (err) {
                                            toast({ title: 'Failed to retry', variant: 'destructive' });
                                          }
                                        }}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                                        Retry
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {/* Resume button for paused nodes */}
                                  <div>
                                    {nodeExec.status === 'paused' && (
                                      <Button 
                                        size="sm" 
                                        variant="default" 
                                        className="h-7 text-xs px-3 bg-green-600 hover:bg-green-700"
                                        onClick={() => {
                                          // Expand this specific log+node combination
                                          const key = `${log.id}-${nodeExec.node_id}`
                                          setExpandedLogs(prev => ({
                                            ...prev,
                                            [key]: true
                                          }))
                                        }}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                        Resume
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Node Logs Section */}
                                <div className="mt-3">
                                  <Accordion 
                                    type="single" 
                                    collapsible 
                                    value={expandedLogs[`${log.id}-${nodeExec.node_id}`] ? `${log.id}-${nodeExec.node_id}` : ""}
                                    onValueChange={(val) => {
                                      const key = `${log.id}-${nodeExec.node_id}`
                                      setExpandedLogs(prev => ({
                                        ...prev,
                                        [key]: val === key
                                      }))
                                    }}
                                  >                                    
                                    <AccordionItem value={`${log.id}-${nodeExec.node_id}`}>
                                      <AccordionTrigger className="text-xs py-1">View Logs & Details</AccordionTrigger>
                                      <AccordionContent>
                                        {/* Log Level Filter */}
                                        <div className="mb-3 flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">Filter:</span>
                                            <select 
                                              className="text-xs border rounded px-2 py-1 bg-white"
                                              defaultValue="all"
                                              aria-label="Filter logs by level"
                                              onChange={(e) => {
                                                // Filter logs by level (would need to implement this filtering)
                                                console.log('Filter logs by', e.target.value);
                                              }}
                                            >
                                              <option value="all">All Levels</option>
                                              <option value="info">Info</option>
                                              <option value="warning">Warning</option>
                                              <option value="error">Error</option>
                                            </select>
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {log.logs?.filter((l: any) => l.node_id === nodeExec.node_id).length || 0} log entries
                                          </div>
                                        </div>
                                        
                                        {/* Node Logs */}
                                        <div className="bg-gray-50 border rounded-md p-3 max-h-48 overflow-y-auto text-xs font-mono">
                                          {log.logs && log.logs.filter((l: any) => l.node_id === nodeExec.node_id).map((logEntry: any, idx: number) => {
                                            // Determine log level styling
                                            let levelClass = '';
                                            let levelBadge = null;
                                            
                                            if (logEntry.level === 'error') {
                                              levelClass = 'text-red-700 bg-red-50 border-red-100';
                                              levelBadge = <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-medium">ERROR</span>;
                                            } else if (logEntry.level === 'warning') {
                                              levelClass = 'text-amber-700 bg-amber-50 border-amber-100';
                                              levelBadge = <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-medium">WARN</span>;
                                            } else {
                                              levelClass = 'text-blue-700 bg-blue-50 border-blue-100';
                                              levelBadge = <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">INFO</span>;
                                            }
                                            
                                            return (
                                              <div key={idx} className={`mb-2 p-1.5 rounded border ${levelClass}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                  <div className="flex items-center gap-1.5">
                                                    {levelBadge}
                                                    <span className="text-[10px] opacity-80">{new Date(logEntry.timestamp).toLocaleTimeString()}</span>
                                                  </div>
                                                  {logEntry.data && (
                                                    <Button 
                                                      variant="ghost" 
                                                      size="sm" 
                                                      className="text-[10px] p-0 h-5 px-1.5"
                                                      onClick={() => {
                                                        // Show log details in a modal
                                                        console.log('Log details', logEntry.data);
                                                      }}
                                                    >
                                                      View JSON
                                                    </Button>
                                                  )}
                                                </div>
                                                <div>{logEntry.message}</div>
                                              </div>
                                            );
                                          })}
                                          {(!log.logs || !log.logs.filter((l: any) => l.node_id === nodeExec.node_id).length) && (
                                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                              <div>No logs available for this node</div>
                                              {nodeExec.status === 'pending' && <div className="text-xs mt-1">Node has not started execution yet</div>}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Output Data */}
                                        {nodeExec.output_data && (
                                          <div className="mt-2">
                                            <div className="font-medium text-xs mb-1">Output Data</div>
                                            <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-40">
                                              {JSON.stringify(nodeExec.output_data, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                        
                                        {/* Error Details */}
                                        {nodeExec.error && (
                                          <div className="mt-2">
                                            <div className="font-medium text-xs mb-1 text-red-700">Error</div>
                                            <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                              <p className="text-xs text-red-700">{nodeExec.error}</p>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Paused Node Resume Controls */}
                                        {nodeExec.status === 'paused' && (
                                          <div className="mt-4 border rounded-md bg-green-50 border-green-100 p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                              <div className="font-medium text-sm text-green-800">Resume Paused Execution</div>
                                            </div>
                                            
                                            <div className="text-xs text-green-700 mb-2">
                                              This node is paused. You can modify the input data before resuming execution.
                                            </div>
                                            
                                            <div className="mb-1 text-xs font-medium text-green-800">Input Data:</div>
                                            <textarea 
                                              id={`resume-data-${log.id}-${nodeExec.node_id}`}
                                              className="w-full text-xs border rounded p-2 mb-3 font-mono bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                                              rows={5}
                                              placeholder="Edit input data before resuming (JSON format)"
                                            />
                                            
                                            <div className="flex justify-between items-center">
                                              <Button 
                                                variant="outline"
                                                size="sm"
                                                className="text-xs bg-white border-green-200 text-green-700 hover:bg-green-100"
                                                onClick={async () => {
                                                  try {
                                                    // Get the node's input snapshot
                                                    const res = await fetch(`/api/executions/${log.id}/node-snapshot/${nodeExec.node_id}`);
                                                    if (res.ok) {
                                                      const data = await res.json();
                                                      const textareaEl = document.getElementById(`resume-data-${log.id}-${nodeExec.node_id}`) as HTMLTextAreaElement;
                                                      if (textareaEl && data.inputData) {
                                                        textareaEl.value = JSON.stringify(data.inputData, null, 2);
                                                      }
                                                    }
                                                  } catch (err) {
                                                    toast({ title: 'Failed to load input data', variant: 'destructive' });
                                                  }
                                                }}
                                              >
                                                Load Input Data
                                              </Button>
                                              
                                              <Button 
                                                size="sm"
                                                className="text-xs bg-green-600 hover:bg-green-700"
                                                onClick={async () => {
                                                  try {
                                                    // Get the textarea value
                                                    const textareaEl = document.getElementById(`resume-data-${log.id}-${nodeExec.node_id}`) as HTMLTextAreaElement;
                                                    let resumeData = {};
                                                    try {
                                                      resumeData = JSON.parse(textareaEl?.value || '{}');
                                                    } catch (e) {
                                                      toast({ title: 'Invalid JSON format', description: 'Please check your input data', variant: 'destructive' });
                                                      return;
                                                    }
                                                    
                                                    await fetch(`/api/executions/${log.id}/resume`, {
                                                      method: 'POST',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({ resumeData, nodeId: nodeExec.node_id })
                                                    });
                                                    toast({ title: 'Execution resumed', description: 'Workflow will continue execution', variant: 'default' });
                                                    
                                                    // Close this specific accordion
                                                    const key = `${log.id}-${nodeExec.node_id}`
                                                    setExpandedLogs(prev => ({
                                                      ...prev,
                                                      [key]: false
                                                    }));
                                                    
                                                    fetchLogs();
                                                  } catch (err) {
                                                    toast({ title: 'Failed to resume execution', variant: 'destructive' });
                                                  }
                                                }}
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                                Resume Execution
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <CardFooter className="pt-0">
              <div className="w-full flex justify-between text-xs text-muted-foreground">
                <span>
                  Duration:{" "}
                  {log.completed_at
                    ? formatDistance(new Date(log.started_at), new Date(log.completed_at))
                    : "In progress"}
                </span>
                <span>ID: {log.id}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
