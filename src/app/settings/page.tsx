"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Settings, Sun, Moon, Monitor, LogOut, Loader2, Key, Eye, EyeOff, Check, Globe, Sparkles, RefreshCw, FolderOpen, HardDrive, Cloud, CheckCircle, AlertCircle, Terminal, Copy, Download, Trash2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  
  // Cloud Provider Configuration
  const [activeProvider, setActiveProvider] = useState<"aws" | "gcp" | "azure" | "oracle">("aws");
  const [showSecrets, setShowSecrets] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerTestStatus, setProviderTestStatus] = useState<"idle" | "success" | "error">("idle");
  
  // Provider configs
  const [awsConfig, setAwsConfig] = useState({
    accessKeyId: "",
    secretAccessKey: "",
    region: "us-east-1",
    roleArn: "",
    externalId: "",
  });
  
  const [gcpConfig, setGcpConfig] = useState({
    projectId: "",
    clientEmail: "",
    privateKey: "",
    region: "us-central1",
  });
  
  const [azureConfig, setAzureConfig] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
    subscriptionId: "",
    region: "eastus",
  });
  
  const [oracleConfig, setOracleConfig] = useState({
    tenancyOcid: "",
    userOcid: "",
    fingerprint: "",
    privateKey: "",
    region: "us-ashburn-1",
    compartmentOcid: "",
  });
  
  // Company Knowledge
  const [companyUrl, setCompanyUrl] = useState("");
  const [companyContext, setCompanyContext] = useState("");
  const [companyUpdatedAt, setCompanyUpdatedAt] = useState<string | null>(null);
  const [scrapingCompany, setScrapingCompany] = useState(false);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);
  
  // Local Directory Access (Browser File System API)
  const [scanningFolder, setScanningFolder] = useState(false);
  const [folderStats, setFolderStats] = useState<{ 
    name: string;
    files: number; 
    folders: number; 
    totalSize: number;
    fileTypes: Record<string, number>;
    largeFiles: Array<{ name: string; path: string; size: number }>;
  } | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  
  // Desktop Agent
  const [agentApiKey, setAgentApiKey] = useState<string | null>(null);
  const [agentConnected, setAgentConnected] = useState(false);
  const [agentLastSeen, setAgentLastSeen] = useState<string | null>(null);
  const [generatingAgentKey, setGeneratingAgentKey] = useState(false);
  const [revokingAgentKey, setRevokingAgentKey] = useState(false);
  const [agentKeyCopied, setAgentKeyCopied] = useState(false);
  

  useEffect(() => {
    setMounted(true);
    // Load existing company knowledge
    fetch("/api/settings/company-knowledge")
      .then((res) => res.json())
      .then((data) => {
        if (data.website) setCompanyUrl(data.website);
        if (data.context) setCompanyContext(data.context);
        if (data.updatedAt) setCompanyUpdatedAt(data.updatedAt);
      })
      .catch(console.error);
    
    // Load existing provider credentials status
    fetch("/api/config/providers")
      .then((res) => res.json())
      .then((data) => {
        if (data.providers) {
          // Update UI to show which providers have credentials configured
          console.log("Provider credentials status:", data.providers);
        }
      })
      .catch(console.error);
    
    // Load agent settings
    fetch("/api/settings/agent")
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) setAgentApiKey(data.apiKey);
        if (data.connected) setAgentConnected(data.connected);
        if (data.lastSeen) setAgentLastSeen(data.lastSeen);
      })
      .catch(console.error);
  }, []);

  // Save provider credentials
  const saveProviderCredentials = async () => {
    setSavingProvider(true);
    setProviderTestStatus("idle");
    
    let credentials: Record<string, string> = {};
    
    switch (activeProvider) {
      case "aws":
        credentials = {
          AWS_ACCESS_KEY_ID: awsConfig.accessKeyId,
          AWS_SECRET_ACCESS_KEY: awsConfig.secretAccessKey,
          AWS_ROLE_ARN: awsConfig.roleArn,
          AWS_EXTERNAL_ID: awsConfig.externalId,
        };
        break;
      case "gcp":
        credentials = {
          GCP_PROJECT_ID: gcpConfig.projectId,
          GCP_SERVICE_ACCOUNT_EMAIL: gcpConfig.clientEmail,
          GCP_PRIVATE_KEY: gcpConfig.privateKey,
        };
        break;
      case "azure":
        credentials = {
          AZURE_TENANT_ID: azureConfig.tenantId,
          AZURE_SUBSCRIPTION_ID: azureConfig.subscriptionId,
          AZURE_CLIENT_ID: azureConfig.clientId,
          AZURE_CLIENT_SECRET: azureConfig.clientSecret,
        };
        break;
      case "oracle":
        credentials = {
          ORACLE_TENANCY_OCID: oracleConfig.tenancyOcid,
          ORACLE_USER_OCID: oracleConfig.userOcid,
          ORACLE_COMPARTMENT_OCID: oracleConfig.compartmentOcid,
          ORACLE_FINGERPRINT: oracleConfig.fingerprint,
          ORACLE_PRIVATE_KEY: oracleConfig.privateKey,
        };
        break;
    }
    
    try {
      const res = await fetch("/api/config/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeProvider, credentials }),
      });
      
      if (res.ok) {
        setProviderTestStatus("success");
        setTimeout(() => setProviderTestStatus("idle"), 3000);
      } else {
        setProviderTestStatus("error");
      }
    } catch (error) {
      console.error("Failed to save provider credentials:", error);
      setProviderTestStatus("error");
    } finally {
      setSavingProvider(false);
    }
  };

  // Test provider credentials
  const testProviderCredentials = async () => {
    setTestingProvider(true);
    setProviderTestStatus("idle");
    
    try {
      const res = await fetch("/api/config/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeProvider }),
      });
      
      const data = await res.json();
      setProviderTestStatus(data.success ? "success" : "error");
    } catch (error) {
      console.error("Failed to test provider credentials:", error);
      setProviderTestStatus("error");
    } finally {
      setTestingProvider(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    try {
      const res = await fetch("/api/config/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (res.ok) {
        setKeySaved(true);
        setTimeout(() => setKeySaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save API key:", error);
    } finally {
      setSavingKey(false);
    }
  };

  const scrapeCompanyWebsite = async () => {
    if (!companyUrl.trim()) return;
    setScrapingCompany(true);
    setScrapeSuccess(false);
    try {
      const res = await fetch("/api/settings/company-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: companyUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompanyContext(data.summary);
        setCompanyUpdatedAt(new Date().toISOString());
        setScrapeSuccess(true);
        setTimeout(() => setScrapeSuccess(false), 3000);
      } else {
        alert(data.error || "Failed to scrape website");
      }
    } catch (error) {
      console.error("Failed to scrape company website:", error);
      alert("Failed to scrape website");
    } finally {
      setScrapingCompany(false);
    }
  };

  // Generate agent API key
  const generateAgentKey = async () => {
    setGeneratingAgentKey(true);
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      if (res.ok && data.apiKey) {
        setAgentApiKey(data.apiKey);
        setAgentConnected(false);
        setAgentLastSeen(null);
      } else {
        alert(data.error || "Failed to generate API key");
      }
    } catch (error) {
      console.error("Failed to generate agent key:", error);
      alert("Failed to generate API key");
    } finally {
      setGeneratingAgentKey(false);
    }
  };

  // Revoke agent API key
  const revokeAgentKey = async () => {
    if (!confirm("Revoke the agent API key? The agent will no longer be able to connect.")) return;
    setRevokingAgentKey(true);
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const data = await res.json();
      if (res.ok) {
        setAgentApiKey(null);
        setAgentConnected(false);
        setAgentLastSeen(null);
      } else {
        alert(data.error || "Failed to revoke API key");
      }
    } catch (error) {
      console.error("Failed to revoke agent key:", error);
      alert("Failed to revoke API key");
    } finally {
      setRevokingAgentKey(false);
    }
  };

  // Copy agent key to clipboard
  const copyAgentKey = async () => {
    if (agentApiKey) {
      await navigator.clipboard.writeText(agentApiKey);
      setAgentKeyCopied(true);
      setTimeout(() => setAgentKeyCopied(false), 2000);
    }
  };

  // Scan folder using File System Access API
  const scanFolder = async () => {
    setFolderError(null);
    
    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
      setFolderError("Your browser doesn't support folder selection. Please use Chrome or Edge.");
      return;
    }
    
    try {
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker();
      setScanningFolder(true);
      
      const stats = {
        name: dirHandle.name,
        files: 0,
        folders: 0,
        totalSize: 0,
        fileTypes: {} as Record<string, number>,
        largeFiles: [] as Array<{ name: string; path: string; size: number }>,
      };
      
      // Recursive function to scan directory
      const scanDirectory = async (handle: FileSystemDirectoryHandle, path: string = '') => {
        for await (const entry of handle.values()) {
          const entryPath = path ? `${path}/${entry.name}` : entry.name;
          
          if (entry.kind === 'file') {
            stats.files++;
            try {
              const file = await (entry as FileSystemFileHandle).getFile();
              stats.totalSize += file.size;
              
              // Track file extension
              const ext = entry.name.split('.').pop()?.toLowerCase() || 'unknown';
              stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
              
              // Track large files (>10MB)
              if (file.size > 10 * 1024 * 1024) {
                stats.largeFiles.push({
                  name: entry.name,
                  path: entryPath,
                  size: file.size,
                });
              }
            } catch (e) {
              // Skip files we can't read
            }
          } else if (entry.kind === 'directory') {
            stats.folders++;
            // Limit depth to avoid too deep recursion
            if (path.split('/').length < 5) {
              await scanDirectory(entry as FileSystemDirectoryHandle, entryPath);
            }
          }
        }
      };
      
      await scanDirectory(dirHandle);
      
      // Sort large files by size
      stats.largeFiles.sort((a, b) => b.size - a.size);
      stats.largeFiles = stats.largeFiles.slice(0, 20); // Keep top 20
      
      setFolderStats(stats);
      
      // Store in localStorage (session-based, not server)
      const scanData = {
        rootPath: dirHandle.name,
        fileCount: stats.files,
        folderCount: stats.folders,
        totalSize: stats.totalSize,
        fileTypes: stats.fileTypes,
        largeFiles: stats.largeFiles,
        scannedAt: new Date().toISOString(),
      };
      localStorage.setItem('cloudmigrate_scan', JSON.stringify(scanData));
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setFolderError("Failed to scan folder. Please try again.");
        console.error("Folder scan error:", error);
      }
    } finally {
      setScanningFolder(false);
    }
  };
  
  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-terminal-green font-mono animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar onConfigClick={() => setIsConfigOpen(true)} />
        <div className="w-56 shrink-0" />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="shrink-0">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Settings</h1>
                  <p className="text-xs text-muted-foreground">Manage your preferences</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appearance */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Appearance</h2>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-3 block">Theme</Label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                          mounted && theme === "light"
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-accent border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <Sun className="w-5 h-5" />
                        <span className="text-sm font-medium">Light</span>
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                          mounted && theme === "dark"
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-accent border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <Moon className="w-5 h-5" />
                        <span className="text-sm font-medium">Dark</span>
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                          mounted && theme === "system"
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-accent border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <Monitor className="w-5 h-5" />
                        <span className="text-sm font-medium">System</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Integration */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">AI Integration</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your OpenAI API key to enable the Data Assistant. Your key is stored securely and only used for your organization.
                </p>
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button onClick={saveApiKey} disabled={savingKey || !apiKey.trim()}>
                      {savingKey ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : keySaved ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      platform.openai.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Cloud Providers Configuration */}
              <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Cloud className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-semibold text-foreground">Cloud Providers</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure credentials for your cloud providers to enable CloudFlow workflows.
                </p>
                
                {/* Provider Tabs */}
                <div className="flex gap-2 mb-6 border-b border-border pb-4">
                  {[
                    { id: "aws" as const, label: "AWS", color: "#ff9900" },
                    { id: "gcp" as const, label: "Google Cloud", color: "#4285f4" },
                    { id: "azure" as const, label: "Azure", color: "#0078d4" },
                    { id: "oracle" as const, label: "Oracle", color: "#c74634" },
                  ].map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => { setActiveProvider(provider.id); setProviderTestStatus("idle"); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeProvider === provider.id
                          ? "text-white"
                          : "bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                      style={activeProvider === provider.id ? { backgroundColor: provider.color } : {}}
                    >
                      {provider.label}
                    </button>
                  ))}
                </div>
                
                {/* AWS Config */}
                {activeProvider === "aws" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Access Key ID</Label>
                        <Input
                          type={showSecrets ? "text" : "password"}
                          value={awsConfig.accessKeyId}
                          onChange={(e) => setAwsConfig({ ...awsConfig, accessKeyId: e.target.value })}
                          placeholder="AKIA..."
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Secret Access Key</Label>
                        <Input
                          type={showSecrets ? "text" : "password"}
                          value={awsConfig.secretAccessKey}
                          onChange={(e) => setAwsConfig({ ...awsConfig, secretAccessKey: e.target.value })}
                          placeholder="••••••••"
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Region</Label>
                      <select
                        value={awsConfig.region}
                        onChange={(e) => setAwsConfig({ ...awsConfig, region: e.target.value })}
                        className="w-full h-10 px-3 bg-accent border border-border rounded-md text-foreground"
                      >
                        {["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-north-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "ap-south-1", "sa-east-1", "ca-central-1"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">IAM Role ARN (Optional)</Label>
                        <Input
                          value={awsConfig.roleArn}
                          onChange={(e) => setAwsConfig({ ...awsConfig, roleArn: e.target.value })}
                          placeholder="arn:aws:iam::123456789:role/..."
                          className="font-mono text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">External ID (Optional)</Label>
                        <Input
                          value={awsConfig.externalId}
                          onChange={(e) => setAwsConfig({ ...awsConfig, externalId: e.target.value })}
                          placeholder="external-id"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get credentials from <a href="https://console.aws.amazon.com/iam" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">AWS IAM Console</a>
                    </p>
                  </div>
                )}
                
                {/* GCP Config */}
                {activeProvider === "gcp" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Service Account JSON (paste entire key file)</Label>
                      <textarea
                        placeholder='Paste your entire service account JSON key here...'
                        className="w-full h-32 px-3 py-2 bg-accent border border-border rounded-md text-foreground font-mono text-xs resize-none"
                        onChange={(e) => {
                          try {
                            const json = JSON.parse(e.target.value);
                            if (json.project_id && json.client_email && json.private_key) {
                              setGcpConfig({
                                ...gcpConfig,
                                projectId: json.project_id,
                                clientEmail: json.client_email,
                                privateKey: json.private_key,
                              });
                            }
                          } catch {
                            // Not valid JSON yet, ignore
                          }
                        }}
                      />
                    </div>
                    {gcpConfig.projectId && (
                      <div className="p-3 bg-terminal-green/10 border border-terminal-green/20 rounded-md">
                        <p className="text-sm text-terminal-green flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Parsed successfully
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Project: <span className="text-foreground">{gcpConfig.projectId}</span><br />
                          Service Account: <span className="text-foreground font-mono">{gcpConfig.clientEmail}</span>
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Region</Label>
                      <select
                        value={gcpConfig.region}
                        onChange={(e) => setGcpConfig({ ...gcpConfig, region: e.target.value })}
                        className="w-full h-10 px-3 bg-accent border border-border rounded-md text-foreground"
                      >
                        {["us-central1", "us-east1", "us-west1", "europe-west1", "asia-east1", "asia-southeast1"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create a service account at <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a> and download the JSON key
                    </p>
                  </div>
                )}
                
                {/* Azure Config */}
                {activeProvider === "azure" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Tenant ID (Directory ID)</Label>
                        <Input
                          value={azureConfig.tenantId}
                          onChange={(e) => setAzureConfig({ ...azureConfig, tenantId: e.target.value })}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Subscription ID</Label>
                        <Input
                          value={azureConfig.subscriptionId}
                          onChange={(e) => setAzureConfig({ ...azureConfig, subscriptionId: e.target.value })}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Client ID (Application ID)</Label>
                        <Input
                          value={azureConfig.clientId}
                          onChange={(e) => setAzureConfig({ ...azureConfig, clientId: e.target.value })}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Client Secret</Label>
                        <Input
                          type={showSecrets ? "text" : "password"}
                          value={azureConfig.clientSecret}
                          onChange={(e) => setAzureConfig({ ...azureConfig, clientSecret: e.target.value })}
                          placeholder="••••••••"
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Region</Label>
                      <select
                        value={azureConfig.region}
                        onChange={(e) => setAzureConfig({ ...azureConfig, region: e.target.value })}
                        className="w-full h-10 px-3 bg-accent border border-border rounded-md text-foreground"
                      >
                        {["eastus", "eastus2", "westus", "westus2", "westeurope", "northeurope", "southeastasia"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create an App Registration at <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Azure Portal</a>
                    </p>
                  </div>
                )}
                
                {/* Oracle Config */}
                {activeProvider === "oracle" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Tenancy OCID</Label>
                        <Input
                          value={oracleConfig.tenancyOcid}
                          onChange={(e) => setOracleConfig({ ...oracleConfig, tenancyOcid: e.target.value })}
                          placeholder="ocid1.tenancy.oc1..aaaa..."
                          className="font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">User OCID</Label>
                        <Input
                          value={oracleConfig.userOcid}
                          onChange={(e) => setOracleConfig({ ...oracleConfig, userOcid: e.target.value })}
                          placeholder="ocid1.user.oc1..aaaa..."
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Compartment OCID</Label>
                        <Input
                          value={oracleConfig.compartmentOcid}
                          onChange={(e) => setOracleConfig({ ...oracleConfig, compartmentOcid: e.target.value })}
                          placeholder="ocid1.compartment.oc1..aaaa..."
                          className="font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">API Key Fingerprint</Label>
                        <Input
                          value={oracleConfig.fingerprint}
                          onChange={(e) => setOracleConfig({ ...oracleConfig, fingerprint: e.target.value })}
                          placeholder="xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Private Key (PEM format)</Label>
                      <textarea
                        value={oracleConfig.privateKey}
                        onChange={(e) => setOracleConfig({ ...oracleConfig, privateKey: e.target.value })}
                        placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                        className="w-full h-24 px-3 py-2 bg-accent border border-border rounded-md text-foreground font-mono text-xs resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Region</Label>
                      <select
                        value={oracleConfig.region}
                        onChange={(e) => setOracleConfig({ ...oracleConfig, region: e.target.value })}
                        className="w-full h-10 px-3 bg-accent border border-border rounded-md text-foreground"
                      >
                        {["us-ashburn-1", "us-phoenix-1", "eu-frankfurt-1", "uk-london-1", "ap-tokyo-1", "ap-sydney-1"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generate API keys at <a href="https://cloud.oracle.com/identity/users" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OCI Console</a>
                    </p>
                  </div>
                )}
                
                {/* Test Status */}
                {providerTestStatus !== "idle" && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg mt-4 ${
                    providerTestStatus === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  }`}>
                    {providerTestStatus === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-mono">
                      {providerTestStatus === "success" ? "Connection successful!" : "Connection failed"}
                    </span>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showSecrets ? "Hide" : "Show"} secrets
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={testingProvider} onClick={testProviderCredentials}>
                      {testingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test Connection"}
                    </Button>
                    <Button disabled={savingProvider} onClick={saveProviderCredentials} className="bg-amber-500 hover:bg-amber-600 text-black">
                      {savingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Configuration"}
                    </Button>
                    {providerTestStatus === "success" && (
                      <span className="text-green-500 text-sm flex items-center gap-1">✓ Saved</span>
                    )}
                    {providerTestStatus === "error" && (
                      <span className="text-red-500 text-sm flex items-center gap-1">✗ Failed</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Knowledge */}
              <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-semibold text-foreground">Company Knowledge</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your company website and our AI will learn about your business. 
                  Get personalized migration advice based on your industry, tech stack, and challenges.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Company Website</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="url"
                          value={companyUrl}
                          onChange={(e) => setCompanyUrl(e.target.value)}
                          placeholder="https://yourcompany.com"
                          className="pl-10"
                        />
                      </div>
                      <Button 
                        onClick={scrapeCompanyWebsite} 
                        disabled={scrapingCompany || !companyUrl.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        {scrapingCompany ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : scrapeSuccess ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {companyContext && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">AI Understanding of Your Business</span>
                        {companyUpdatedAt && (
                          <span className="text-xs text-muted-foreground">
                            Updated {new Date(companyUpdatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{companyContext}</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    The AI will use this context to give you personalized migration recommendations.
                  </p>
                </div>
              </div>

              {/* Local Directory Access */}
              <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <HardDrive className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-foreground">Scan Local Files</h2>
                  {folderStats && (
                    <span className="text-xs bg-terminal-green/10 text-terminal-green px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-terminal-green rounded-full" />
                      Scanned
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a folder to scan for migration analysis. The AI will analyze file types, sizes, and structure to provide recommendations.
                </p>
                <div className="space-y-4">
                  <Button 
                    onClick={scanFolder} 
                    disabled={scanningFolder}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    {scanningFolder ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-4 h-4 mr-2" />
                        {folderStats ? "Scan Another Folder" : "Select Folder to Scan"}
                      </>
                    )}
                  </Button>
                  
                  {folderError && (
                    <p className="text-sm text-red-500">{folderError}</p>
                  )}
                  
                  {folderStats && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-terminal-green" />
                        <span className="text-sm font-medium text-foreground">
                          Scanned: {folderStats.name}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Files:</span>
                          <span className="ml-2 text-foreground font-medium">{folderStats.files.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Folders:</span>
                          <span className="ml-2 text-foreground font-medium">{folderStats.folders.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Size:</span>
                          <span className="ml-2 text-foreground font-medium">{formatBytes(folderStats.totalSize)}</span>
                        </div>
                      </div>
                      
                      {Object.keys(folderStats.fileTypes).length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Top file types: </span>
                          <span className="text-xs text-foreground">
                            {Object.entries(folderStats.fileTypes)
                              .sort((a, b) => (b[1] as number) - (a[1] as number))
                              .slice(0, 5)
                              .map(([ext, count]) => `${ext} (${count})`)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      
                      {folderStats.largeFiles.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Large files ({folderStats.largeFiles.length}): </span>
                          <span className="text-xs text-foreground">
                            {folderStats.largeFiles.slice(0, 3).map(f => `${f.name} (${formatBytes(f.size)})`).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {folderStats 
                      ? 'The AI can now help you analyze these files. Try asking: "What files should I migrate first?" or "Show me large files"'
                      : "Click the button above to select a folder. Only metadata is sent to the server - your files stay on your computer."}
                  </p>
                </div>
              </div>

              {/* Account */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">{session.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Name</p>
                      <p className="text-sm text-muted-foreground">{session.user.name || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Organization</p>
                      <p className="text-sm text-muted-foreground">{session.user.tenantName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Role</p>
                      <p className="text-sm text-muted-foreground">{session.user.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-card border border-destructive/50 rounded-lg p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold text-destructive mb-4">Session</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sign out</p>
                    <p className="text-sm text-muted-foreground">
                      End your current session and return to login
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
