"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Folder,
  File,
  Download,
  Trash2,
  RefreshCw,
  ChevronRight,
  Home,
  Loader2,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  ArrowLeft,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { formatBytes, formatDate } from "@/lib/utils";

interface S3Object {
  key: string;
  size: number;
  lastModified: string;
  isFolder: boolean;
}

interface Bucket {
  name: string;
}

export default function BrowserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>("");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBuckets, setIsLoadingBuckets] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch buckets on mount
  useEffect(() => {
    if (session) {
      fetchBuckets();
    }
  }, [session]);

  // Fetch objects when bucket or path changes
  useEffect(() => {
    if (selectedBucket) {
      fetchObjects();
    }
  }, [selectedBucket, currentPath]);

  const fetchBuckets = async () => {
    setIsLoadingBuckets(true);
    try {
      const res = await fetch("/api/buckets");
      if (!res.ok) throw new Error("Failed to fetch buckets");
      const data = await res.json();
      setBuckets(data.buckets || []);
      if (data.buckets?.length > 0 && !selectedBucket) {
        setSelectedBucket(data.buckets[0].name);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch buckets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBuckets(false);
    }
  };

  const fetchObjects = async () => {
    if (!selectedBucket) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/browser?bucket=${selectedBucket}&prefix=${encodeURIComponent(currentPath)}`
      );
      if (!res.ok) throw new Error("Failed to fetch objects");
      const data = await res.json();
      setObjects(data.objects || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to list objects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folderKey: string) => {
    setCurrentPath(folderKey);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length > 0 ? parts.join("/") + "/" : "");
  };

  const handleDownload = async (key: string) => {
    try {
      const res = await fetch(
        `/api/browser/download?bucket=${selectedBucket}&key=${encodeURIComponent(key)}`
      );
      if (!res.ok) throw new Error("Failed to get download URL");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete "${key}"?`)) return;

    try {
      const res = await fetch(
        `/api/browser?bucket=${selectedBucket}&key=${encodeURIComponent(key)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete object");
      toast({
        title: "Deleted",
        description: `Successfully deleted ${key}`,
      });
      fetchObjects();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete object",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (key: string) => {
    const ext = key.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
      return <FileImage className="w-5 h-5 text-purple-400" />;
    }
    if (["mp4", "mov", "avi", "mkv"].includes(ext || "")) {
      return <FileVideo className="w-5 h-5 text-pink-400" />;
    }
    if (["mp3", "wav", "flac", "aac"].includes(ext || "")) {
      return <FileAudio className="w-5 h-5 text-green-400" />;
    }
    if (["zip", "tar", "gz", "rar", "7z"].includes(ext || "")) {
      return <FileArchive className="w-5 h-5 text-amber-400" />;
    }
    if (["txt", "md", "json", "xml", "csv"].includes(ext || "")) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

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
          {/* Header */}
          <header className="shrink-0">
            <div className="max-w-5xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-foreground">File Browser</h1>
                  <p className="text-xs text-muted-foreground">Browse your S3 buckets</p>
                </div>

                <div className="flex items-center gap-3">
                  <Select
                    value={selectedBucket}
                    onValueChange={(value) => {
                      setSelectedBucket(value);
                      setCurrentPath("");
                    }}
                    disabled={isLoadingBuckets}
                  >
                    <SelectTrigger className="w-64 bg-accent border-border">
                      <SelectValue placeholder="Select bucket..." />
                    </SelectTrigger>
                    <SelectContent>
                      {buckets.map((bucket) => (
                        <SelectItem key={bucket.name} value={bucket.name}>
                          s3://{bucket.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchObjects}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Breadcrumb */}
          <div className="px-6 py-3 border-b border-border bg-card/30">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setCurrentPath("")}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{selectedBucket || "root"}</span>
              </button>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <button
                    onClick={() =>
                      setCurrentPath(breadcrumbs.slice(0, index + 1).join("/") + "/")
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <main className="flex-1 overflow-auto p-6">
            {currentPath && (
              <button
                onClick={navigateUp}
                className="flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-terminal-green animate-spin" />
              </div>
            ) : objects.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">This folder is empty</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Name
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Size
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Modified
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {objects.map((obj) => (
                      <tr
                        key={obj.key}
                        className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {obj.isFolder ? (
                            <button
                              onClick={() => navigateToFolder(obj.key)}
                              className="flex items-center gap-3 text-foreground hover:text-terminal-green transition-colors"
                            >
                              <Folder className="w-5 h-5 text-terminal-amber" />
                              <span>{obj.key.replace(currentPath, "").replace("/", "")}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 text-foreground">
                              {getFileIcon(obj.key)}
                              <span>{obj.key.replace(currentPath, "")}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {obj.isFolder ? "-" : formatBytes(obj.size)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {obj.lastModified ? formatDate(new Date(obj.lastModified)) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!obj.isFolder && (
                            <div className="flex items-center justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(obj.key)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(obj.key)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
