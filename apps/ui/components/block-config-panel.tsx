"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Play,
  Settings,
  CheckCircle,
  AlertCircle,
  Activity,
  Code,
  FlaskConical,
  ArrowRight,
  ArrowLeft,
  Zap,
  Database,
  Mail,
  CheckCircle2,
  XCircle,
  Radio,
  Info,
  FileText,
  Terminal,
  AlertTriangle,
  Archive,
  Bell,
  Book,
  Bookmark,
  Box,
  Calendar,
  Camera,
  ChevronRight,
  Clock,
  Cloud,
  Cog,
  Copy,
  CreditCard,
  Download,
  Edit,
  Eye,
  Filter,
  Folder,
  Globe,
  Hash,
  Heart,
  Home,
  ImageIcon,
  Key,
  Link,
  Lock,
  Map,
  MessageCircle,
  Mic,
  Monitor,
  Music,
  Package,
  Palette,
  Phone,
  Plus,
  Printer,
  RefreshCwIcon as Refresh,
  Save,
  Search,
  Send,
  Share,
  Shield,
  ShoppingCart,
  Smartphone,
  Star,
  Tag,
  Target,
  Trash,
  Upload,
  User,
  Users,
  Video,
  Wifi,
  Wrench,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { blockConfigRegistry } from "@/lib/block-config-registry";
import { getBlockMetadata, getBlockType } from "@zyra/types";
import { ScrollArea } from "./ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNodeSchema } from "./schema-aware-connection";

// Comprehensive icon mapping with categories
const ICONS: Record<string, LucideIcon> = {
  // Core workflow icons
  zap: Zap,
  database: Database,
  mail: Mail,
  "check-circle": CheckCircle2,
  "x-circle": XCircle,
  loader: Loader2,
  radio: Radio,
  info: Info,
  "file-text": FileText,
  terminal: Terminal,
  "alert-triangle": AlertTriangle,

  // Communication & Social
  "message-circle": MessageCircle,
  phone: Phone,
  send: Send,
  bell: Bell,
  share: Share,
  mic: Mic,

  // Data & Storage
  archive: Archive,
  folder: Folder,
  save: Save,
  download: Download,
  upload: Upload,
  copy: Copy,
  package: Package,
  box: Box,

  // Navigation & Movement
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  "chevron-right": ChevronRight,
  refresh: Refresh,
  link: Link,

  // Media & Content
  image: ImageIcon,
  video: Video,
  music: Music,
  camera: Camera,
  palette: Palette,
  book: Book,
  bookmark: Bookmark,

  // System & Tools
  settings: Settings,
  cog: Cog,
  wrench: Wrench,
  code: Code,
  monitor: Monitor,
  smartphone: Smartphone,
  printer: Printer,

  // Security & Access
  shield: Shield,
  lock: Lock,
  key: Key,
  user: User,
  users: Users,
  eye: Eye,

  // Business & Commerce
  "credit-card": CreditCard,
  "shopping-cart": ShoppingCart,
  tag: Tag,
  target: Target,

  // Time & Events
  clock: Clock,
  calendar: Calendar,
  activity: Activity,

  // Network & Connectivity
  globe: Globe,
  cloud: Cloud,
  wifi: Wifi,

  // Actions & Controls
  play: Play,
  plus: Plus,
  edit: Edit,
  trash: Trash,
  search: Search,
  filter: Filter,

  // Status & Feedback
  "alert-circle": AlertCircle,
  heart: Heart,
  star: Star,
  home: Home,
  map: Map,
  hash: Hash,
};

// Block type to icon mapping for intelligent defaults
const BLOCK_TYPE_ICONS: Record<string, string> = {
  // Triggers
  webhook: "zap",
  "api-trigger": "zap",
  schedule: "clock",
  "email-trigger": "mail",
  "form-submit": "send",

  // Data operations
  "database-query": "database",
  "fetch-data": "download",
  "store-data": "save",
  "transform-data": "refresh",
  "filter-data": "filter",

  // Communication
  "send-email": "mail",
  "send-sms": "phone",
  "slack-message": "message-circle",
  "webhook-call": "send",
  notification: "bell",

  // File operations
  "upload-file": "upload",
  "download-file": "download",
  "process-image": "image",
  "generate-pdf": "file-text",

  // Integrations
  "google-sheets": "file-text",
  salesforce: "users",
  stripe: "credit-card",
  shopify: "shopping-cart",
  github: "code",

  // Logic & Control
  condition: "chevron-right",
  loop: "refresh",
  delay: "clock",
  branch: "arrow-right",

  // Analytics & Monitoring
  "log-event": "activity",
  "track-metric": "target",
  "generate-report": "file-text",
};

// Icon resolution with intelligent fallbacks
const resolveIcon = (iconName?: string, blockType?: string): LucideIcon => {
  if (!iconName && !blockType) {
    return HelpCircle;
  }

  // Try exact icon name match first
  if (iconName) {
    const normalizedIconName = iconName.toLowerCase().replace(/[_\s]/g, "-");
    if (ICONS[normalizedIconName]) {
      return ICONS[normalizedIconName];
    }

    // Try partial matches for common variations
    const partialMatch = Object.keys(ICONS).find(
      (key) =>
        key.includes(normalizedIconName) || normalizedIconName.includes(key)
    );
    if (partialMatch) {
      return ICONS[partialMatch];
    }
  }

  // Try block type mapping
  if (blockType) {
    const normalizedBlockType = blockType.toLowerCase().replace(/[_\s]/g, "-");
    if (BLOCK_TYPE_ICONS[normalizedBlockType]) {
      return ICONS[BLOCK_TYPE_ICONS[normalizedBlockType]];
    }

    // Try partial block type matches
    const blockTypeMatch = Object.keys(BLOCK_TYPE_ICONS).find(
      (key) =>
        key.includes(normalizedBlockType) || normalizedBlockType.includes(key)
    );
    if (blockTypeMatch) {
      return ICONS[BLOCK_TYPE_ICONS[blockTypeMatch]];
    }
  }

  // Category-based fallbacks based on common keywords
  const categoryFallbacks: Record<string, string> = {
    email: "mail",
    message: "message-circle",
    data: "database",
    file: "file-text",
    api: "zap",
    webhook: "send",
    schedule: "clock",
    user: "user",
    payment: "credit-card",
    notification: "bell",
    image: "image",
    video: "video",
    audio: "music",
    security: "shield",
    analytics: "activity",
    report: "file-text",
  };

  const searchText = `${iconName || ""} ${blockType || ""}`.toLowerCase();
  for (const [keyword, fallbackIcon] of Object.entries(categoryFallbacks)) {
    if (searchText.includes(keyword)) {
      return ICONS[fallbackIcon];
    }
  }

  // Ultimate fallback
  return HelpCircle;
};

// Define NodeSchema interface locally
interface NodeSchema {
  input: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  output: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}

// Define TypeScript interfaces for better type safety
interface WorkflowEdge {
  source: string;
  target: string;
}

interface WorkflowNode {
  id: string;
  data: Record<string, unknown>;
}

interface WorkflowData {
  workflowId?: string;
  selectedNodeId?: string;
  edges?: WorkflowEdge[];
  nodes?: WorkflowNode[];
}

interface ConnectedNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

interface BlockConfigPanelProps {
  node?: { id: string; data: Record<string, unknown> };
  nodeData?: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  executionStatus?: "idle" | "running" | "success" | "error" | "warning";
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    lastResponse?: Record<string, unknown>;
  };
  onTest?: () => void;
  connectedNodes?: ConnectedNode[];
  workflowData?: WorkflowData;
  onOpenDataTransform?: () => void;
  enableDataTransformation?: boolean;
  onConfigurationChange?: (config: Record<string, unknown>) => void;
}

export function BlockConfigPanel({
  node,
  nodeData,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
  workflowData = {},
}: BlockConfigPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>(["config"]);
  const [nodeSchema, setNodeSchema] = useState<NodeSchema | null>(null);
  const [compatibilityIssues, setCompatibilityIssues] = useState<
    Array<{
      field: string;
      issue: string;
      severity: "error" | "warning" | "info";
      suggestion?: string;
      sourceNode?: string;
    }>
  >([]);

  const data = useMemo(
    () => nodeData || node?.data || {},
    [nodeData, node?.data]
  );

  const memoizedOnChange = useCallback(
    (config: Record<string, unknown>) => {
      const currentData = nodeData || node?.data || {};
      const updatedData = {
        ...currentData,
        config: config,
      };
      onChange(updatedData);
    },
    [onChange, nodeData, node?.data]
  );

  const blockType = getBlockType(data);
  const metadata = getBlockMetadata(blockType);

  // Resolve icon with intelligent fallbacks
  const BlockIcon = useMemo(() => {
    // Try to get icon from metadata first, then from data, then resolve dynamically
    const iconName =
      metadata?.iconName || (data.iconName as string) || metadata?.icon;
    return resolveIcon(iconName, blockType);
  }, [metadata?.iconName, metadata?.icon, data.iconName, blockType]);

  const ConfigComponent =
    blockConfigRegistry.get(blockType) ||
    (() => (
      <Alert variant='destructive'>
        <AlertCircle className='h-4 w-4' />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          No configuration component found for block type: {blockType}
        </AlertDescription>
      </Alert>
    ));

  const inputNodes = useMemo(() => {
    if (
      !workflowData?.edges ||
      !workflowData?.selectedNodeId ||
      !workflowData?.nodes
    ) {
      return [];
    }
    const inputEdges = workflowData.edges.filter(
      (edge) => edge.target === workflowData.selectedNodeId
    );
    const inputNodeIds = inputEdges.map((edge) => edge.source);
    return workflowData.nodes.filter((node) => inputNodeIds.includes(node.id));
  }, [workflowData?.edges, workflowData?.selectedNodeId, workflowData?.nodes]);

  useEffect(() => {
    const currentData = nodeData || node?.data || {};
    const schema = getNodeSchema(blockType, currentData.config || {});
    setNodeSchema(schema);
  }, [blockType, nodeData, node?.data]);

  useEffect(() => {
    if (!nodeSchema || inputNodes.length === 0) {
      setCompatibilityIssues([]);
      return;
    }
    const issues: Array<{
      field: string;
      issue: string;
      severity: "error" | "warning" | "info";
      suggestion?: string;
      sourceNode?: string;
    }> = [];
    for (const inputNode of inputNodes) {
      const inputSchema = extractSchemaDefinition(
        inputNode.data.outputSchema as Record<string, unknown>
      );
      if (!inputSchema) continue;
      for (const requiredInput of nodeSchema.input) {
        const matchingField = (
          inputSchema.properties as Record<string, unknown>
        )?.[requiredInput.name];
        if (!matchingField && requiredInput.required) {
          issues.push({
            field: requiredInput.name,
            issue: `Missing required input: '${requiredInput.name}'`,
            severity: "error",
            suggestion: `Ensure the source node '${inputNode.id}' provides this output.`,
            sourceNode: inputNode.id,
          });
        } else if (
          matchingField &&
          (matchingField as Record<string, unknown>).type !== requiredInput.type
        ) {
          issues.push({
            field: requiredInput.name,
            issue: `Type mismatch for '${requiredInput.name}'. Expected ${
              requiredInput.type
            }, got ${(matchingField as Record<string, unknown>).type}.`,
            severity: "warning",
            suggestion: `Consider adding a transformation step.`,
            sourceNode: inputNode.id,
          });
        }
      }
    }
    setCompatibilityIssues(issues);
  }, [nodeSchema, inputNodes]);

  const extractSchemaDefinition = (
    schema:
      | {
          type?: string;
          properties?: Record<string, unknown>;
          required?: string[];
          items?: unknown;
        }
      | undefined
  ): Record<string, unknown> | null => {
    if (!schema) return null;
    if (schema.type === "object" && schema.properties) {
      return {
        type: "object",
        properties: schema.properties,
        required: schema.required || [],
      };
    }
    if (schema.type === "array" && schema.items) {
      return {
        type: "array",
        items: extractSchemaDefinition(schema.items as typeof schema),
      };
    }
    if (schema.type) {
      return { type: schema.type };
    }
    return {};
  };

  const StatusInfo = ({
    status,
    data,
  }: {
    status: BlockConfigPanelProps["executionStatus"];
    data: BlockConfigPanelProps["executionData"];
  }) => {
    if (status === "idle" || !data) return null;

    const statusMap = {
      running: {
        icon: Loader2,
        title: "Running test...",
        color: "text-blue-500",
        borderColor: "border-blue-500/20",
        iconClass: "animate-spin",
      },
      success: {
        icon: CheckCircle,
        title: "Test Successful",
        color: "text-green-500",
        borderColor: "border-green-500/20",
      },
      error: {
        icon: AlertCircle,
        title: "Test Failed",
        color: "text-red-500",
        borderColor: "border-red-500/20",
      },
      warning: {
        icon: AlertCircle,
        title: "Test Completed with Warnings",
        color: "text-yellow-500",
        borderColor: "border-yellow-500/20",
      },
    };

    const currentStatus = statusMap[status] || statusMap.running;
    const Icon = currentStatus.icon;

    return (
      <Card className={cn("bg-muted/30", currentStatus.borderColor)}>
        <CardHeader className='flex flex-row items-center gap-3 space-y-0 p-4'>
          <Icon
            className={cn(
              "h-6 w-6 flex-shrink-0",
              currentStatus.color,
              currentStatus.iconClass
            )}
          />
          <div className='flex-1'>
            <CardTitle className={cn("text-base", currentStatus.color)}>
              {currentStatus.title}
            </CardTitle>
            {data.duration && (
              <p className='text-xs text-muted-foreground'>
                Completed in {data.duration}ms
              </p>
            )}
          </div>
        </CardHeader>
        {(data.error || data.lastResponse) && (
          <CardContent className='p-4 pt-0 text-xs space-y-2'>
            {data.error && (
              <div className='text-red-500 bg-red-500/10 p-2 rounded-md font-mono whitespace-pre-wrap'>
                {data.error}
              </div>
            )}
            {data.lastResponse && (
              <div>
                <h4 className='font-medium mb-1 text-muted-foreground'>
                  Response Data:
                </h4>
                <pre className='p-2 bg-background/50 rounded-md font-mono overflow-x-auto max-h-40'>
                  {JSON.stringify(data.lastResponse, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  const SchemaField = ({
    field,
    direction,
  }: {
    field: { name: string; type: string; required: boolean };
    direction: "input" | "output";
  }) => (
    <div className='flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-transparent hover:border-primary/20 transition-colors'>
      <div
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
          direction === "input"
            ? "bg-blue-500/10 text-blue-500"
            : "bg-green-500/10 text-green-500"
        )}>
        {direction === "input" ? (
          <ArrowRight className='w-4 h-4' />
        ) : (
          <ArrowLeft className='w-4 h-4' />
        )}
      </div>
      <div className='flex-1'>
        <p className='font-mono text-sm text-foreground'>{field.name}</p>
        <p className='text-xs text-muted-foreground'>{field.type}</p>
      </div>
      {field.required && (
        <Badge
          variant='outline'
          className='text-red-500 border-red-500/50 text-xs'>
          Required
        </Badge>
      )}
    </div>
  );

  return (
    <div className='absolute top-0 right-0 m-4 w-[420px] h-[calc(100vh-2rem)] bg-background/80 backdrop-blur-xl border-l border-border/50 rounded-l-2xl shadow-2xl dark:shadow-black/20 flex flex-col'>
      {/* Header */}
      <div className='p-4 border-b border-border/50 flex-shrink-0 flex items-center justify-between gap-4'>
        <div className='flex items-center gap-3 flex-1 min-w-0'>
          <div className='w-11 h-11 rounded-lg bg-gradient-to-br from-primary/10 via-primary/20 to-primary/5 flex items-center justify-center shadow-inner flex-shrink-0'>
            <BlockIcon className='w-6 h-6 text-primary' />
          </div>
          <div className='flex-1 min-w-0'>
            <h3 className='font-semibold text-base text-foreground truncate'>
              {metadata?.label ?? blockType}
            </h3>
            <p className='text-xs text-muted-foreground truncate'>
              {metadata?.description ?? "Configure this block"}
            </p>

            {/* Debug info for icon resolution (only in development) */}
            {process.env.NODE_ENV === "development" && (
              <p className='text-xs text-muted-foreground/60 mt-1'>
                Icon: {metadata?.iconName || data.iconName || "auto"} →{" "}
                {BlockIcon.name || "resolved"}
              </p>
            )}
          </div>
        </div>
        {onTest && (
          <Button
            onClick={onTest}
            disabled={executionStatus === "running"}
            size='sm'
            className='flex-shrink-0'>
            {executionStatus === "running" ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Play className='mr-2 h-4 w-4' />
            )}
            Test
          </Button>
        )}
      </div>

      {/* Main Content */}
      <ScrollArea className='flex-1'>
        <div className='p-4'>
          <Accordion
            type='multiple'
            defaultValue={["config"]}
            className='w-full'>
            <AccordionItem value='config'>
              <AccordionTrigger className='text-base font-semibold hover:bg-muted/50 px-3 rounded-md transition-colors'>
                <div className='flex items-center gap-3'>
                  <Settings className='w-5 h-5 text-primary' />
                  Configuration
                </div>
              </AccordionTrigger>
              <AccordionContent className='pt-4'>
                <ConfigComponent
                  config={
                    (data.config as Record<string, unknown>) ?? {
                      __empty: true,
                    }
                  }
                  onChange={memoizedOnChange}
                  executionStatus={executionStatus}
                  executionData={executionData}
                  onTest={onTest}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='schema'>
              <AccordionTrigger className='text-base font-semibold hover:bg-muted/50 px-3 rounded-md transition-colors'>
                <div className='flex items-center gap-3'>
                  <Code className='w-5 h-5 text-primary' />
                  Schema
                  {compatibilityIssues.length > 0 && (
                    <Badge variant='destructive' className='ml-2 animate-pulse'>
                      {compatibilityIssues.length} Issue
                      {compatibilityIssues.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className='pt-4 space-y-6'>
                {compatibilityIssues.length > 0 && (
                  <div>
                    <h4 className='font-semibold text-sm mb-2 text-destructive px-3'>
                      Compatibility Issues
                    </h4>
                    <div className='space-y-2'>
                      {compatibilityIssues.map((issue, index) => (
                        <Alert
                          key={index}
                          variant='destructive'
                          className='p-3'>
                          <AlertCircle className='h-4 w-4' />
                          <AlertTitle className='text-sm font-semibold'>
                            {issue.field}
                          </AlertTitle>
                          <AlertDescription className='text-xs'>
                            {issue.issue}
                            {issue.suggestion && (
                              <span className='block mt-1 text-destructive/80'>
                                {issue.suggestion}
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className='font-semibold text-sm mb-3 px-3'>
                    Input Schema
                  </h4>
                  {nodeSchema?.input && nodeSchema.input.length > 0 ? (
                    <div className='space-y-2'>
                      {nodeSchema.input.map((input, index) => (
                        <SchemaField
                          key={index}
                          field={input}
                          direction='input'
                        />
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground px-3'>
                      No input schema defined.
                    </p>
                  )}
                </div>

                <div>
                  <h4 className='font-semibold text-sm mb-3 mt-6 px-3'>
                    Output Schema
                  </h4>
                  {nodeSchema?.output && nodeSchema.output.length > 0 ? (
                    <div className='space-y-2'>
                      {nodeSchema.output.map((output, index) => (
                        <SchemaField
                          key={index}
                          field={output}
                          direction='output'
                        />
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground px-3'>
                      No output schema defined.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='last_run'>
              <AccordionTrigger className='text-base font-semibold hover:bg-muted/50 px-3 rounded-md transition-colors'>
                <div className='flex items-center gap-3'>
                  <Activity className='w-5 h-5 text-primary' />
                  Last Test Run
                </div>
              </AccordionTrigger>
              <AccordionContent className='pt-4'>
                {executionStatus !== "idle" && executionData ? (
                  <StatusInfo status={executionStatus} data={executionData} />
                ) : (
                  <div className='text-center py-8 px-4 bg-muted/50 rounded-lg'>
                    <FlaskConical className='w-10 h-10 mx-auto text-muted-foreground/50 mb-3' />
                    <p className='text-sm font-medium text-muted-foreground'>
                      No test has been run yet
                    </p>
                    <p className='text-xs text-muted-foreground/80 mt-1'>
                      Click the "Test" button to see results.
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}
