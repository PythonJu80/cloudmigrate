import { Node, Edge } from "@xyflow/react";

export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  category: "web" | "serverless" | "data" | "hybrid" | "container" | "security";
  complexity: "beginner" | "intermediate" | "advanced";
  useCases: string[];
  nodes: Node[];
  edges: Edge[];
  deploymentOrder: string[];
  estimatedCost: { min: number; max: number };
}
