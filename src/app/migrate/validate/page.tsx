"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  RefreshCw,
  Shield,
  Zap,
  Database,
  ArrowRight,
  Clock,
  BarChart3,
  Eye,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ValidationCheck {
  id: string;
  name: string;
  description: string;
  category: "integrity" | "performance" | "security" | "connectivity";
  status: "pending" | "running" | "passed" | "failed" | "warning";
  details?: string;
}

const validationCategories = [
  {
    id: "integrity",
    name: "Data Integrity",
    description: "Verify checksums and data completeness",
    icon: Database,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    id: "performance",
    name: "Performance",
    description: "Compare response times and throughput",
    icon: Zap,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  {
    id: "security",
    name: "Security",
    description: "Validate IAM policies and encryption",
    icon: Shield,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
  {
    id: "connectivity",
    name: "Connectivity",
    description: "Test network paths and DNS resolution",
    icon: RefreshCw,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
];

export default function ValidatePage() {
  const [checks, setChecks] = useState<ValidationCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Stats
  const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    pending: 0,
  };

  const hasMigratedWorkloads = false; // Will be replaced with real check
  const hasChecks = checks.length > 0;

  const runValidation = async () => {
    setIsRunning(true);
    // Validation logic would go here
    setTimeout(() => setIsRunning(false), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Validation & Reports</h2>
          <p className="text-sm text-muted-foreground">
            Verify migration success and generate compliance reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={!hasChecks}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button 
            className="bg-terminal-green hover:bg-terminal-green/90 text-background"
            disabled={!hasMigratedWorkloads || isRunning}
            onClick={runValidation}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Validation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {hasChecks && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Checks</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Passed</p>
            <p className="text-2xl font-bold text-terminal-green">{stats.passed}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Warnings</p>
            <p className="text-2xl font-bold text-amber-400">{stats.warnings}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
          </div>
        </div>
      )}

      {/* No Migrations State */}
      {!hasMigratedWorkloads && (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Migrations to Validate
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Complete at least one migration before running validation checks.
            Validation ensures data integrity and application functionality.
          </p>
          <Link href="/migrate/execute">
            <Button className="bg-terminal-green hover:bg-terminal-green/90 text-background">
              Go to Execute
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Validation Categories */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Validation Categories</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {validationCategories.map((category) => {
            const Icon = category.icon;
            const categoryChecks = checks.filter(c => c.category === category.id);
            const passed = categoryChecks.filter(c => c.status === "passed").length;
            const failed = categoryChecks.filter(c => c.status === "failed").length;
            
            return (
              <div
                key={category.id}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-lg", category.bgColor)}>
                    <Icon className={cn("w-6 h-6", category.color)} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{category.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                    {categoryChecks.length > 0 && (
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-terminal-green flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {passed} passed
                        </span>
                        {failed > 0 && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            {failed} failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reports Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Reports</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 opacity-50">
            <FileText className="w-8 h-8 text-muted-foreground mb-3" />
            <h4 className="font-semibold text-foreground">Migration Summary</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of all migrated workloads
            </p>
            <Button variant="outline" size="sm" className="mt-3" disabled>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 opacity-50">
            <BarChart3 className="w-8 h-8 text-muted-foreground mb-3" />
            <h4 className="font-semibold text-foreground">Cost Analysis</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Before vs after cost comparison
            </p>
            <Button variant="outline" size="sm" className="mt-3" disabled>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 opacity-50">
            <Shield className="w-8 h-8 text-muted-foreground mb-3" />
            <h4 className="font-semibold text-foreground">Compliance Report</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Security and compliance validation
            </p>
            <Button variant="outline" size="sm" className="mt-3" disabled>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
