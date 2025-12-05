"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FolderOpen, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadStore } from "@/store/upload-store";

export function FileDropzone() {
  const { addFiles, isUploading } = useUploadStore();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      addFiles(acceptedFiles);
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: false,
    noKeyboard: false,
    disabled: isUploading,
  });

  const openDirectoryPicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        addFiles(files);
      }
    };
    input.click();
  }, [addFiles]);

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer",
          "bg-card/50 border-border hover:border-terminal-green/50 hover:bg-card/80",
          isDragActive && "border-terminal-green bg-terminal-green/5",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div
            className={cn(
              "p-4 rounded-full bg-accent transition-colors",
              isDragActive && "bg-terminal-green/20"
            )}
          >
            <Upload
              className={cn(
                "w-8 h-8 text-muted-foreground transition-colors",
                isDragActive && "text-terminal-green"
              )}
            />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              {isDragActive ? "Drop files here..." : "Drag & drop files here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse your files
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={open}
          disabled={isUploading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
            "bg-accent border border-border text-foreground",
            "hover:bg-muted hover:border-border transition-colors",
            "font-mono text-sm",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <File className="w-4 h-4" />
          <span>[SELECT FILES]</span>
        </button>
        <button
          onClick={openDirectoryPicker}
          disabled={isUploading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
            "bg-accent border border-border text-foreground",
            "hover:bg-muted hover:border-border transition-colors",
            "font-mono text-sm",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          <span>[SELECT FOLDER]</span>
        </button>
      </div>
    </div>
  );
}
