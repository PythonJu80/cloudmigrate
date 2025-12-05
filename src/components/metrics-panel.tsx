"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Activity, TrendingUp, TrendingDown, HardDrive, Zap } from "lucide-react";

interface MetricData {
  time: string;
  uploads: number;
  downloads: number;
  errors: number;
}

interface UsageMetrics {
  storageUsed: number;
  storageLimit: number;
  requestsToday: number;
  bytesTransferred: number;
  errorRate: number;
}

// Generate mock real-time data (replace with actual API calls)
function generateMockData(): MetricData[] {
  const now = new Date();
  const data: MetricData[] = [];
  
  for (let i = 11; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      uploads: Math.floor(Math.random() * 50) + 10,
      downloads: Math.floor(Math.random() * 80) + 20,
      errors: Math.floor(Math.random() * 5),
    });
  }
  
  return data;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function MetricsPanel() {
  const [data, setData] = useState<MetricData[]>([]);
  const [metrics, setMetrics] = useState<UsageMetrics>({
    storageUsed: 0,
    storageLimit: 5368709120,
    requestsToday: 0,
    bytesTransferred: 0,
    errorRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load
    setData(generateMockData());
    fetchMetrics();
    setIsLoading(false);

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      setData(generateMockData());
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function fetchMetrics() {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const stats = await res.json();
        setMetrics({
          storageUsed: stats.bytesTransferred || 0,
          storageLimit: stats.bytesLimit || 5368709120,
          requestsToday: stats.totalTransfers || 0,
          bytesTransferred: stats.bytesTransferred || 0,
          errorRate: stats.failedTransfers > 0 
            ? (stats.failedTransfers / stats.totalTransfers) * 100 
            : 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-accent rounded w-1/4"></div>
          <div className="h-32 bg-accent rounded"></div>
        </div>
      </div>
    );
  }

  const totalUploads = data.reduce((sum, d) => sum + d.uploads, 0);
  const totalDownloads = data.reduce((sum, d) => sum + d.downloads, 0);
  const totalErrors = data.reduce((sum, d) => sum + d.errors, 0);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header with mini stats */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Live Metrics</span>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-terminal-green animate-pulse"></div>
              <span className="text-muted-foreground">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-px bg-border">
        <div className="bg-card p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-terminal-green" />
            <span className="text-xs text-muted-foreground">Uploads</span>
          </div>
          <p className="text-lg font-semibold text-foreground mt-1">{totalUploads}</p>
        </div>
        <div className="bg-card p-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-muted-foreground">Downloads</span>
          </div>
          <p className="text-lg font-semibold text-foreground mt-1">{totalDownloads}</p>
        </div>
        <div className="bg-card p-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-muted-foreground">Requests</span>
          </div>
          <p className="text-lg font-semibold text-foreground mt-1">{metrics.requestsToday}</p>
        </div>
        <div className="bg-card p-3">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-red-500" />
            <span className="text-xs text-muted-foreground">Errors</span>
          </div>
          <p className="text-lg font-semibold text-foreground mt-1">{totalErrors}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Transfer Activity Chart */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Transfer Activity (Last Hour)</p>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, fill: "#888" }} 
                    axisLine={{ stroke: "#333" }}
                    tickLine={{ stroke: "#333" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "#888" }} 
                    axisLine={{ stroke: "#333" }}
                    tickLine={{ stroke: "#333" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="uploads"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#uploadGradient)"
                    name="Uploads"
                  />
                  <Area
                    type="monotone"
                    dataKey="downloads"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#downloadGradient)"
                    name="Downloads"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Request Distribution */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Request Distribution</p>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(-6)} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={{ stroke: "#333" }}
                    tickLine={{ stroke: "#333" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={{ stroke: "#333" }}
                    tickLine={{ stroke: "#333" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="uploads" fill="#22c55e" name="Uploads" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="downloads" fill="#3b82f6" name="Downloads" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="errors" fill="#ef4444" name="Errors" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Storage Bar */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Storage Usage</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatBytes(metrics.storageUsed)} / {formatBytes(metrics.storageLimit)}
            </span>
          </div>
          <div className="h-2 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-terminal-green to-emerald-400 rounded-full transition-all"
              style={{ width: `${Math.min((metrics.storageUsed / metrics.storageLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
