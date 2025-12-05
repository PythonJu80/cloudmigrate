"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import "echarts-gl";
import { Expand, Download, BarChart3, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChartConfig } from "./visualization-types";

// Premium color palette with gradients
const COLORS_3D = [
  { base: "#10b981", light: "#34d399", dark: "#059669" }, // emerald
  { base: "#3b82f6", light: "#60a5fa", dark: "#2563eb" }, // blue
  { base: "#f59e0b", light: "#fbbf24", dark: "#d97706" }, // amber
  { base: "#ef4444", light: "#f87171", dark: "#dc2626" }, // red
  { base: "#8b5cf6", light: "#a78bfa", dark: "#7c3aed" }, // violet
  { base: "#ec4899", light: "#f472b6", dark: "#db2777" }, // pink
  { base: "#06b6d4", light: "#22d3ee", dark: "#0891b2" }, // cyan
  { base: "#84cc16", light: "#a3e635", dark: "#65a30d" }, // lime
];

interface Chart3DMessageProps {
  config: ChartConfig;
  onExpand?: () => void;
}

export function Chart3DMessage({ config, onExpand }: Chart3DMessageProps) {
  const { type, title, description, data, xAxis, yAxis } = config;

  const chartOption = useMemo(() => {
    const nameKey = config.nameKey || xAxis;
    const valueKey = config.valueKey || yAxis;

    switch (type) {
      case "pie":
      case "donut":
        return {
          backgroundColor: "transparent",
          tooltip: {
            trigger: "item",
            backgroundColor: "rgba(50, 50, 50, 0.9)",
            borderColor: "#555",
            textStyle: { color: "#fff" },
            formatter: "{b}: {c} ({d}%)",
          },
          legend: {
            bottom: 10,
            left: "center",
            textStyle: { color: "#a1a1aa" },
            itemGap: 20,
          },
          series: [
            {
              name: title || "Data",
              type: "pie",
              radius: type === "donut" ? ["40%", "70%"] : ["0%", "70%"],
              center: ["50%", "45%"],
              roseType: false,
              itemStyle: {
                borderRadius: 8,
                borderColor: "rgba(0,0,0,0.3)",
                borderWidth: 2,
                shadowBlur: 20,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
              label: {
                show: true,
                position: "outside",
                color: "#e4e4e7",
                fontSize: 12,
                formatter: "{b}\n{d}%",
              },
              labelLine: {
                lineStyle: { color: "#71717a" },
                smooth: true,
                length: 15,
                length2: 10,
              },
              emphasis: {
                scale: true,
                scaleSize: 12,
                itemStyle: {
                  shadowBlur: 30,
                  shadowColor: "rgba(0, 0, 0, 0.8)",
                },
              },
              animationType: "scale",
              animationEasing: "elasticOut",
              animationDuration: 1500,
              animationDelay: (idx: number) => idx * 100,
              data: data.map((item, index) => ({
                name: String(item[nameKey]),
                value: Number(item[valueKey]),
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: COLORS_3D[index % COLORS_3D.length].light },
                    { offset: 1, color: COLORS_3D[index % COLORS_3D.length].dark },
                  ]),
                },
              })),
            },
          ],
        };

      case "bar":
        return {
          backgroundColor: "transparent",
          tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(50, 50, 50, 0.9)",
            borderColor: "#555",
            textStyle: { color: "#fff" },
            axisPointer: {
              type: "shadow",
              shadowStyle: { color: "rgba(16, 185, 129, 0.1)" },
            },
          },
          legend: {
            show: false,
          },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "15%",
            top: "10%",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: data.map((item) => String(item[nameKey])),
            axisLine: { lineStyle: { color: "#3f3f46" } },
            axisLabel: { 
              color: "#a1a1aa", 
              fontSize: 11,
              rotate: data.length > 5 ? 30 : 0,
            },
            axisTick: { show: false },
          },
          yAxis: {
            type: "value",
            axisLine: { show: false },
            axisLabel: { color: "#a1a1aa", fontSize: 11 },
            splitLine: { lineStyle: { color: "#27272a", type: "dashed" } },
          },
          series: [
            {
              name: title || "Value",
              type: "bar",
              barWidth: "60%",
              itemStyle: {
                borderRadius: [6, 6, 0, 0],
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "#34d399" },
                  { offset: 0.5, color: "#10b981" },
                  { offset: 1, color: "#059669" },
                ]),
                shadowColor: "rgba(16, 185, 129, 0.4)",
                shadowBlur: 10,
                shadowOffsetY: 5,
              },
              emphasis: {
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#6ee7b7" },
                    { offset: 0.5, color: "#34d399" },
                    { offset: 1, color: "#10b981" },
                  ]),
                  shadowBlur: 20,
                  shadowColor: "rgba(16, 185, 129, 0.6)",
                },
              },
              animationDuration: 1500,
              animationEasing: "elasticOut",
              animationDelay: (idx: number) => idx * 150,
              data: data.map((item) => Number(item[valueKey])),
            },
          ],
        };

      case "line":
      case "area":
        return {
          backgroundColor: "transparent",
          tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(50, 50, 50, 0.9)",
            borderColor: "#555",
            textStyle: { color: "#fff" },
          },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "15%",
            top: "10%",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            boundaryGap: type === "area",
            data: data.map((item) => String(item[nameKey])),
            axisLine: { lineStyle: { color: "#3f3f46" } },
            axisLabel: { color: "#a1a1aa", fontSize: 11 },
            axisTick: { show: false },
          },
          yAxis: {
            type: "value",
            axisLine: { show: false },
            axisLabel: { color: "#a1a1aa", fontSize: 11 },
            splitLine: { lineStyle: { color: "#27272a", type: "dashed" } },
          },
          series: [
            {
              name: title || "Value",
              type: "line",
              smooth: true,
              symbol: "circle",
              symbolSize: 8,
              lineStyle: {
                width: 3,
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: "#10b981" },
                  { offset: 1, color: "#3b82f6" },
                ]),
                shadowColor: "rgba(16, 185, 129, 0.5)",
                shadowBlur: 10,
                shadowOffsetY: 5,
              },
              itemStyle: {
                color: "#10b981",
                borderColor: "#fff",
                borderWidth: 2,
                shadowColor: "rgba(16, 185, 129, 0.8)",
                shadowBlur: 10,
              },
              areaStyle: type === "area" ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(16, 185, 129, 0.4)" },
                  { offset: 1, color: "rgba(16, 185, 129, 0.02)" },
                ]),
              } : undefined,
              emphasis: {
                scale: true,
                itemStyle: {
                  shadowBlur: 20,
                  shadowColor: "rgba(16, 185, 129, 1)",
                },
              },
              animationDuration: 2000,
              animationEasing: "cubicOut",
              data: data.map((item) => Number(item[valueKey])),
            },
          ],
        };

      case "scatter":
        return {
          backgroundColor: "transparent",
          tooltip: {
            trigger: "item",
            backgroundColor: "rgba(50, 50, 50, 0.9)",
            borderColor: "#555",
            textStyle: { color: "#fff" },
          },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "15%",
            top: "10%",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: data.map((item) => String(item[nameKey])),
            axisLine: { lineStyle: { color: "#3f3f46" } },
            axisLabel: { color: "#a1a1aa", fontSize: 11 },
          },
          yAxis: {
            type: "value",
            axisLine: { show: false },
            axisLabel: { color: "#a1a1aa", fontSize: 11 },
            splitLine: { lineStyle: { color: "#27272a", type: "dashed" } },
          },
          series: [
            {
              name: title || "Data",
              type: "scatter",
              symbolSize: 20,
              itemStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
                  { offset: 0, color: "#34d399" },
                  { offset: 1, color: "#10b981" },
                ]),
                shadowColor: "rgba(16, 185, 129, 0.6)",
                shadowBlur: 15,
              },
              emphasis: {
                scale: 1.5,
                itemStyle: {
                  shadowBlur: 25,
                  shadowColor: "rgba(16, 185, 129, 0.9)",
                },
              },
              animationDuration: 1500,
              animationEasing: "elasticOut",
              animationDelay: (idx: number) => idx * 100,
              data: data.map((item) => Number(item[valueKey])),
            },
          ],
        };

      default:
        return {};
    }
  }, [type, title, data, xAxis, yAxis, config.nameKey, config.valueKey]);

  const handleExport = () => {
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
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-foreground">{title || "Chart"}</span>
          <span className="text-xs text-emerald-500/70 bg-emerald-500/10 px-2 py-0.5 rounded-full">3D</span>
        </div>
        <div className="flex items-center gap-1">
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

      {/* Chart */}
      <div className="p-4">
        <ReactECharts
          option={chartOption}
          style={{ height: "350px", width: "100%" }}
          opts={{ renderer: "canvas" }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
}
