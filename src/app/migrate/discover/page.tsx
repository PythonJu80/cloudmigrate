"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Radar,
  Play,
  Pause,
  RefreshCw,
  Server,
  Database,
  Globe,
  HardDrive,
  Network,
  Shield,
  Container,
  Mail,
  GitBranch,
  Activity,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  Download,
  Settings,
  Wifi,
  WifiOff,
  Clock,
  Zap,
  FileStack,
  Lock,
  Cpu,
  MemoryStick,
  Box,
  Layers,
  Radio,
  Eye,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";

// The 12 migration categories that really matter
const discoveryCategories = [
  {
    id: "compute",
    name: "Compute",
    icon: Server,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    description: "VMs, physical servers",
    awsTargets: ["EC2", "ECS", "Lambda"],
    ports: [22, 3389, 5900],
  },
  {
    id: "databases",
    name: "Databases",
    icon: Database,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    description: "SQL Server, Oracle, MySQL, PostgreSQL",
    awsTargets: ["RDS", "Aurora", "DynamoDB"],
    ports: [3306, 5432, 1433, 1521, 27017],
  },
  {
    id: "storage",
    name: "File Storage",
    icon: HardDrive,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    description: "SMB shares, NAS, file servers",
    awsTargets: ["FSx", "EFS", "S3"],
    ports: [445, 139, 2049, 21],
  },
  {
    id: "identity",
    name: "Identity",
    icon: Shield,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    description: "Active Directory, LDAP",
    awsTargets: ["Managed AD", "IAM Identity Center"],
    ports: [389, 636, 88, 464],
  },
  {
    id: "networking",
    name: "Networks & VPN",
    icon: Network,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    description: "Firewalls, routers, VPN",
    awsTargets: ["VPC", "VPN", "Direct Connect"],
    ports: [500, 4500, 1194],
  },
  {
    id: "webapps",
    name: "Web Apps",
    icon: Globe,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    description: "IIS, Apache, Nginx",
    awsTargets: ["EC2", "ECS", "Beanstalk", "Lambda"],
    ports: [80, 443, 8080, 8443],
  },
  {
    id: "backups",
    name: "Backups / DR",
    icon: HardDrive,
    color: "text-slate-400",
    bgColor: "bg-slate-400/10",
    description: "Veeam, tapes, SAN snapshots",
    awsTargets: ["AWS Backup", "S3 Glacier"],
    ports: [9392, 10006],
  },
  {
    id: "monitoring",
    name: "Logging / Monitoring",
    icon: Activity,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    description: "Nagios, Zabbix, ELK, Splunk",
    awsTargets: ["CloudWatch", "OpenSearch", "Grafana"],
    ports: [9090, 9100, 9200, 5601, 514],
  },
  {
    id: "devops",
    name: "DevOps Pipelines",
    icon: GitBranch,
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    description: "Jenkins, GitLab, Bitbucket",
    awsTargets: ["CodePipeline", "CodeBuild"],
    ports: [8080, 8929, 7990],
  },
  {
    id: "messaging",
    name: "Messaging & Queues",
    icon: Radio,
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    description: "RabbitMQ, Kafka, ActiveMQ",
    awsTargets: ["SQS", "SNS", "MSK"],
    ports: [5672, 9092, 61616],
  },
  {
    id: "email",
    name: "Email / SMTP",
    icon: Mail,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    description: "Exchange, SMTP relays",
    awsTargets: ["SES", "WorkMail"],
    ports: [25, 587, 993, 995],
  },
  {
    id: "batch",
    name: "Batch Jobs / Cron",
    icon: Clock,
    color: "text-teal-400",
    bgColor: "bg-teal-400/10",
    description: "Cron servers, Task Scheduler",
    awsTargets: ["EventBridge", "Batch", "Step Functions"],
    ports: [22], // Usually detected via SSH + process inspection
  },
];

interface ScanState {
  status: "idle" | "preparing" | "scanning" | "analyzing" | "complete" | "error";
  progress: number;
  currentCategory: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

interface DiscoveredAsset {
  id: string;
  category: string;
  type: string;
  name: string;
  hostname: string;
  ip: string;
  os?: string;
  version?: string;
  cpu?: number;
  memory?: number;
  storage?: number;
  status: "online" | "offline" | "unknown";
  ports: number[];
  services: string[];
  awsTarget: string;
  migrationReady: boolean;
  issues: string[];
}

export default function DiscoverPage() {
  const { data: session } = useSession();
  const [scanState, setScanState] = useState<ScanState>({
    status: "idle",
    progress: 0,
    currentCategory: null,
    startedAt: null,
    completedAt: null,
    error: null,
  });
  const [discoveredAssets, setDiscoveredAssets] = useState<DiscoveredAsset[]>([]);
  const [agentConnected, setAgentConnected] = useState(false);
  const [scanTarget, setScanTarget] = useState("192.168.1.0/24");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scanLogs, setScanLogs] = useState<string[]>([]);

  // Check agent connection status and load existing discoveries
  useEffect(() => {
    checkAgentStatus();
    loadDiscoveredAssets();
  }, []);

  const checkAgentStatus = async () => {
    try {
      const res = await fetch("/api/agent/status");
      if (res.ok) {
        const data = await res.json();
        setAgentConnected(data.connected);
      }
    } catch {
      setAgentConnected(false);
    }
  };

  const loadDiscoveredAssets = async () => {
    try {
      const res = await fetch("/api/migrate/discover");
      if (res.ok) {
        const data = await res.json();
        if (data.hosts && data.hosts.length > 0) {
          setDiscoveredAssets(data.hosts.map((host: any) => ({
            id: host.id,
            category: host.category,
            type: host.category,
            name: host.hostname || host.ip,
            hostname: host.hostname || "",
            ip: host.ip,
            os: host.os,
            status: host.status,
            ports: host.openPorts?.map((p: any) => p.port) || [],
            services: host.services?.map((s: any) => s.name) || [],
            awsTarget: host.awsTarget || "",
            migrationReady: host.migrationStatus === "ready",
            issues: [],
          })));
        }
      }
    } catch (error) {
      console.error("Failed to load discovered assets:", error);
    }
  };

  const addLog = (message: string) => {
    setScanLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const [commandId, setCommandId] = useState<string | null>(null);

  const startDiscovery = async () => {
    setScanState({
      status: "preparing",
      progress: 0,
      currentCategory: null,
      startedAt: new Date(),
      completedAt: null,
      error: null,
    });
    setScanLogs([]);

    addLog("Triggering discovery scan...");
    addLog(`Target network: ${scanTarget || "auto-detect"}`);

    try {
      // Trigger real discovery via API
      const res = await fetch("/api/migrate/discover/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: scanTarget,
          deep: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          // Agent not connected
          setScanState(prev => ({
            ...prev,
            status: "error",
            error: "Agent not connected",
          }));
          addLog("ERROR: Agent not connected");
          addLog("Start the CloudMigrate agent with: cloudmigrate-agent daemon --api-key YOUR_KEY");
          return;
        }
        throw new Error(data.error || "Failed to trigger discovery");
      }

      addLog(`Command queued: ${data.commandId}`);
      setCommandId(data.commandId);
      setScanState(prev => ({ ...prev, status: "scanning" }));

      // Poll for command completion
      pollCommandStatus(data.commandId);

    } catch (error: any) {
      setScanState(prev => ({
        ...prev,
        status: "error",
        error: error.message || "Scan failed",
      }));
      addLog(`ERROR: ${error.message || "Scan failed"}`);
    }
  };

  const pollCommandStatus = async (cmdId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const res = await fetch(`/api/migrate/discover/trigger?commandId=${cmdId}`);
        const data = await res.json();

        if (data.status === "RUNNING") {
          setScanState(prev => ({ ...prev, status: "scanning", progress: 50 }));
          addLog("Agent is scanning the network...");
        } else if (data.status === "COMPLETED") {
          addLog("Discovery scan complete!");
          if (data.result) {
            addLog(`Found ${data.result.hostsFound || 0} hosts`);
          }
          setScanState(prev => ({
            ...prev,
            status: "complete",
            progress: 100,
            completedAt: new Date(),
          }));
          // Reload discovered assets
          loadDiscoveredAssets();
          return;
        } else if (data.status === "FAILED") {
          throw new Error(data.error || "Scan failed");
        }

        // Continue polling if still pending/running
        if (attempts < maxAttempts && (data.status === "PENDING" || data.status === "RUNNING")) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else if (attempts >= maxAttempts) {
          throw new Error("Scan timed out");
        }
      } catch (error: any) {
        setScanState(prev => ({
          ...prev,
          status: "error",
          error: error.message,
        }));
        addLog(`ERROR: ${error.message}`);
      }
    };

    poll();
  };

  const stopDiscovery = () => {
    setScanState(prev => ({
      ...prev,
      status: "idle",
      currentCategory: null,
    }));
    addLog("Scan cancelled by user");
  };

  const isScanning = scanState.status === "preparing" || scanState.status === "scanning" || scanState.status === "analyzing";

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Infrastructure Discovery</h2>
              <p className="text-sm text-muted-foreground">
                Scan your network to discover servers, databases, applications, and more
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Agent Status */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                agentConnected 
                  ? "bg-terminal-green/10 text-terminal-green" 
                  : "bg-amber-500/10 text-amber-500"
              )}>
                {agentConnected ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    Agent Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    Agent Offline
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Scan Configuration */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              Scan Configuration
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Target Network / IP Range
                </label>
                <Input
                  value={scanTarget}
                  onChange={(e) => setScanTarget(e.target.value)}
                  placeholder="192.168.1.0/24 or 10.0.0.1-254"
                  disabled={isScanning}
                  className="font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Scan Depth
                </label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
                  disabled={isScanning}
                >
                  <option value="quick">Quick Scan (ports + OS)</option>
                  <option value="standard">Standard (+ services)</option>
                  <option value="deep">Deep Scan (+ configs)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isScanning ? (
                <Button 
                  onClick={startDiscovery}
                  className="bg-terminal-green hover:bg-terminal-green/90 text-background"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Discovery
                </Button>
              ) : (
                <Button 
                  onClick={stopDiscovery}
                  variant="destructive"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Scan
                </Button>
              )}
              
              {!agentConnected && (
                <Button variant="outline" asChild>
                  <a href="/settings/agent" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Install Agent
                  </a>
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {isScanning && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {scanState.currentCategory ? `Scanning: ${scanState.currentCategory}` : "Preparing..."}
                  </span>
                  <span className="text-terminal-green font-mono">{scanState.progress}%</span>
                </div>
                <div className="h-2 bg-accent rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-terminal-green transition-all duration-300"
                    style={{ width: `${scanState.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Discovery Categories */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">What We Scan For</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {discoveryCategories.map((category) => {
                const Icon = category.icon;
                const assetCount = discoveredAssets.filter(a => a.category === category.id).length;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    )}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                      selectedCategory === category.id
                        ? "border-terminal-green bg-terminal-green/5"
                        : "border-border bg-card hover:bg-accent/50"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg", category.bgColor)}>
                      <Icon className={cn("w-5 h-5", category.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{category.name}</span>
                        {assetCount > 0 && (
                          <span className="text-xs bg-terminal-green/20 text-terminal-green px-2 py-0.5 rounded-full">
                            {assetCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {category.description}
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      selectedCategory === category.id && "rotate-90"
                    )} />
                  </button>
                );
              })}
            </div>

            {/* Expanded Category Details */}
            {selectedCategory && (
              <div className="bg-card border border-border rounded-xl p-5">
                {(() => {
                  const category = discoveryCategories.find(c => c.id === selectedCategory);
                  if (!category) return null;
                  const Icon = category.icon;
                  
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", category.bgColor)}>
                            <Icon className={cn("w-5 h-5", category.color)} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{category.name}</h4>
                            <p className="text-xs text-muted-foreground">{category.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">AWS Targets</p>
                          <div className="flex flex-wrap gap-1">
                            {category.awsTargets.map((target) => (
                              <span key={target} className="text-xs bg-terminal-green/10 text-terminal-green px-2 py-1 rounded">
                                {target}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Detection Ports</p>
                          <div className="flex flex-wrap gap-1">
                            {category.ports.map((port) => (
                              <span key={port} className="text-xs bg-accent text-muted-foreground px-2 py-1 rounded font-mono">
                                {port}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Discovered Assets (when available) */}
          {discoveredAssets.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-terminal-green" />
                Discovered Assets ({discoveredAssets.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">IP Address</th>
                      <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Hostname</th>
                      <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">OS</th>
                      <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Category</th>
                      <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Services</th>
                      <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">AWS Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discoveredAssets.map((asset) => (
                      <tr key={asset.id} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                            asset.status === "online" 
                              ? "bg-terminal-green/10 text-terminal-green" 
                              : "bg-red-500/10 text-red-400"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              asset.status === "online" ? "bg-terminal-green" : "bg-red-400"
                            )} />
                            {asset.status}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-sm text-foreground">{asset.ip}</td>
                        <td className="py-3 text-sm text-foreground">{asset.hostname || "—"}</td>
                        <td className="py-3 text-sm text-muted-foreground">{asset.os || "Unknown"}</td>
                        <td className="py-3">
                          <span className="text-xs bg-accent px-2 py-0.5 rounded text-foreground capitalize">
                            {asset.category}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {asset.services.slice(0, 3).map((svc, i) => (
                              <span key={i} className="text-xs bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                                {svc}
                              </span>
                            ))}
                            {asset.services.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{asset.services.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          {asset.awsTarget && (
                            <span className="text-xs text-terminal-green">
                              → {asset.awsTarget}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scan Log Sidebar */}
      <div className="w-80 border-l border-border bg-card/50 flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            Scan Log
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
          {scanLogs.length === 0 ? (
            <p className="text-muted-foreground">
              Scan logs will appear here...
            </p>
          ) : (
            <div className="space-y-1">
              {scanLogs.map((log, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "text-muted-foreground",
                    log.includes("ERROR") && "text-red-400",
                    log.includes("complete") && "text-terminal-green"
                  )}
                >
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
