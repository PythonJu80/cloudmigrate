"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Label,
  Sector,
} from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { Expand, Download, BarChart3, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig as ShadcnChartConfig,
} from "@/components/ui/chart";
import type { ChartConfig } from "./visualization-types";

// Explicit hex colors that work everywhere (chart slices + legend)
const COLORS = [
  "#10b981", // emerald - COMPLETED
  "#3b82f6", // blue - FAILED  
  "#f59e0b", // amber/yellow - PENDING
  "#ef4444", // red - UPLOADING
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

// Format large numbers with k, M, B suffixes
function formatNumber(num: number): string {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString();
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-zinc-300 mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-zinc-400">{entry.name}:</span>
          <span className="text-xs font-mono font-medium text-white">
            {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ChartMessageProps {
  config: ChartConfig;
  onExpand?: () => void;
}

export function ChartMessage({ config, onExpand }: ChartMessageProps) {
  const { type, title, description, data, xAxis, yAxis, colors = COLORS, stacked, showLegend = true, showGrid = true, nameKey, valueKey } = config;
  const [showJson, setShowJson] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(0);

  const chartColors = colors.length > 0 ? colors : COLORS;

  // Calculate total for pie/donut charts
  const total = useMemo(() => {
    if (type !== 'pie' && type !== 'donut') return 0;
    const key = valueKey || yAxis;
    return data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
  }, [data, type, valueKey, yAxis]);

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
            <XAxis dataKey={xAxis} stroke="#9ca3af" fontSize={12} tickLine={false} />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            {showLegend && <Legend />}
            <Bar dataKey={yAxis} fill={chartColors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case "line":
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
            <XAxis dataKey={xAxis} stroke="#9ca3af" fontSize={12} tickLine={false} />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={yAxis}
              stroke={chartColors[0]}
              strokeWidth={2}
              dot={{ fill: chartColors[0], strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
            <XAxis dataKey={xAxis} stroke="#9ca3af" fontSize={12} tickLine={false} />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            {showLegend && <Legend />}
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={yAxis}
              stroke={chartColors[0]}
              strokeWidth={2}
              fill="url(#colorGradient)"
            />
          </AreaChart>
        );

      case "pie":
      case "donut":
        const pieNameKey = nameKey || xAxis;
        const pieValueKey = valueKey || yAxis;
        
        // Build dynamic chart config for shadcn
        const pieChartConfig: ShadcnChartConfig = data.reduce((acc, item, index) => {
          const key = String(item[pieNameKey]);
          acc[key] = {
            label: key,
            color: chartColors[index % chartColors.length],
          };
          return acc;
        }, {} as ShadcnChartConfig);

        // Get active slice data for center display
        const activeData = activeIndex !== undefined ? data[activeIndex] : null;
        const activeValue = activeData ? Number(activeData[pieValueKey]) || 0 : total;
        const activeLabel = activeData ? String(activeData[pieNameKey]) : "total";
        const activePercent = activeData ? ((activeValue / total) * 100).toFixed(1) : "100";
        
        return (
          <PieChart>
              {/* Glassmorphism gradients */}
              <defs>
                {data.map((_, index) => {
                  const baseColor = chartColors[index % chartColors.length];
                  return (
                    <linearGradient
                      key={`gradient-${index}`}
                      id={`pieGradient-${index}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor={baseColor} stopOpacity={0.9} />
                      <stop offset="50%" stopColor={baseColor} stopOpacity={1} />
                      <stop offset="100%" stopColor={baseColor} stopOpacity={0.7} />
                    </linearGradient>
                  );
                })}
                {/* Glass highlight overlay */}
                <linearGradient id="glassHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="white" stopOpacity={0.3} />
                  <stop offset="50%" stopColor="white" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="white" stopOpacity={0} />
                </linearGradient>
                {/* Glow filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#3f3f46",
                  border: "1px solid #71717a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#ffffff" }}
                labelStyle={{ color: "#ffffff" }}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={type === "donut" ? 65 : 0}
                outerRadius={type === "donut" ? 95 : 105}
                paddingAngle={type === "donut" ? 3 : 1}
                dataKey={pieValueKey}
                nameKey={pieNameKey}
                strokeWidth={1}
                stroke="hsl(var(--background) / 0.5)"
                animationBegin={0}
                animationDuration={1000}
                animationEasing="ease-out"
                activeIndex={activeIndex}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(0)}
                activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                  <g filter="url(#glow)">
                    <Sector 
                      {...props} 
                      outerRadius={outerRadius + 10}
                      style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}
                    />
                  </g>
                )}
              >
                {data.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#pieGradient-${index})`}
                    style={{
                      filter: activeIndex === index ? "brightness(1.1)" : "brightness(1)",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                    }}
                  />
                ))}
                {type === "donut" && (
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 8}
                              className="fill-foreground text-3xl font-bold"
                              style={{ transition: "all 0.3s ease" }}
                            >
                              {formatNumber(activeValue)}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 16}
                              className="fill-muted-foreground text-xs"
                            >
                              {activeLabel}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 32}
                              className="fill-muted-foreground/70 text-xs"
                            >
                              {activePercent}%
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                )}
              </Pie>
              <Legend 
                verticalAlign="bottom"
                height={36}
                content={() => (
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                    {data.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        />
                        <span className="text-sm text-zinc-300">
                          {String(item[pieNameKey])}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />
            </PieChart>
        );

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
            <XAxis dataKey={xAxis} stroke="#9ca3af" fontSize={12} tickLine={false} name={xAxis} />
            <YAxis dataKey={yAxis} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} name={yAxis} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              cursor={{ strokeDasharray: "3 3" }}
            />
            {showLegend && <Legend />}
            <Scatter name={title || "Data"} data={data} fill={chartColors[0]} />
          </ScatterChart>
        );

      default:
        return <div className="text-muted-foreground">Unsupported chart type: {type}</div>;
    }
  };

  const handleExport = () => {
    // Export as CSV
    const headers = Object.keys(data[0] || {}).join(",");
    const rows = data.map((row) => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "chart-data"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-foreground">{title || "Chart"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowJson(!showJson)}
            title="View JSON data"
          >
            <Code2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleExport}
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={onExpand}
              title="Expand"
            >
              <Expand className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="px-4 py-2 text-sm text-muted-foreground border-b border-zinc-800">
          {description}
        </p>
      )}

      {/* JSON View */}
      {showJson && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <pre className="text-xs text-zinc-400 overflow-auto max-h-48 font-mono">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
