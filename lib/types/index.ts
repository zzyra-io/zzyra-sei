"use client";

/**
 * Core type definitions for Zyra workflow system
 */

export enum BlockType {
  TRIGGER = "TRIGGER",
  CONDITION = "CONDITION",
  ACTION = "ACTION",
  WEBHOOK = "WEBHOOK",
  INPUT = "INPUT",
  OUTPUT = "OUTPUT",
  TRANSFORMATION = "TRANSFORMATION",
  INTEGRATION = "INTEGRATION",
  AI = "AI",
  BLOCKCHAIN = "BLOCKCHAIN",
  FINANCE = "FINANCE",
  AI_BLOCKCHAIN = "AI_BLOCKCHAIN"
}

export interface BlockDefinition {
  id: string;
  type: BlockType;
  name: string;
  description: string;
  category: string;
  icon?: string;
  color?: string;
  inputs?: BlockPort[];
  outputs?: BlockPort[];
  configSchema?: any;
  defaultConfig?: any;
}

export interface BlockPort {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: "queued" | "running" | "completed" | "failed";
  start_time?: string;
  end_time?: string;
  result?: any;
  error?: string;
  locked_by?: string;
  retry_count?: number;
}

export interface NodeLog {
  id: string;
  execution_id: string;
  node_id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  data?: any;
}

// Monitoring and performance tracking
export interface PerformanceMetric {
  component: string;
  action: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}
