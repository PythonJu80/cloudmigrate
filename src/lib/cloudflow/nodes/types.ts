// CloudFlow Node Type System

import { LucideIcon } from "lucide-react";

export type NodeCategory = 
  | "trigger"
  // AWS
  | "aws-compute"
  | "aws-storage"
  | "aws-database"
  | "aws-networking"
  | "aws-security"
  | "aws-analytics"
  | "aws-integration"
  | "aws-ml"
  | "aws-management"
  // GCP
  | "gcp-compute"
  | "gcp-storage"
  | "gcp-database"
  | "gcp-networking"
  | "gcp-security"
  | "gcp-analytics"
  | "gcp-integration"
  | "gcp-ml"
  | "gcp-management"
  // Azure
  | "azure-compute"
  | "azure-storage"
  | "azure-database"
  | "azure-networking"
  | "azure-security"
  | "azure-analytics"
  | "azure-integration"
  | "azure-ml"
  | "azure-management"
  // Oracle
  | "oracle-compute"
  | "oracle-storage"
  | "oracle-database"
  | "oracle-networking"
  | "oracle-security"
  | "oracle-analytics"
  | "oracle-integration"
  | "oracle-ml"
  | "oracle-management"
  // Other
  | "local"
  | "logic"
  | "generic"
  | "output"
  | "ai";

export type NodeType = "trigger" | "action" | "condition" | "resource" | "output";

export type Provider = "aws" | "gcp" | "azure" | "oracle" | "generic";

export interface NodeInput {
  id: string;
  label: string;
  type: "any" | "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
}

export interface NodeOutput {
  id: string;
  label: string;
  type: "any" | "string" | "number" | "boolean" | "object" | "array";
}

export interface NodeConfigField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "textarea" | "json" | "secret";
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  default?: any;
  description?: string;
}

export interface CloudNodeDefinition {
  id: string;                     // "aws.ec2.create"
  type: NodeType;                 // "action"
  provider: Provider;             // "aws"
  category: NodeCategory;         // "aws-compute"
  label: string;                  // "Create EC2 Instance"
  description: string;            // "Launch a new EC2 instance"
  icon: string;                   // Lucide icon name
  color: string;                  // Category color
  inputs: NodeInput[];            // Input ports
  outputs: NodeOutput[];          // Output ports
  config: NodeConfigField[];      // Configuration schema
  iamRequired?: string[];         // Required IAM permissions
}

// Runtime node instance in a flow
export interface FlowNode {
  id: string;                     // Unique instance ID
  definitionId: string;           // Reference to CloudNodeDefinition
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;  // User-configured values
    status?: "idle" | "running" | "success" | "error";
    lastRun?: Date;
    runCount?: number;
    error?: string;
  };
}

export interface FlowEdge {
  id: string;
  source: string;                 // Source node ID
  sourceHandle?: string;          // Output handle ID
  target: string;                 // Target node ID
  targetHandle?: string;          // Input handle ID
  animated?: boolean;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  trigger?: {
    type: "manual" | "cron" | "webhook" | "event";
    config: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  status: "draft" | "active" | "paused";
}

// Execution context passed to node handlers
export interface ExecutionContext {
  flowId: string;
  executionId: string;
  credentials: Record<string, any>;
  inputs: Record<string, any>;
  logger: (message: string) => void;
}

// Node handler function signature
export type NodeHandler = (
  context: ExecutionContext,
  config: Record<string, any>
) => Promise<Record<string, any>>;
