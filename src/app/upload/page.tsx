"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FileDropzone } from "@/components/file-dropzone";
import { FileList } from "@/components/file-list";
import { CLIButtons } from "@/components/cli-buttons";
import { TerminalLog, LogEntry, createLogEntry } from "@/components/terminal-log";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { useUploadStore } from "@/store/upload-store";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatBytes } from "@/lib/utils";

interface Bucket {
  name: string;
  creationDate?: string;
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingBuckets, setIsLoadingBuckets] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const {
    files,
    selectedBucket,
    setSelectedBucket,
    isUploading,
    setIsUploading,
    updateFileProgress,
    updateFileStatus,
  } = useUploadStore();

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, createLogEntry(type, message)]);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchBuckets();
    }
  }, [session]);

  const fetchBuckets = async () => {
    setIsLoadingBuckets(true);
    addLog("command", "aws s3 ls");

    try {
      const res = await fetch("/api/buckets");
      if (!res.ok) throw new Error("Failed to fetch buckets");

      const data = await res.json();
      setBuckets(data.buckets || []);
      addLog("success", `Found ${data.buckets?.length || 0} S3 buckets`);

      if (!selectedBucket && data.buckets?.length > 0) {
        setSelectedBucket(data.buckets[0].name);
      }
    } catch (error) {
      addLog("error", "Failed to list buckets. Check AWS credentials.");
      toast({
        title: "Error",
        description: "Failed to fetch S3 buckets. Please check your AWS configuration.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBuckets(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedBucket) {
      toast({
        title: "No bucket selected",
        description: "Please select a destination bucket first.",
        variant: "destructive",
      });
      return;
    }

    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    addLog("command", `aws s3 cp --recursive ./ s3://${selectedBucket}/`);
    addLog("info", `Starting upload of ${pendingFiles.length} files...`);

    for (const file of pendingFiles) {
      try {
        updateFileStatus(file.id, "uploading");
        addLog("info", `Uploading: ${file.name} (${formatBytes(file.size)})`);

        const presignRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            bucketName: selectedBucket,
          }),
        });

        if (!presignRes.ok) {
          const error = await presignRes.json();
          throw new Error(error.error || "Failed to get upload URL");
        }

        const { presignedUrl, transferId } = await presignRes.json();

        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              updateFileProgress(file.id, progress);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Upload failed")));

          xhr.open("PUT", presignedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file.file);
        });

        await fetch("/api/upload", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transferId,
            status: "COMPLETED",
            progress: 100,
          }),
        });

        updateFileStatus(file.id, "completed");
        addLog("success", `Completed: ${file.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        updateFileStatus(file.id, "failed", errorMessage);
        addLog("error", `Failed: ${file.name} - ${errorMessage}`);
      }
    }

    setIsUploading(false);

    const completed = files.filter((f) => f.status === "completed").length;
    const failed = files.filter((f) => f.status === "failed").length;

    addLog(
      failed > 0 ? "warning" : "success",
      `Upload complete: ${completed} succeeded, ${failed} failed`
    );

    toast({
      title: "Upload Complete",
      description: `${completed} files uploaded successfully${failed > 0 ? `, ${failed} failed` : ""}`,
      variant: failed > 0 ? "destructive" : "default",
    });
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
            <div className="max-w-5xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Upload Files</h1>
                  <p className="text-xs text-muted-foreground">Upload files and folders to S3</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Bucket Selector */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-mono text-muted-foreground mb-2">
                      DESTINATION BUCKET
                    </label>
                    <Select
                      value={selectedBucket || ""}
                      onValueChange={setSelectedBucket}
                      disabled={isLoadingBuckets}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue placeholder="Select S3 bucket..." />
                      </SelectTrigger>
                      <SelectContent>
                        {buckets.map((bucket) => (
                          <SelectItem key={bucket.name} value={bucket.name}>
                            s3://{bucket.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <CLIButtons onUpload={handleUpload} onRefresh={fetchBuckets} />
                <FileDropzone />
                <FileList />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-2">
                    TRANSFER LOG
                  </label>
                  <TerminalLog logs={logs} />
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="text-xs font-mono text-muted-foreground mb-3">SESSION STATS</h3>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Files queued:</span>
                      <span className="text-terminal-green">{files.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total size:</span>
                      <span className="text-terminal-green">
                        {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="text-terminal-green">
                        {files.filter((f) => f.status === "completed").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="text-terminal-red">
                        {files.filter((f) => f.status === "failed").length}
                      </span>
                    </div>
                  </div>
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
