"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricConfig } from "./visualization-types";

interface MetricMessageProps {
  config: MetricConfig;
}

export function MetricMessage({ config }: MetricMessageProps) {
  const { title, value, change, changeLabel, trend = "neutral" } = config;

  const trendColors = {
    up: "text-emerald-400",
    down: "text-red-400",
    neutral: "text-muted-foreground",
  };

  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }[trend];

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-semibold text-foreground">{value}</span>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trendColors[trend]}`}>
            <TrendIcon className="w-4 h-4" />
            <span>
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            {changeLabel && <span className="text-muted-foreground">({changeLabel})</span>}
          </div>
        )}
      </div>
    </div>
  );
}
