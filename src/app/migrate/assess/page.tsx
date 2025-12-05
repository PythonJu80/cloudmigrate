"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  BarChart3,
  Network,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  FileText,
  Download,
  Filter,
  Search,
  Layers,
  GitBranch,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Assessment categories
const assessmentAreas = [
  {
    id: "inventory",
    title: "Asset Inventory",
    description: "Complete list of discovered infrastructure",
    icon: Layers,
    href: "/migrate/assess/inventory",
    count: 0,
    status: "pending",
  },
  {
    id: "dependencies",
    title: "Dependency Mapping",
    description: "Visualize connections between systems",
    icon: GitBranch,
    href: "/migrate/assess/dependencies",
    count: 0,
    status: "pending",
  },
  {
    id: "readiness",
    title: "Migration Readiness",
    description: "Assess each workload's cloud readiness",
    icon: Zap,
    href: "/migrate/assess/readiness",
    count: 0,
    status: "pending",
  },
  {
    id: "cost",
    title: "Cost Estimation",
    description: "Projected AWS costs vs current spend",
    icon: DollarSign,
    href: "/migrate/assess/cost",
    count: 0,
    status: "pending",
  },
];

export default function AssessPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock stats - will be replaced with real data
  const stats = {
    total: 0,
    ready: 0,
    needsWork: 0,
    blocked: 0,
    estimatedCost: 0,
    currentCost: 0,
  };

  const hasAssets = stats.total > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Migration Assessment</h2>
          <p className="text-sm text-muted-foreground">
            Analyze your infrastructure and plan your migration strategy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={!hasAssets}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Assets</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-terminal-green" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.ready}</p>
              <p className="text-xs text-muted-foreground">Ready to Migrate</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.needsWork}</p>
              <p className="text-xs text-muted-foreground">Needs Attention</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.blocked}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
          </div>
        </div>
      </div>

      {/* No Assets State */}
      {!hasAssets && (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Assets to Assess
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Run a discovery scan first to find your infrastructure. 
            Then come back here to analyze and plan your migration.
          </p>
          <Link href="/migrate/discover">
            <Button className="bg-terminal-green hover:bg-terminal-green/90 text-background">
              Go to Discovery
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Assessment Areas */}
      {hasAssets && (
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Assessment Areas</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {assessmentAreas.map((area) => {
              const Icon = area.icon;
              return (
                <Link
                  key={area.id}
                  href={area.href}
                  className="group flex items-start gap-4 p-5 bg-card border border-border rounded-xl hover:border-terminal-green/30 transition-all"
                >
                  <div className="p-3 bg-accent rounded-lg group-hover:bg-terminal-green/10 transition-colors">
                    <Icon className="w-6 h-6 text-muted-foreground group-hover:text-terminal-green transition-colors" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground group-hover:text-terminal-green transition-colors">
                        {area.title}
                      </h4>
                      {area.count > 0 && (
                        <span className="text-xs bg-accent px-2 py-0.5 rounded-full text-muted-foreground">
                          {area.count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {area.description}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-terminal-green group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Cost Comparison Preview */}
      {hasAssets && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-terminal-green" />
            Cost Comparison
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current On-Prem (est.)</p>
              <p className="text-2xl font-bold text-foreground">
                ${stats.currentCost.toLocaleString()}/mo
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Projected AWS</p>
              <p className="text-2xl font-bold text-terminal-green">
                ${stats.estimatedCost.toLocaleString()}/mo
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Potential Savings</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.currentCost > 0 
                  ? `${Math.round(((stats.currentCost - stats.estimatedCost) / stats.currentCost) * 100)}%`
                  : "—"
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
