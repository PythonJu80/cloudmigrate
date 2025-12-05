"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Zap,
  Calendar,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Demo workflows
const demoWorkflows = [
  {
    id: "1",
    name: "Daily S3 Backup",
    description: "Backup production data to S3 every day at midnight",
    status: "active",
    trigger: "schedule",
    schedule: "0 0 * * *",
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    nextRun: new Date(Date.now() + 82800000).toISOString(),
    runs: 45,
    successRate: 98,
  },
  {
    id: "2",
    name: "New User Onboarding",
    description: "Provision resources when new user signs up",
    status: "active",
    trigger: "event",
    event: "user.created",
    lastRun: new Date(Date.now() - 7200000).toISOString(),
    runs: 128,
    successRate: 100,
  },
  {
    id: "3",
    name: "Cost Alert Notification",
    description: "Send Slack alert when AWS costs exceed threshold",
    status: "paused",
    trigger: "event",
    event: "cost.threshold",
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    runs: 12,
    successRate: 100,
  },
];

export default function AutomationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [workflows, setWorkflows] = useState(demoWorkflows);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<typeof demoWorkflows[0] | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const toggleWorkflowStatus = (id: string) => {
    setWorkflows((wfs) =>
      wfs.map((wf) =>
        wf.id === id
          ? { ...wf, status: wf.status === "active" ? "paused" : "active" }
          : wf
      )
    );
    toast({
      title: "Workflow Updated",
      description: "Workflow status has been changed",
    });
  };

  const runWorkflow = (id: string) => {
    toast({
      title: "Workflow Triggered",
      description: "Manual run has been initiated",
    });
  };

  const deleteWorkflow = (id: string) => {
    if (confirm("Delete this workflow?")) {
      setWorkflows((wfs) => wfs.filter((wf) => wf.id !== id));
      setSelectedWorkflow(null);
      toast({ title: "Deleted", description: "Workflow has been removed" });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar onConfigClick={() => setIsConfigOpen(true)} />
        <div className="w-52 shrink-0" />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Header */}
          <header className="shrink-0 border-b border-border/50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-500/10 rounded-lg">
                    <Workflow className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">Automations</h1>
                    <p className="text-xs text-muted-foreground">
                      {workflows.length} workflows • {workflows.filter((w) => w.status === "active").length} active
                    </p>
                  </div>
                </div>

                <Button className="bg-pink-500 hover:bg-pink-600 text-white gap-2">
                  <Plus className="w-4 h-4" />
                  New Workflow
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Workflow List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(workflow)}
                    className={cn(
                      "p-4 bg-card border rounded-lg cursor-pointer transition-all hover:border-pink-500/50",
                      selectedWorkflow?.id === workflow.id
                        ? "border-pink-500"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            workflow.status === "active"
                              ? "bg-green-500/10"
                              : "bg-amber-500/10"
                          )}
                        >
                          {workflow.status === "active" ? (
                            <Zap className="w-4 h-4 text-green-500" />
                          ) : (
                            <Pause className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{workflow.name}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {workflow.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {workflow.trigger === "schedule" ? (
                                <Calendar className="w-3 h-3" />
                              ) : (
                                <GitBranch className="w-3 h-3" />
                              )}
                              {workflow.trigger === "schedule"
                                ? workflow.schedule
                                : workflow.event}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              {workflow.successRate}% success
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {workflow.runs} runs
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                runWorkflow(workflow.id);
                              }}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Run Now</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWorkflowStatus(workflow.id);
                              }}
                            >
                              {workflow.status === "active" ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {workflow.status === "active" ? "Pause" : "Activate"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}

                {workflows.length === 0 && (
                  <div className="text-center py-12">
                    <Workflow className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No workflows yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first automation workflow
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Workflow Details Panel */}
            {selectedWorkflow && (
              <div className="w-80 border-l border-border/50 bg-card/30 overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-muted-foreground">WORKFLOW DETAILS</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedWorkflow(null)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Name</label>
                      <p className="text-sm font-medium">{selectedWorkflow.name}</p>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            selectedWorkflow.status === "active"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-amber-500/10 text-amber-500"
                          )}
                        >
                          {selectedWorkflow.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Trigger</label>
                      <p className="text-sm">
                        {selectedWorkflow.trigger === "schedule"
                          ? `Schedule: ${selectedWorkflow.schedule}`
                          : `Event: ${selectedWorkflow.event}`}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Last Run</label>
                      <p className="text-sm">{formatDate(selectedWorkflow.lastRun)}</p>
                    </div>

                    {selectedWorkflow.nextRun && (
                      <div>
                        <label className="text-xs text-muted-foreground">Next Run</label>
                        <p className="text-sm">{formatDate(selectedWorkflow.nextRun)}</p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-muted-foreground">Statistics</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="p-2 bg-accent/30 rounded">
                          <p className="text-lg font-bold">{selectedWorkflow.runs}</p>
                          <p className="text-xs text-muted-foreground">Total Runs</p>
                        </div>
                        <div className="p-2 bg-accent/30 rounded">
                          <p className="text-lg font-bold text-green-500">
                            {selectedWorkflow.successRate}%
                          </p>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border space-y-2">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Settings className="w-4 h-4" />
                        Edit Workflow
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => deleteWorkflow(selectedWorkflow.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Workflow
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
