"use client";

import { useState, useEffect } from "react";
import { X, Key, Eye, EyeOff, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AWSConfig {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  awsRoleArn: string;
  awsExternalId: string;
}

const AWS_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
];

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const [config, setConfig] = useState<AWSConfig>({
    awsAccessKeyId: "",
    awsSecretAccessKey: "",
    awsRegion: "us-east-1",
    awsRoleArn: "",
    awsExternalId: "",
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");

  // Load existing config on mount
  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setConfig({
          awsAccessKeyId: data.awsAccessKeyId || "",
          awsSecretAccessKey: data.awsSecretAccessKey || "",
          awsRegion: data.awsRegion || "us-east-1",
          awsRoleArn: data.awsRoleArn || "",
          awsExternalId: data.awsExternalId || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        throw new Error("Failed to save configuration");
      }

      toast({
        title: "Configuration saved",
        description: "Your AWS credentials have been updated.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestStatus("idle");
    try {
      const res = await fetch("/api/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setTestStatus("success");
        toast({
          title: "Connection successful",
          description: "AWS credentials are valid and working.",
        });
      } else {
        setTestStatus("error");
        const data = await res.json();
        toast({
          title: "Connection failed",
          description: data.error || "Could not connect to AWS.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestStatus("error");
      toast({
        title: "Connection failed",
        description: "Could not test AWS connection.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-terminal-amber/10 rounded-lg">
              <Key className="w-5 h-5 text-terminal-amber" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AWS Configuration</h2>
              <p className="text-xs text-muted-foreground">Configure your AWS credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Access Key */}
          <div className="space-y-2">
            <Label htmlFor="accessKey" className="text-foreground">
              AWS Access Key ID
            </Label>
            <Input
              id="accessKey"
              type={showSecrets ? "text" : "password"}
              placeholder="AKIA..."
              value={config.awsAccessKeyId}
              onChange={(e) =>
                setConfig({ ...config, awsAccessKeyId: e.target.value })
              }
              className="bg-accent border-border font-mono"
            />
          </div>

          {/* Secret Key */}
          <div className="space-y-2">
            <Label htmlFor="secretKey" className="text-foreground">
              AWS Secret Access Key
            </Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecrets ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={config.awsSecretAccessKey}
                onChange={(e) =>
                  setConfig({ ...config, awsSecretAccessKey: e.target.value })
                }
                className="bg-accent border-border font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showSecrets ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="region" className="text-foreground">
              AWS Region
            </Label>
            <select
              id="region"
              value={config.awsRegion}
              onChange={(e) =>
                setConfig({ ...config, awsRegion: e.target.value })
              }
              className="w-full h-10 px-3 bg-accent border border-border rounded-md text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-terminal-green"
            >
              {AWS_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-card text-xs text-muted-foreground">
                Cross-Account Access (Optional)
              </span>
            </div>
          </div>

          {/* Role ARN */}
          <div className="space-y-2">
            <Label htmlFor="roleArn" className="text-foreground">
              IAM Role ARN
            </Label>
            <Input
              id="roleArn"
              type="text"
              placeholder="arn:aws:iam::123456789012:role/CloudMigrateRole"
              value={config.awsRoleArn}
              onChange={(e) =>
                setConfig({ ...config, awsRoleArn: e.target.value })
              }
              className="bg-accent border-border font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              For accessing customer AWS accounts via AssumeRole
            </p>
          </div>

          {/* External ID */}
          <div className="space-y-2">
            <Label htmlFor="externalId" className="text-foreground">
              External ID
            </Label>
            <Input
              id="externalId"
              type="text"
              placeholder="cloudmigrate-external-id"
              value={config.awsExternalId}
              onChange={(e) =>
                setConfig({ ...config, awsExternalId: e.target.value })
              }
              className="bg-accent border-border font-mono"
            />
          </div>

          {/* Test Status */}
          {testStatus !== "idle" && (
            <div
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                testStatus === "success"
                  ? "bg-terminal-green/10 text-terminal-green"
                  : "bg-terminal-red/10 text-terminal-red"
              )}
            >
              {testStatus === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-mono">
                {testStatus === "success"
                  ? "Connection successful!"
                  : "Connection failed"}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={isTesting || !config.awsAccessKeyId}
            className="gap-2"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Key className="w-4 h-4" />
            )}
            Test Connection
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-terminal-green hover:bg-terminal-green/90 text-black gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Config
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
