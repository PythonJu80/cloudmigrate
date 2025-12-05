/**
 * Data Visualization Types for Chat
 * 
 * These types define the structured responses the AI can return
 * to render interactive visualizations in the chat.
 */

// Base chart data point
export interface DataPoint {
  [key: string]: string | number | Date;
}

// Chart configuration
export interface ChartConfig {
  type: "bar" | "line" | "area" | "pie" | "donut" | "scatter";
  title?: string;
  description?: string;
  data: DataPoint[];
  xAxis: string;
  yAxis: string;
  // Optional customization
  colors?: string[];
  stacked?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  // For pie/donut
  nameKey?: string;
  valueKey?: string;
}

// Table configuration
export interface TableConfig {
  title?: string;
  description?: string;
  columns: {
    key: string;
    label: string;
    type?: "string" | "number" | "date" | "bytes" | "status" | "currency";
    sortable?: boolean;
    align?: "left" | "center" | "right";
  }[];
  data: Record<string, any>[];
  pagination?: boolean;
  pageSize?: number;
  searchable?: boolean;
  exportable?: boolean;
}

// Document/Report configuration
export interface DocumentConfig {
  type: "report" | "summary" | "invoice" | "letter";
  title: string;
  subtitle?: string;
  date?: string;
  sections: {
    heading?: string;
    content: string;
    type?: "paragraph" | "list" | "quote" | "code" | "table";
    data?: any;
  }[];
  footer?: string;
}

// Metric/KPI card
export interface MetricConfig {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
  icon?: string;
}

// Dashboard layout (multiple visualizations)
export interface DashboardConfig {
  title?: string;
  layout: "grid" | "rows";
  widgets: (
    | { type: "chart"; config: ChartConfig; span?: number }
    | { type: "table"; config: TableConfig; span?: number }
    | { type: "metric"; config: MetricConfig; span?: number }
  )[];
}

// All visualization message types
export type VisualizationType = 
  | "chart"
  | "table" 
  | "document"
  | "metric"
  | "dashboard";

// Extended message type for chat
export interface VisualizationMessage {
  type: VisualizationType;
  message?: string;
  chart?: ChartConfig;
  table?: TableConfig;
  document?: DocumentConfig;
  metric?: MetricConfig;
  dashboard?: DashboardConfig;
}
