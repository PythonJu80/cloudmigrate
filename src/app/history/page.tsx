"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Download,
  Trash2,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { formatBytes, formatDate } from "@/lib/utils";

interface Transfer {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: string;
  s3Key: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  bucket: {
    name: string;
  };
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchTransfers();
    }
  }, [session, statusFilter, currentPage]);

  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const res = await fetch(`/api/history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch transfers");
      
      const data = await res.json();
      setTransfers(data.transfers || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch transfer history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchTransfers();
  };

  const handleDelete = async (transferId: string) => {
    if (!confirm("Are you sure you want to delete this transfer record?")) return;

    try {
      const res = await fetch(`/api/history?id=${transferId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete transfer");
      
      toast({
        title: "Deleted",
        description: "Transfer record deleted successfully",
      });
      
      fetchTransfers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete transfer record",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4 text-terminal-green" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "UPLOADING":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "PENDING":
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      COMPLETED: "bg-terminal-green/10 text-terminal-green",
      FAILED: "bg-red-500/10 text-red-500",
      UPLOADING: "bg-blue-500/10 text-blue-500",
      PENDING: "bg-amber-500/10 text-amber-500",
      CANCELLED: "bg-muted/10 text-muted-foreground",
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-mono ${styles[status] || styles.PENDING}`}>
        {status}
      </span>
    );
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
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <History className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">Transfer History</h1>
                    <p className="text-xs text-muted-foreground">{totalCount} total transfers</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTransfers}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </header>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-border bg-card/30">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-accent border-border"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-40 bg-accent border-border">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="UPLOADING">Uploading</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>

          {/* Content */}
          <main className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-terminal-green animate-spin" />
              </div>
            ) : transfers.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">No transfers found</p>
                <p className="text-sm text-muted-foreground">
                  {statusFilter !== "all" ? "Try changing the filter" : "Upload some files to see them here"}
                </p>
              </div>
            ) : (
              <>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">File Name</th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Bucket</th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Size</th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map((transfer) => (
                        <tr
                          key={transfer.id}
                          className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(transfer.status)}
                              {getStatusBadge(transfer.status)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-foreground truncate max-w-[300px]">
                                {transfer.fileName}
                              </p>
                              {transfer.error && (
                                <p className="text-xs text-red-400 truncate max-w-[300px]">
                                  {transfer.error}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground font-mono">
                              {transfer.bucket?.name || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground">
                              {formatBytes(Number(transfer.fileSize))}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-muted-foreground">
                              <p>{formatDate(new Date(transfer.createdAt))}</p>
                              {transfer.completedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Completed: {formatDate(new Date(transfer.completedAt))}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {transfer.status === "COMPLETED" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        window.open(`/api/browser/download?bucket=${transfer.bucket?.name}&key=${encodeURIComponent(transfer.s3Key)}`, "_blank");
                                      }}
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Download from S3</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(transfer.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete record</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({totalCount} total)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
