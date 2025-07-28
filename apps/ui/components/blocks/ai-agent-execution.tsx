"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  Brain, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Zap, 
  Lightbulb,
  Settings,
  Play,
  Pause
} from "lucide-react"
import { AIAgentExecution, ThinkingStep, ToolCall } from "@zyra/types"
import { formatDistanceToNow } from "date-fns"

interface ExecutionPanelProps {
  execution: AIAgentExecution | null
  onStop?: () => void
  onRetry?: () => void
}

export function AIAgentExecutionPanel({ execution, onStop, onRetry }: ExecutionPanelProps) {
  if (!execution) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-gray-400" />
            AI Agent Execution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No execution in progress
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = () => {
    switch (execution.status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Brain className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (execution.status) {
      case 'running': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const calculateProgress = () => {
    if (!execution.steps) return 0
    const completedSteps = execution.steps.filter(s => s.confidence > 0).length
    return Math.min((completedSteps / (execution.steps.length || 1)) * 100, 100)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            AI Agent Execution
            <Badge variant={execution.status === 'running' ? 'default' : 'secondary'}>
              {execution.status}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {execution.status === 'running' && onStop && (
              <Button size="sm" variant="outline" onClick={onStop}>
                <Pause className="h-3 w-3 mr-1" />
                Stop
              </Button>
            )}
            {execution.status === 'failed' && onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <Play className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        {execution.status === 'running' && (
          <div className="space-y-1">
            <Progress value={calculateProgress()} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Step {execution.steps?.length || 0} • {formatDistanceToNow(execution.startTime)} elapsed
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Result */}
        {execution.result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Result</span>
            </div>
            <div className="bg-muted/50 p-3 rounded-md text-sm">
              {execution.result}
            </div>
          </div>
        )}

        {/* Error */}
        {execution.error && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="font-medium">Error</span>
            </div>
            <div className="bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800">
              {execution.error}
            </div>
          </div>
        )}

        {/* Thinking Steps */}
        {execution.steps && execution.steps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">Thinking Process</span>
            </div>
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-3 space-y-3">
                {execution.steps.map((step, index) => (
                  <ThinkingStepCard key={index} step={step} />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Tool Calls */}
        {execution.toolCalls && execution.toolCalls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Tool Executions</span>
            </div>
            <ScrollArea className="h-32 border rounded-md">
              <div className="p-3 space-y-2">
                {execution.toolCalls.map((call, index) => (
                  <ToolCallCard key={index} call={call} />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Execution Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">{execution.steps?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Thinking Steps</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{execution.toolCalls?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Tools Used</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ThinkingStepCard({ step }: { step: ThinkingStep }) {
  const getStepIcon = () => {
    switch (step.type) {
      case 'planning': return <Settings className="h-3 w-3 text-blue-500" />
      case 'tool_selection': return <Zap className="h-3 w-3 text-purple-500" />
      case 'execution': return <Play className="h-3 w-3 text-green-500" />
      case 'reflection': return <Lightbulb className="h-3 w-3 text-yellow-500" />
      default: return <Brain className="h-3 w-3 text-gray-500" />
    }
  }

  const getConfidenceColor = () => {
    if (step.confidence >= 0.8) return 'bg-green-500'
    if (step.confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStepIcon()}
          <span className="text-xs font-medium capitalize">{step.type.replace('_', ' ')}</span>
          <Badge variant="outline" className="h-4 text-xs">
            Step {step.step}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${getConfidenceColor()}`} />
          <span className="text-xs text-muted-foreground">
            {Math.round(step.confidence * 100)}%
          </span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground pl-5">
        {step.reasoning.length > 150 
          ? `${step.reasoning.substring(0, 150)}...`
          : step.reasoning
        }
      </div>
      {step.decision && (
        <div className="text-xs font-medium text-blue-600 pl-5">
          Decision: {step.decision}
        </div>
      )}
    </div>
  )
}

function ToolCallCard({ call }: { call: ToolCall }) {
  const hasError = !!call.error
  
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {hasError ? (
          <XCircle className="h-3 w-3 text-red-500" />
        ) : (
          <CheckCircle className="h-3 w-3 text-green-500" />
        )}
        <span className="text-xs font-medium">{call.name}</span>
        {call.duration && (
          <span className="text-xs text-muted-foreground">
            ({call.duration}ms)
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {hasError ? 'Failed' : 'Success'}
      </div>
    </div>
  )
}