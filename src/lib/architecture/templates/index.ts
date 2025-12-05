import { ArchitectureTemplate } from "../types";
import { threeTierWebTemplate } from "./three-tier-web";
import { dataPipelineTemplate } from "./data-pipeline";

export const allTemplates: ArchitectureTemplate[] = [
  threeTierWebTemplate,
  dataPipelineTemplate,
];

export function getTemplateById(id: string): ArchitectureTemplate | undefined {
  return allTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: ArchitectureTemplate["category"]): ArchitectureTemplate[] {
  return allTemplates.filter((t) => t.category === category);
}

export function getTemplatesByComplexity(complexity: ArchitectureTemplate["complexity"]): ArchitectureTemplate[] {
  return allTemplates.filter((t) => t.complexity === complexity);
}

// Re-export types
export type { ArchitectureTemplate } from "../types";
