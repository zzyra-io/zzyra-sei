"use client";

import { useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Zap,
  Database,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
  Info,
  FileText,
  Terminal,
  AlertTriangle,
  Activity,
  AlertCircle,
  Archive,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Bell,
  Book,
  Bookmark,
  Box,
  Calendar,
  Camera,
  ChevronRight,
  Clock,
  Cloud,
  Code,
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
  Play,
  Plus,
  Printer,
  RefreshCwIcon as Refresh,
  Save,
  Search,
  Send,
  Settings,
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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define NodeData type for clarity
export interface NodeData {
  blockType: string;
  label: string;
  iconName?: string;
  description?: string;
  isEnabled?: boolean;
  executionStatus?: "idle" | "pending" | "running" | "completed" | "failed";
  isExecuting?: boolean;
  executionProgress?: number;
  executionDuration?: number;
  executionOutput?: unknown;
  executionError?: string;
  config?: Record<string, unknown>;
  logs?: Array<{ level: "info" | "warn" | "error"; message: string }>;
  validationErrors?: Array<{ field: string; message: string }>;
  executionId?: string;
  isLive?: boolean;
}

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
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
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

const StatusDisplay = ({
  status,
  duration,
  progress,
}: {
  status: NodeData["executionStatus"];
  duration: NodeData["executionDuration"];
  progress: NodeData["executionProgress"];
}) => {
  const statusConfig = {
    running: { text: "Running", color: "text-blue-500" },
    completed: { text: "Completed", color: "text-green-500" },
    failed: { text: "Failed", color: "text-red-500" },
    pending: { text: "Pending", color: "text-amber-500" },
    idle: { text: "Idle", color: "text-gray-500" },
  };
  const config = status ? statusConfig[status] : statusConfig.idle;
  if (!config) return null;

  return (
    <div className='flex items-center gap-2 mt-1'>
      <p className={cn("text-sm font-semibold", config.color)}>{config.text}</p>
      {status === "running" && progress && (
        <p className='text-xs text-muted-foreground'>{progress}% complete</p>
      )}
      {duration && (
        <p className='text-xs text-muted-foreground'>({duration}ms)</p>
      )}
    </div>
  );
};

export default function CircularNode({ data }: NodeProps) {
  // Cast data to NodeData type with proper defaults
  const nodeData = data as unknown as NodeData;
  const {
    label = "Untitled",
    iconName = "info",
    blockType = "unknown",
    description = "",
    isEnabled = true,
    executionStatus = "idle",
    executionProgress = 0,
    executionDuration = 0,
    executionOutput = null,
    executionError = "",
    config = {},
    logs = [],
    validationErrors = [],
    isLive = false,
  } = nodeData;


  // Resolve icon with intelligent fallbacks
  const NodeIcon = useMemo(
    () => resolveIcon(iconName, blockType),
    [iconName, blockType]
  );
  const hasValidationErrors = validationErrors.length > 0;

  const statusStyles = useMemo(() => {
    switch (executionStatus) {
      case "running":
        return "border-blue-500 shadow-blue-500/30 animate-pulse ring-2 ring-blue-500/50 scale-105";
      case "completed":
        return "border-green-500 shadow-green-500/20";
      case "failed":
        return "border-red-500 shadow-red-500/20";
      case "pending":
        return "border-amber-500 shadow-amber-500/20";
      default:
        return "border-gray-300 dark:border-gray-600";
    }
  }, [executionStatus]);

  const statusIndicator = useMemo(() => {
    switch (executionStatus) {
      case "running":
        return (
          <Loader2 className='absolute w-full h-full text-blue-500 animate-spin' />
        );
      case "completed":
        return (
          <Badge
            variant='outline'
            className='absolute -bottom-2 -right-2 bg-background border-none p-0 h-6 w-6 flex items-center justify-center'>
            <CheckCircle2 className='w-5 h-5 text-green-500' />
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant='outline'
            className='absolute -bottom-2 -right-2 bg-background border-none p-0 h-6 w-6 flex items-center justify-center'>
            <XCircle className='w-5 h-5 text-red-500' />
          </Badge>
        );
      default:
        return null;
    }
  }, [executionStatus]);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "group relative flex flex-col items-center gap-2 w-28",
            !isEnabled && "opacity-50 grayscale"
          )}>
          <div className='relative'>
            <div
              className={cn(
                "w-20 h-20 rounded-full border-4 bg-card flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer",
                statusStyles,
                hasValidationErrors &&
                  "border-red-500/50 ring-2 ring-red-500/50"
              )}>
              {statusIndicator}
              <NodeIcon
                className={cn(
                  "w-8 h-8 text-foreground/70 transition-transform duration-300 group-hover:scale-110",
                  executionStatus === "running" && "opacity-20"
                )}
              />
            </div>

            {/* Live Indicator */}
            {isLive && (
              <div className='absolute -top-1 -right-1'>
                <div className='relative flex h-3 w-3'>
                  <Radio className='absolute inline-flex h-full w-full animate-ping text-green-400 opacity-75' />
                  <Radio className='relative inline-flex rounded-full h-3 w-3 text-green-500' />
                </div>
              </div>
            )}

            {/* Validation Error Badge */}
            {hasValidationErrors && (
              <Badge
                variant='destructive'
                className='absolute -top-1 -left-1 h-5 w-5 p-0 flex items-center justify-center'>
                {validationErrors.length}
              </Badge>
            )}
          </div>

          <p className='text-xs font-semibold text-center text-foreground truncate w-full'>
            {label}
          </p>

          <Handle
            type='target'
            position={Position.Left}
            className='!bg-blue-500 !border-2 !border-white !w-3 !h-3 !-top-1.5 hover:!bg-blue-600 hover:!scale-125 transition-all duration-200'
            style={{ zIndex: 10 }}
          />
          <Handle
            type='source'
            position={Position.Right}
            className='!bg-green-500 !border-2 !border-white !w-3 !h-3 !-bottom-1.5 hover:!bg-green-600 hover:!scale-125 transition-all duration-200'
            style={{ zIndex: 10 }}
          />
        </div>
      </HoverCardTrigger>
      <HoverCardContent className='w-96' side='right' align='start'>
        <div className='flex items-start gap-4 mb-4'>
          <div
            className={cn(
              "w-12 h-12 rounded-lg bg-card flex items-center justify-center border",
              statusStyles.replace("border-", "bg-").replace("500", "500/10")
            )}>
            <NodeIcon className='w-6 h-6' />
          </div>
          <div className='flex-1'>
            <h3 className='font-bold text-lg'>{label}</h3>
            <p className='text-sm text-muted-foreground -mt-1'>{description}</p>
            <StatusDisplay
              status={executionStatus}
              duration={executionDuration}
              progress={executionProgress}
            />

            {/* Debug info for icon resolution (only in development) */}
            {process.env.NODE_ENV === "development" && (
              <p className='text-xs text-muted-foreground/60 mt-1'>
                Icon: {iconName || "auto"} → {NodeIcon.name || "resolved"}
              </p>
            )}
          </div>
        </div>

        <Tabs defaultValue='info'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='info'>
              <Info className='w-4 h-4 mr-1' /> Info
            </TabsTrigger>
            <TabsTrigger value='logs' disabled={logs.length === 0}>
              <Terminal className='w-4 h-4 mr-1' /> Logs
              {logs.length > 0 && (
                <Badge className='ml-2 px-1.5 py-0 text-xs'>
                  {logs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='output' disabled={!executionOutput}>
              <FileText className='w-4 h-4 mr-1' /> Output
            </TabsTrigger>
            <TabsTrigger
              value='errors'
              disabled={!executionError && !hasValidationErrors}>
              <AlertTriangle className='w-4 h-4 mr-1' /> Errors
            </TabsTrigger>
          </TabsList>

          <TabsContent value='info' className='mt-4'>
            <div className='space-y-2 text-sm'>
              <h4 className='font-semibold mb-2'>Configuration</h4>
              {Object.entries(config).length > 0 ? (
                <div className='p-2 bg-muted rounded-md font-mono text-xs space-y-1'>
                  {Object.entries(config).map(([key, value]) => (
                    <div key={key} className='flex justify-between'>
                      <span className='text-muted-foreground'>{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  No configuration set.
                </p>
              )}
            </div>
          </TabsContent>


          <TabsContent value='logs' className='mt-4'>
            <div className='max-h-60 overflow-y-auto space-y-2 p-2 bg-muted rounded-md'>
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "font-mono text-xs",
                    log.level === "error"
                      ? "text-red-500"
                      : log.level === "warn"
                      ? "text-amber-500"
                      : "text-foreground/80"
                  )}>
                  {log.message}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value='output' className='mt-4'>
            <div className='max-h-60 overflow-y-auto p-2 bg-muted rounded-md font-mono text-xs'>
              <pre>{JSON.stringify(executionOutput, null, 2)}</pre>
            </div>
          </TabsContent>

          <TabsContent value='errors' className='mt-4 space-y-4'>
            {executionError && (
              <div>
                <h4 className='font-semibold mb-2 text-sm'>Execution Error</h4>
                <div className='p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs'>
                  {executionError}
                </div>
              </div>
            )}
            {hasValidationErrors && (
              <div>
                <h4 className='font-semibold mb-2 text-sm'>
                  Validation Issues
                </h4>
                <div className='space-y-2'>
                  {validationErrors.map((err, i) => (
                    <div
                      key={i}
                      className='p-2 bg-destructive/10 border-l-4 border-destructive rounded-r-md text-xs'>
                      <p className='font-bold capitalize text-destructive'>
                        {err.field}
                      </p>
                      <p className='text-destructive/80'>{err.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </HoverCardContent>
    </HoverCard>
  );
}
