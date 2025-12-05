"use client";

import { useState } from "react";
import { Upload, Trash2, RefreshCw, List, HelpCircle, X, Keyboard, Zap, Shield, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUploadStore } from "@/store/upload-store";
import { toast } from "@/hooks/use-toast";
import { type CloudProvider } from "@/components/provider-picker";

// CLI commands per provider
export const providerCLI = {
  aws: {
    list: "aws s3 ls",
    upload: (bucket: string) => `aws s3 cp --recursive ./ s3://${bucket}/`,
    sync: "aws s3 sync",
    name: "AWS CLI",
    storageName: "S3",
  },
  gcp: {
    list: "gsutil ls",
    upload: (bucket: string) => `gsutil cp -r ./* gs://${bucket}/`,
    sync: "gsutil rsync",
    name: "gsutil",
    storageName: "Cloud Storage",
  },
  azure: {
    list: "az storage container list",
    upload: (bucket: string) => `az storage blob upload-batch -d ${bucket} -s ./`,
    sync: "az storage blob sync",
    name: "Azure CLI",
    storageName: "Blob Storage",
  },
  oracle: {
    list: "oci os bucket list",
    upload: (bucket: string) => `oci os object bulk-upload -bn ${bucket} --src-dir ./`,
    sync: "oci os object sync",
    name: "OCI CLI",
    storageName: "Object Storage",
  },
};

interface CLIButtonProps {
  onUpload: () => void;
  onRefresh: () => void;
  activeProvider?: CloudProvider;
}

export function CLIButtons({ onUpload, onRefresh, activeProvider = "aws" }: CLIButtonProps) {
  const { files, clearFiles, isUploading, selectedBucket } = useUploadStore();
  const [showHelp, setShowHelp] = useState(false);
  const cli = providerCLI[activeProvider];

  const pendingFiles = files.filter((f) => f.status === "pending");
  const canUpload = pendingFiles.length > 0 && selectedBucket && !isUploading;

  const handleUpload = () => {
    if (!selectedBucket) {
      toast({
        title: "No bucket selected",
        description: `Please select a destination ${cli.storageName} bucket first.`,
        variant: "destructive",
      });
      return;
    }
    if (pendingFiles.length === 0) {
      toast({
        title: "No files to upload",
        description: "Please add files to upload first.",
        variant: "destructive",
      });
      return;
    }
    onUpload();
  };

  const handleClear = () => {
    if (isUploading) {
      toast({
        title: "Upload in progress",
        description: "Cannot clear files while upload is in progress.",
        variant: "destructive",
      });
      return;
    }
    clearFiles();
    toast({
      title: "Files cleared",
      description: "All files have been removed from the queue.",
    });
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Upload Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="terminal"
              size="cli"
              onClick={handleUpload}
              disabled={!canUpload}
              className="gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              [UPLOAD]
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-mono text-xs">
              Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""} to {cli.storageName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Shortcut: Ctrl+U
            </p>
          </TooltipContent>
        </Tooltip>

        {/* List/Refresh Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="terminal-blue"
              size="cli"
              onClick={onRefresh}
              disabled={isUploading}
              className="gap-2"
            >
              <List className="w-3.5 h-3.5" />
              [LS]
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-mono text-xs">List {cli.storageName} buckets and refresh</p>
            <p className="text-xs text-muted-foreground mt-1">
              Shortcut: Ctrl+L
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Sync/Refresh Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="terminal-amber"
              size="cli"
              onClick={onRefresh}
              disabled={isUploading}
              className="gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              [SYNC]
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-mono text-xs">{cli.sync} - Sync bucket list</p>
            <p className="text-xs text-muted-foreground mt-1">
              Shortcut: Ctrl+R
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Clear Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="terminal-red"
              size="cli"
              onClick={handleClear}
              disabled={files.length === 0 || isUploading}
              className="gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              [CLEAR]
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-mono text-xs">Clear all files from queue</p>
            <p className="text-xs text-muted-foreground mt-1">
              Shortcut: Ctrl+X
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Help Button */}
        <Button 
          variant="ghost" 
          size="cli" 
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowHelp(true)}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          [HELP]
        </Button>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md mx-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-terminal-cyan" />
                <h2 className="text-lg font-semibold">Quick Help</h2>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-accent rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Keyboard Shortcuts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Keyboard className="w-4 h-4 text-terminal-amber" />
                  Keyboard Shortcuts
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm bg-accent/50 rounded-lg p-3">
                  <div className="flex justify-between"><kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">Ctrl+U</kbd><span className="text-muted-foreground">Upload</span></div>
                  <div className="flex justify-between"><kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">Ctrl+L</kbd><span className="text-muted-foreground">List</span></div>
                  <div className="flex justify-between"><kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">Ctrl+R</kbd><span className="text-muted-foreground">Refresh</span></div>
                  <div className="flex justify-between"><kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">Ctrl+X</kbd><span className="text-muted-foreground">Clear</span></div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lightbulb className="w-4 h-4 text-terminal-green" />
                  Quick Tips
                </div>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 mt-0.5 text-terminal-amber shrink-0" />
                    Drag & drop files or folders directly onto the upload area
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 mt-0.5 text-terminal-amber shrink-0" />
                    Select a bucket before uploading files
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 mt-0.5 text-terminal-amber shrink-0" />
                    Use the Browser tab to navigate your cloud storage
                  </li>
                </ul>
              </div>

              {/* Provider Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Shield className="w-4 h-4 text-terminal-cyan" />
                  Cloud Providers
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure your cloud credentials in <span className="text-foreground font-medium">Settings → Cloud Providers</span> to connect AWS, GCP, Azure, or Oracle.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <Button onClick={() => setShowHelp(false)} className="w-full">Got it</Button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
