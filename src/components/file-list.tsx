"use client";

import { File, Folder, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import { useUploadStore, FileToUpload } from "@/store/upload-store";
import { TerminalProgress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function FileStatusIcon({ status }: { status: FileToUpload["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-terminal-green" />;
    case "failed":
      return <AlertCircle className="w-4 h-4 text-terminal-red" />;
    case "uploading":
      return <Loader2 className="w-4 h-4 text-terminal-amber animate-spin" />;
    default:
      return null;
  }
}

function FileIcon({ path }: { path: string }) {
  const isDirectory = path.includes("/");
  return isDirectory ? (
    <Folder className="w-4 h-4 text-terminal-amber" />
  ) : (
    <File className="w-4 h-4 text-terminal-blue" />
  );
}

export function FileList() {
  const { files, removeFile, isUploading } = useUploadStore();

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-mono text-sm">No files selected</p>
        <p className="text-xs mt-1">Drop files above or use the buttons to select</p>
      </div>
    );
  }

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const completedCount = files.filter((f) => f.status === "completed").length;
  const failedCount = files.filter((f) => f.status === "failed").length;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-accent/50 rounded-lg border border-border">
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">{formatBytes(totalSize)}</span>
            {completedCount > 0 && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-terminal-green">{completedCount} completed</span>
              </>
            )}
            {failedCount > 0 && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-terminal-red">{failedCount} failed</span>
              </>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                "bg-card/50 border-border",
                file.status === "completed" && "border-terminal-green/30 bg-terminal-green/5",
                file.status === "failed" && "border-terminal-red/30 bg-terminal-red/5"
              )}
            >
              <FileIcon path={file.path} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm font-medium text-foreground truncate cursor-help">
                        {file.name}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs">{file.path}</p>
                    </TooltipContent>
                  </Tooltip>
                  <FileStatusIcon status={file.status} />
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatBytes(file.size)}
                  </span>
                  {file.status === "uploading" && (
                    <div className="flex-1 max-w-[200px]">
                      <TerminalProgress value={file.progress} />
                    </div>
                  )}
                  {file.error && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-terminal-red truncate max-w-[150px] cursor-help">
                          {file.error}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{file.error}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeFile(file.id)}
                disabled={isUploading && file.status === "uploading"}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  isUploading && file.status === "uploading" && "opacity-50 cursor-not-allowed"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
