"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
  BarChart3,
  Layers,
  Zap,
  Calendar,
  Plus,
  Settings,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";

interface MigrationWave {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  workloads: number;
  progress: number;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedDuration: string;
}

export default function ExecutePage() {
  const [waves, setWaves] = useState<MigrationWave[]>([]);
  const [activeWave, setActiveWave] = useState<string | null>(null);

  const hasWaves = waves.length > 0;
  const hasReadyWorkloads = false; // Will be replaced with real check

  // Stats
  const stats = {
    totalWorkloads: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    failed: 0,
    dataTransferred: 0,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Execute Migration</h2>
          <p className="text-sm text-muted-foreground">
            Run migrations in waves with real-time progress tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={!hasReadyWorkloads}>
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
          <Button 
            className="bg-terminal-green hover:bg-terminal-green/90 text-background"
            disabled={!hasReadyWorkloads}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Wave
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalWorkloads}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-terminal-green" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold text-terminal-green">{stats.completed}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-muted-foreground">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-muted-foreground">Failed</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
        </div>
      </div>

      {/* No Workloads State */}
      {!hasReadyWorkloads && (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Workloads Ready for Migration
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Configure your workloads first. Each workload needs migration settings 
            before it can be executed.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/migrate/discover">
              <Button variant="outline">
                Discover Infrastructure
              </Button>
            </Link>
            <Link href="/migrate/workloads">
              <Button className="bg-terminal-green hover:bg-terminal-green/90 text-background">
                Configure Workloads
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Migration Waves */}
      {hasWaves && (
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Migration Waves</h3>
          <div className="space-y-3">
            {waves.map((wave) => (
              <div
                key={wave.id}
                className={cn(
                  "bg-card border rounded-xl p-5 transition-all",
                  wave.status === "running" 
                    ? "border-blue-500/50" 
                    : "border-border"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      wave.status === "completed" && "bg-terminal-green/10",
                      wave.status === "running" && "bg-blue-500/10",
                      wave.status === "failed" && "bg-red-500/10",
                      wave.status === "pending" && "bg-accent",
                      wave.status === "paused" && "bg-amber-500/10"
                    )}>
                      {wave.status === "completed" && <CheckCircle className="w-5 h-5 text-terminal-green" />}
                      {wave.status === "running" && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                      {wave.status === "failed" && <XCircle className="w-5 h-5 text-red-400" />}
                      {wave.status === "pending" && <Clock className="w-5 h-5 text-muted-foreground" />}
                      {wave.status === "paused" && <Pause className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{wave.name}</h4>
                      <p className="text-sm text-muted-foreground">{wave.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {wave.status === "pending" && (
                      <Button size="sm" className="bg-terminal-green hover:bg-terminal-green/90 text-background">
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                    {wave.status === "running" && (
                      <>
                        <Button size="sm" variant="outline">
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                        <Button size="sm" variant="destructive">
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                      </>
                    )}
                    {wave.status === "paused" && (
                      <Button size="sm" className="bg-terminal-green hover:bg-terminal-green/90 text-background">
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                {(wave.status === "running" || wave.status === "completed") && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">
                        {wave.workloads} workloads
                      </span>
                      <span className="text-terminal-green font-mono">
                        {wave.progress}%
                      </span>
                    </div>
                    <div className="h-2 bg-accent rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-300",
                          wave.status === "completed" ? "bg-terminal-green" : "bg-blue-400"
                        )}
                        style={{ width: `${wave.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      {!hasWaves && hasReadyWorkloads && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">How Migration Waves Work</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-terminal-green/20 text-terminal-green font-bold text-sm shrink-0">
                1
              </div>
              <div>
                <h4 className="font-medium text-foreground">Create a Wave</h4>
                <p className="text-sm text-muted-foreground">
                  Group related workloads together for coordinated migration
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-terminal-green/20 text-terminal-green font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <h4 className="font-medium text-foreground">Execute</h4>
                <p className="text-sm text-muted-foreground">
                  Run the wave with real-time progress and rollback capability
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-terminal-green/20 text-terminal-green font-bold text-sm shrink-0">
                3
              </div>
              <div>
                <h4 className="font-medium text-foreground">Validate</h4>
                <p className="text-sm text-muted-foreground">
                  Verify data integrity and application functionality
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
