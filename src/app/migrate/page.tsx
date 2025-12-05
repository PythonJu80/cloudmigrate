"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Radar,
  ClipboardCheck,
  Server,
  Rocket,
  CheckCircle2,
  ArrowRight,
  HardDrive,
  Database,
  Globe,
  FileStack,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";

interface MigrationStats {
  discovered: {
    servers: number;
    databases: number;
    applications: number;
    fileShares: number;
    totalSize: number;
  };
  assessed: {
    ready: number;
    needsWork: number;
    blocked: number;
  };
  migrated: {
    completed: number;
    inProgress: number;
    failed: number;
    pending: number;
  };
  lastScan: string | null;
}

// Migration journey steps for the overview
const journeySteps = [
  {
    id: "discover",
    title: "Discover",
    description: "Scan your infrastructure to find servers, databases, apps, and files",
    icon: Radar,
    href: "/migrate/discover",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    status: "ready", // ready, in-progress, completed
  },
  {
    id: "assess",
    title: "Assess",
    description: "Analyze dependencies, estimate costs, and plan your migration",
    icon: ClipboardCheck,
    href: "/migrate/assess",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    status: "locked",
  },
  {
    id: "workloads",
    title: "Workloads",
    description: "Configure migration settings for each workload type",
    icon: Server,
    href: "/migrate/workloads",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    status: "locked",
  },
  {
    id: "execute",
    title: "Execute",
    description: "Run migrations in waves with real-time progress tracking",
    icon: Rocket,
    href: "/migrate/execute",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    status: "locked",
  },
  {
    id: "validate",
    title: "Validate",
    description: "Verify data integrity and generate compliance reports",
    icon: CheckCircle2,
    href: "/migrate/validate",
    color: "text-terminal-green",
    bgColor: "bg-terminal-green/10",
    status: "locked",
  },
];

export default function MigrateOverviewPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const res = await fetch("/api/migrate/stats");
      // const data = await res.json();
      
      // Mock data for now
      setStats({
        discovered: {
          servers: 0,
          databases: 0,
          applications: 0,
          fileShares: 0,
          totalSize: 0,
        },
        assessed: {
          ready: 0,
          needsWork: 0,
          blocked: 0,
        },
        migrated: {
          completed: 0,
          inProgress: 0,
          failed: 0,
          pending: 0,
        },
        lastScan: null,
      });
    } catch (error) {
      console.error("Failed to fetch migration stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasDiscoveredAssets = stats && (
    stats.discovered.servers > 0 ||
    stats.discovered.databases > 0 ||
    stats.discovered.applications > 0 ||
    stats.discovered.fileShares > 0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Welcome to CloudMigrate
        </h2>
        <p className="text-muted-foreground">
          Migrate your entire infrastructure to AWS - servers, databases, applications, and files.
        </p>
      </div>

      {/* Quick Stats */}
      {!isLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={HardDrive}
            label="Servers"
            value={stats.discovered.servers}
            color="text-blue-400"
          />
          <StatCard
            icon={Database}
            label="Databases"
            value={stats.discovered.databases}
            color="text-purple-400"
          />
          <StatCard
            icon={Globe}
            label="Applications"
            value={stats.discovered.applications}
            color="text-amber-400"
          />
          <StatCard
            icon={FileStack}
            label="File Shares"
            value={stats.discovered.fileShares}
            color="text-terminal-green"
          />
        </div>
      )}

      {/* Migration Journey */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Migration Journey</h3>
          {stats?.lastScan && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last scan: {new Date(stats.lastScan).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="grid gap-4">
          {journeySteps.map((step, index) => {
            const Icon = step.icon;
            const isFirst = index === 0;
            
            return (
              <Link
                key={step.id}
                href={step.href}
                className={cn(
                  "group relative flex items-center gap-4 p-4 rounded-xl border transition-all",
                  "bg-card hover:bg-accent/50",
                  isFirst 
                    ? "border-terminal-green/30 hover:border-terminal-green/50" 
                    : "border-border hover:border-border"
                )}
              >
                {/* Step Number */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold",
                  isFirst 
                    ? "bg-terminal-green/20 text-terminal-green" 
                    : "bg-accent text-muted-foreground"
                )}>
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={cn("p-3 rounded-lg", step.bgColor)}>
                  <Icon className={cn("w-6 h-6", step.color)} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground group-hover:text-terminal-green transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Arrow */}
                <ArrowRight className={cn(
                  "w-5 h-5 transition-transform group-hover:translate-x-1",
                  isFirst ? "text-terminal-green" : "text-muted-foreground"
                )} />

                {/* First step highlight */}
                {isFirst && !hasDiscoveredAssets && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-terminal-green text-background text-xs font-bold rounded-full">
                    Start Here
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Getting Started CTA */}
      {!hasDiscoveredAssets && (
        <div className="bg-gradient-to-r from-terminal-green/10 to-blue-500/10 border border-terminal-green/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-terminal-green/20 rounded-lg">
              <Radar className="w-8 h-8 text-terminal-green" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Ready to discover your infrastructure?
              </h3>
              <p className="text-muted-foreground mb-4">
                CloudMigrate will scan your network to find servers, databases, applications, 
                and file shares. You'll get a complete inventory with migration recommendations.
              </p>
              <Link href="/migrate/discover">
                <Button className="bg-terminal-green hover:bg-terminal-green/90 text-background">
                  <Radar className="w-4 h-4 mr-2" />
                  Start Discovery Scan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Migration Progress (shown when there are assets) */}
      {hasDiscoveredAssets && stats && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Assessment Status */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-purple-400" />
              Assessment Status
            </h4>
            <div className="space-y-3">
              <ProgressRow 
                label="Ready to migrate" 
                value={stats.assessed.ready} 
                color="bg-terminal-green" 
                icon={CheckCircle}
              />
              <ProgressRow 
                label="Needs attention" 
                value={stats.assessed.needsWork} 
                color="bg-amber-400" 
                icon={AlertCircle}
              />
              <ProgressRow 
                label="Blocked" 
                value={stats.assessed.blocked} 
                color="bg-red-400" 
                icon={XCircle}
              />
            </div>
          </div>

          {/* Migration Progress */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              Migration Progress
            </h4>
            <div className="space-y-3">
              <ProgressRow 
                label="Completed" 
                value={stats.migrated.completed} 
                color="bg-terminal-green" 
                icon={CheckCircle}
              />
              <ProgressRow 
                label="In Progress" 
                value={stats.migrated.inProgress} 
                color="bg-blue-400" 
                icon={Loader2}
              />
              <ProgressRow 
                label="Pending" 
                value={stats.migrated.pending} 
                color="bg-muted" 
                icon={Clock}
              />
              <ProgressRow 
                label="Failed" 
                value={stats.migrated.failed} 
                color="bg-red-400" 
                icon={XCircle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Icon className={cn("w-5 h-5", color)} />
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ 
  label, 
  value, 
  color, 
  icon: Icon 
}: { 
  label: string; 
  value: number; 
  color: string;
  icon: any;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
