"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Server,
  Cpu,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  Settings,
  TrendingUp,
  Loader2,
  Clock,
  Zap,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { AlertConfigModal } from "@/components/alert-config-modal";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// No fake data - everything from AWS APIs

export default function MonitoringPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAlertConfigOpen, setIsAlertConfigOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [incidents, setIncidents] = useState<any[]>([]);

  const [awsData, setAwsData] = useState<any>(null);
  const [awsConfigured, setAwsConfigured] = useState<boolean | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch real metrics on mount
  useEffect(() => {
    if (session) {
      fetchRealMetrics();
    }
  }, [session]);

  const fetchRealMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/monitoring/metrics");
      const response = await res.json();
      
      setAwsConfigured(response.configured);
      if (response.configured && response.data) {
        setAwsData(response.data);
        setIncidents(response.alertIncidents || []);
        setMetricsError(null);
      } else {
        setAwsData(null);
      }
      if (response.error) {
        setMetricsError(response.error);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      setMetricsError("Failed to connect to monitoring API");
      setAwsData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    await fetchRealMetrics();
    setIsRefreshing(false);
    toast({ title: "Refreshed", description: "Metrics updated" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "warning":
        return "text-amber-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "critical":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 border-red-500/30 text-red-500";
      case "warning":
        return "bg-amber-500/10 border-amber-500/30 text-amber-500";
      case "info":
        return "bg-blue-500/10 border-blue-500/30 text-blue-500";
      case "resolved":
        return "bg-green-500/10 border-green-500/30 text-green-500";
      default:
        return "bg-muted/10 border-border text-muted-foreground";
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
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
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Activity className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">Monitoring</h1>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshMetrics}
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsAlertConfigOpen(true)}
                        className="relative"
                      >
                        <Bell className="w-4 h-4" />
                        {incidents.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {incidents.length}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Alerts ({incidents.length})</TooltipContent>
                  </Tooltip>

                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                    onClick={() => setIsAlertConfigOpen(true)}
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
              </div>
            )}

            {/* AWS Not Configured */}
            {!isLoading && awsConfigured === false && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg max-w-md text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-foreground mb-2">AWS Not Configured</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {metricsError || "AWS credentials are required to view monitoring data."}
                  </p>
                  <Button asChild className="bg-orange-500 hover:bg-orange-600">
                    <a href="/settings">Configure AWS Credentials</a>
                  </Button>
                </div>
              </div>
            )}

            {/* Error State */}
            {!isLoading && awsConfigured && metricsError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-500 text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {metricsError}
                </p>
              </div>
            )}

            {/* Real AWS Data */}
            {!isLoading && awsConfigured && awsData && (
              <>
                {/* CloudWatch Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* CPU */}
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <Cpu className="w-4 h-4 text-orange-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">CPU Usage</span>
                      </div>
                      {getStatusIcon(awsData.cloudwatch?.cpu?.current > 90 ? "critical" : awsData.cloudwatch?.cpu?.current > 70 ? "warning" : "healthy")}
                    </div>
                    <p className="text-3xl font-bold text-orange-500">
                      {awsData.cloudwatch?.cpu?.current || 0}
                      <span className="text-lg text-muted-foreground ml-1">%</span>
                    </p>
                  </div>

                  {/* Network */}
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Wifi className="w-4 h-4 text-purple-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">Network I/O</span>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-purple-500">
                      {(awsData.cloudwatch?.network?.inbound || 0) + (awsData.cloudwatch?.network?.outbound || 0)}
                      <span className="text-lg text-muted-foreground ml-1">MB</span>
                    </p>
                  </div>

                  {/* Lambda Errors */}
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <Zap className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">Lambda Errors</span>
                      </div>
                      {getStatusIcon(awsData.cloudwatch?.errors?.count > 0 ? "warning" : "healthy")}
                    </div>
                    <p className="text-3xl font-bold text-red-500">
                      {awsData.cloudwatch?.errors?.count || 0}
                      <span className="text-lg text-muted-foreground ml-1">({awsData.cloudwatch?.errors?.rate || 0}%)</span>
                    </p>
                  </div>

                  {/* ALB Requests */}
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">ALB Requests</span>
                      </div>
                      {getStatusIcon(awsData.cloudwatch?.alb?.http5xx > 0 ? "warning" : "healthy")}
                    </div>
                    <p className="text-3xl font-bold text-blue-500">
                      {awsData.cloudwatch?.alb?.requestCount || 0}
                      <span className="text-lg text-muted-foreground ml-1">reqs</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* EC2 Instance Health */}
                  <div className="lg:col-span-2">
                    <div className="bg-card border border-border rounded-lg">
                      <div className="px-4 py-3 border-b border-border">
                        <h2 className="font-medium flex items-center gap-2">
                          <Server className="w-4 h-4 text-orange-400" />
                          EC2 Instance Health
                        </h2>
                      </div>
                      {awsData.instances?.length > 0 ? (
                        <div className="divide-y divide-border">
                          {awsData.instances.map((instance: any) => (
                            <div
                              key={instance.instanceId}
                              className="px-4 py-3 flex items-center justify-between hover:bg-accent/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {getStatusIcon(instance.instanceStatus === "ok" ? "healthy" : "warning")}
                                <div>
                                  <span className="font-medium font-mono text-sm">{instance.instanceId}</span>
                                  <p className="text-xs text-muted-foreground">{instance.instanceType} • {instance.availabilityZone}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium",
                                  instance.state === "running" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                                )}>
                                  {instance.state?.toUpperCase()}
                                </span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium",
                                  instance.systemStatus === "ok" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                )}>
                                  System: {instance.systemStatus}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No EC2 instances found</p>
                        </div>
                      )}
                    </div>

                    {/* Costs */}
                    {awsData.costs && (
                      <div className="bg-card border border-border rounded-lg mt-6">
                        <div className="px-4 py-3 border-b border-border">
                          <h2 className="font-medium flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-400" />
                            AWS Costs (Last 7 Days)
                          </h2>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-2xl font-bold text-foreground">${awsData.costs.total}</p>
                              <p className="text-xs text-muted-foreground">Total spend</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-orange-500">${awsData.costs.forecast}</p>
                              <p className="text-xs text-muted-foreground">30-day forecast</p>
                            </div>
                          </div>
                          {awsData.costs.byService?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Top Services</p>
                              {awsData.costs.byService.slice(0, 5).map((svc: any) => (
                                <div key={svc.service} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground truncate max-w-[200px]">{svc.service}</span>
                                  <span className="font-medium">${svc.amount}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Audit Events & Alerts */}
                  <div className="space-y-6">
                    {/* Recent Audit Events */}
                    <div className="bg-card border border-border rounded-lg">
                      <div className="px-4 py-3 border-b border-border">
                        <h2 className="font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-400" />
                          Recent Activity (CloudTrail)
                        </h2>
                      </div>
                      {awsData.auditEvents?.length > 0 ? (
                        <div className="divide-y divide-border max-h-64 overflow-y-auto">
                          {awsData.auditEvents.slice(0, 10).map((event: any) => (
                            <div key={event.eventId} className="p-3">
                              <p className="text-sm font-medium">{event.eventName}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{event.username}</span>
                                <span>•</span>
                                <span>{new Date(event.eventTime).toLocaleTimeString()}</span>
                              </div>
                              {event.errorCode && (
                                <p className="text-xs text-red-500 mt-1">{event.errorCode}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No recent activity</p>
                        </div>
                      )}
                    </div>

                    {/* Alert Incidents */}
                    <div className="bg-card border border-border rounded-lg">
                      <div className="px-4 py-3 border-b border-border">
                        <h2 className="font-medium flex items-center gap-2">
                          <Bell className="w-4 h-4 text-orange-400" />
                          Alert Incidents
                        </h2>
                      </div>
                      {incidents.length > 0 ? (
                        <div className="divide-y divide-border">
                          {incidents.map((incident: any) => (
                            <div key={incident.id} className="p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium">{incident.alertRule?.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {incident.alertRule?.metric} • {incident.status}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-green-500" />
                          <p>No active alerts</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
        <AlertConfigModal isOpen={isAlertConfigOpen} onClose={() => setIsAlertConfigOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
