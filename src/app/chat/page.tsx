"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Send, Bot, User, Loader2, MessageSquare, FileText, AlertCircle, Folder, Cloud, Plus, Trash2, BookOpen, Globe, Link2, CheckCircle2, XCircle } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatBytes } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChartMessage, TableMessage, DocumentMessage, MetricMessage } from "@/components/chat";
import { Chart3DMessage } from "@/components/chat/chart-message-3d";
import type { ChartConfig, TableConfig, DocumentConfig, MetricConfig } from "@/components/chat";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  type?: string;
  results?: any[];
  stats?: { totalFiles: number; totalBytes: string };
  files?: any[];
  folders?: string[];
  bucket?: string;
  sources?: { title: string; score: number }[];
  error?: boolean;
  // Visualization data
  chart?: ChartConfig;
  table?: TableConfig;
  document?: DocumentConfig;
  metric?: MetricConfig;
}

interface Thread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

const EXAMPLE_QUERIES = [
  "Show me a chart of transfers by status",
  "Create a table of my recent uploads",
  "Generate a migration report",
  "What's in my S3 bucket?",
  "Show me all failed transfers",
];

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [showThreads, setShowThreads] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // URL Crawl state
  const [crawlUrl, setCrawlUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<{ success: boolean; message: string; jobId?: string; polling?: boolean } | null>(null);
  
  // Local scan context state
  const [localScanContext, setLocalScanContext] = useState<{ rootPath: string; fileCount: number; totalSize: number } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load threads and context on mount
  useEffect(() => {
    if (session) {
      fetchThreads();
      fetchLocalContext();
    }
  }, [session]);

  // Check for local scan in localStorage
  const fetchLocalContext = () => {
    try {
      const scanData = localStorage.getItem('cloudmigrate_scan');
      if (scanData) {
        const parsed = JSON.parse(scanData);
        setLocalScanContext({
          rootPath: parsed.rootPath,
          fileCount: parsed.fileCount,
          totalSize: parsed.totalSize,
        });
      } else {
        setLocalScanContext(null);
      }
    } catch (e) {
      setLocalScanContext(null);
    }
  };

  // Release/clear local scan context
  const releaseLocalContext = async () => {
    localStorage.removeItem('cloudmigrate_scan');
    setLocalScanContext(null);
    // Also clear from server
    try {
      await fetch('/api/chat/context', { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to clear server context:', e);
    }
  };

  const fetchThreads = async () => {
    try {
      const res = await fetch("/api/chat/threads");
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    }
  };

  const loadThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/chat/threads/${threadId}`);
      const data = await res.json();
      if (data.thread) {
        setCurrentThreadId(threadId);
        const loadedMessages = data.thread.messages.map((m: any) => {
          const parsed = m.data ? JSON.parse(m.data) : {};
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            type: m.type,
            results: parsed.results,
            files: parsed.files,
            folders: parsed.folders,
            stats: parsed.stats,
            bucket: parsed.bucket,
            // Visualization data
            chart: parsed.chart,
            table: parsed.table,
            document: parsed.document,
            metric: parsed.metric,
          };
        });
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Failed to load thread:", error);
    }
  };

  const newChat = () => {
    setCurrentThreadId(null);
    setMessages([]);
  };

  const deleteThread = async (threadId: string) => {
    try {
      await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
      setThreads(threads.filter((t) => t.id !== threadId));
      if (currentThreadId === threadId) {
        newChat();
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
    }
  };

  const deleteAllThreads = async () => {
    if (!confirm("Delete all chat history?")) return;
    try {
      await fetch("/api/chat/threads", { method: "DELETE" });
      setThreads([]);
      newChat();
    } catch (error) {
      console.error("Failed to delete threads:", error);
    }
  };

  // Get tenant ID from session for multi-tenant isolation
  const tenantId = session?.user?.tenantId;

  const pollCrawlStatus = async (jobId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_CRAWL4AI_URL || 'http://localhost:1021';
    try {
      const res = await fetch(`${apiUrl}/api/crawl/status/${jobId}`);
      const data = await res.json();
      
      if (data.status === "completed") {
        const result = data.result;
        setCrawlStatus({
          success: true,
          message: `✓ Done! ${result.pages_crawled} pages, ${result.total_words?.toLocaleString() || 0} words indexed`,
          jobId
        });
        // Clear after 8 seconds
        setTimeout(() => setCrawlStatus(null), 8000);
      } else if (data.status === "failed") {
        setCrawlStatus({
          success: false,
          message: data.error || "Crawl failed",
          jobId
        });
        setTimeout(() => setCrawlStatus(null), 8000);
      } else {
        // Still running, poll again
        setTimeout(() => pollCrawlStatus(jobId), 3000);
      }
    } catch (error) {
      // Polling failed, stop
      setCrawlStatus({
        success: false,
        message: "Lost connection to crawl service",
        jobId
      });
      setTimeout(() => setCrawlStatus(null), 5000);
    }
  };

  const crawlWebsite = async () => {
    if (!crawlUrl.trim() || isCrawling || !tenantId) return;
    
    setIsCrawling(true);
    setCrawlStatus(null);
    
    try {
      // Call the Crawl4AI API with tenant_id for multi-tenant isolation
      const apiUrl = process.env.NEXT_PUBLIC_CRAWL4AI_URL || 'http://localhost:1021';
      const res = await fetch(`${apiUrl}/api/crawl/smart?url=${encodeURIComponent(crawlUrl)}&max_depth=2&max_concurrent=5&tenant_id=${tenantId}`, {
        method: "POST",
      });
      
      const data = await res.json();
      
      if (data.success && data.job_id) {
        // Job started successfully
        setCrawlStatus({
          success: true,
          message: "Crawl started! Feel free to chat while we index...",
          jobId: data.job_id,
          polling: true
        });
        setCrawlUrl("");
        setIsCrawling(false);
        
        // Start polling for completion
        setTimeout(() => pollCrawlStatus(data.job_id), 2000);
      } else if (data.rate_limit) {
        // Rate limited - show helpful message
        const limits = data.rate_limit;
        setCrawlStatus({
          success: false,
          message: `Rate limited: ${limits.active_crawls}/${limits.limits?.concurrent} active, ${limits.hourly_crawls}/${limits.limits?.hourly} hourly`
        });
        setIsCrawling(false);
        setTimeout(() => setCrawlStatus(null), 8000);
      } else {
        setCrawlStatus({
          success: false,
          message: data.error || "Failed to start crawl"
        });
        setIsCrawling(false);
        setTimeout(() => setCrawlStatus(null), 5000);
      }
    } catch (error) {
      setCrawlStatus({
        success: false,
        message: "Failed to connect to crawl service"
      });
      setIsCrawling(false);
      setTimeout(() => setCrawlStatus(null), 5000);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add assistant message with thinking indicator
    const assistantMessage: Message = { role: "assistant", content: "Thinking..." };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Get local scan data from localStorage (session-based)
      let localScan = null;
      try {
        const scanData = localStorage.getItem('cloudmigrate_scan');
        if (scanData) localScan = JSON.parse(scanData);
      } catch (e) {}
      
      // Check if this is a visualization request - use non-streaming endpoint
      const visualizationKeywords = /\b(chart|graph|plot|table|report|visuali|pie|bar|line|metric)\b/i;
      const isVisualizationRequest = visualizationKeywords.test(text);
      
      if (isVisualizationRequest) {
        // Use non-streaming endpoint for visualizations
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, threadId: currentThreadId, localScan }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { 
              role: "assistant", 
              content: data.error || "Something went wrong", 
              error: true 
            };
            return updated;
          });
          setIsLoading(false);
          return;
        }
        
        // Update with visualization response
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: data.message || "",
            type: data.type,
            chart: data.chart,
            table: data.table,
            document: data.document,
            metric: data.metric,
          };
          return updated;
        });
        
        if (data.threadId && !currentThreadId) {
          setCurrentThreadId(data.threadId);
          fetchThreads();
        }
        
        setIsLoading(false);
        return;
      }
      
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, threadId: currentThreadId, localScan }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { 
            role: "assistant", 
            content: data.error || "Something went wrong", 
            error: true 
          };
          return updated;
        });
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "thread" && data.threadId && !currentThreadId) {
                setCurrentThreadId(data.threadId);
                fetchThreads();
              }
              
              if (data.type === "content") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") {
                    // Replace "Thinking..." with first content, then append
                    const newContent = last.content === "Thinking..." 
                      ? data.content 
                      : last.content + data.content;
                    updated[updated.length - 1] = {
                      ...last,
                      content: newContent,
                    };
                  }
                  return updated;
                });
              }
              
              if (data.type === "sources") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      sources: data.sources,
                    };
                  }
                  return updated;
                });
              }

              if (data.type === "error") {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { 
                    role: "assistant", 
                    content: data.error, 
                    error: true 
                  };
                  return updated;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { 
          role: "assistant", 
          content: "Failed to connect to AI service", 
          error: true 
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
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
      <div className="h-screen bg-background flex overflow-hidden">
        <Sidebar onConfigClick={() => setIsConfigOpen(true)} />
        <div className="w-56 shrink-0" />

        {/* Thread Sidebar */}
        <div className="w-72 bg-zinc-950 flex flex-col h-screen">
          <div className="p-4 flex items-center justify-between">
            <button
              onClick={newChat}
              className="flex items-center gap-2 px-3 py-2 w-full bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm text-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
              New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {threads.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                {threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`group flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-colors ${
                      currentThreadId === thread.id 
                        ? "bg-zinc-800" 
                        : "hover:bg-zinc-900"
                    }`}
                    onClick={() => loadThread(thread.id)}
                  >
                    <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-foreground/80 truncate">{thread.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(thread.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-zinc-900/50">

          <main className="flex-1 overflow-hidden flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                    <Bot className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-medium text-foreground mb-2">
                    Cloud Migration Assistant
                  </h2>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    Ask about AWS migration strategies, your files, transfers, or cloud best practices.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                    {EXAMPLE_QUERIES.map((query) => (
                      <button
                        key={query}
                        onClick={() => sendMessage(query)}
                        className="px-4 py-3 text-sm text-left bg-zinc-800/50 hover:bg-zinc-800 text-foreground/80 rounded-xl transition-colors"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`group py-6 ${msg.role === "user" ? "bg-transparent" : "bg-muted/30"}`}
                  >
                    <div className="max-w-3xl mx-auto px-4 flex gap-4">
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === "user" 
                          ? "bg-primary/20" 
                          : "bg-emerald-500/20"
                      }`}>
                        {msg.role === "user" ? (
                          <User className="w-4 h-4 text-primary" />
                        ) : (
                          <Bot className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {msg.error && (
                          <div className="flex items-center gap-2 mb-2 text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">Error</span>
                          </div>
                        )}
                        
                        {msg.content === "Thinking..." ? (
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        ) : msg.role === "user" ? (
                          <p className="text-foreground">{msg.content}</p>
                        ) : (
                          <div className="space-y-4">
                            {/* Visualization: Chart (3D) */}
                            {msg.chart && (
                              <Chart3DMessage config={msg.chart} />
                            )}

                            {/* Visualization: Table */}
                            {msg.table && (
                              <TableMessage config={msg.table} />
                            )}

                            {/* Visualization: Document */}
                            {msg.document && (
                              <DocumentMessage config={msg.document} />
                            )}

                            {/* Visualization: Metric */}
                            {msg.metric && (
                              <MetricMessage config={msg.metric} />
                            )}

                            {/* Text content (markdown) */}
                            {msg.content && (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ children }) => <h1 className="text-xl font-semibold mt-6 mb-3 text-foreground">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-lg font-semibold mt-5 mb-2 text-foreground">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-base font-medium mt-4 mb-2 text-foreground">{children}</h3>,
                                  p: ({ children }) => <p className="text-foreground/90 leading-7 mb-4">{children}</p>,
                                  ul: ({ children }) => <ul className="space-y-2 my-4">{children}</ul>,
                                  ol: ({ children }) => <ol className="space-y-2 my-4 list-decimal list-inside">{children}</ol>,
                                  li: ({ children }) => (
                                    <li className="text-foreground/90 leading-7 flex gap-2">
                                      <span className="text-emerald-500 mt-2">•</span>
                                      <span>{children}</span>
                                    </li>
                                  ),
                                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                  code: ({ children, className }) => {
                                    const isBlock = className?.includes("language-");
                                    return isBlock ? (
                                      <code className="block bg-zinc-900 text-zinc-100 p-4 rounded-lg text-sm overflow-x-auto my-4 font-mono">{children}</code>
                                    ) : (
                                      <code className="bg-zinc-800 text-emerald-400 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                                    );
                                  },
                                  pre: ({ children }) => <pre className="bg-zinc-900 rounded-lg overflow-x-auto my-4">{children}</pre>,
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto my-6 rounded-lg">
                                      <table className="min-w-full">{children}</table>
                                    </div>
                                  ),
                                  thead: ({ children }) => <thead className="bg-zinc-800/50">{children}</thead>,
                                  tbody: ({ children }) => <tbody className="divide-y divide-zinc-800">{children}</tbody>,
                                  tr: ({ children }) => <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>,
                                  th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{children}</th>,
                                  td: ({ children }) => <td className="px-4 py-3 text-sm text-foreground/80">{children}</td>,
                                  hr: () => <hr className="my-6 border-zinc-800" />,
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-2 border-emerald-500/50 pl-4 my-4 text-foreground/70 italic">{children}</blockquote>
                                  ),
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            )}
                            
                            {/* Sources */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-zinc-800/50">
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                                <div className="flex flex-wrap gap-2">
                                  {msg.sources.map((source, idx) => (
                                    <span 
                                      key={idx} 
                                      className="text-xs text-muted-foreground bg-zinc-800/50 px-2.5 py-1 rounded-full"
                                    >
                                      {source.title}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* URL Crawl & Input */}
            <div className="p-4 bg-background/80 backdrop-blur-sm border-t border-zinc-800/50">
              <div className="max-w-3xl mx-auto space-y-3">
                {/* URL Crawl Section */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Add knowledge:</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={crawlUrl}
                        onChange={(e) => setCrawlUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            crawlWebsite();
                          }
                        }}
                        placeholder="Paste URL to crawl (AWS docs, guides, etc.)"
                        className="pl-9 py-2 h-9 bg-zinc-900/30 border-zinc-800/50 focus:border-blue-500/50 rounded-lg text-sm placeholder:text-muted-foreground/40"
                        disabled={isCrawling}
                      />
                    </div>
                    <Button
                      onClick={crawlWebsite}
                      disabled={isCrawling || !crawlUrl.trim()}
                      size="sm"
                      variant="outline"
                      className="h-9 px-3 border-zinc-700 hover:bg-zinc-800 hover:border-blue-500/50 text-xs"
                    >
                      {isCrawling ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Crawling...
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5 mr-1.5" />
                          Crawl
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Local Scan Context Indicator */}
                {localScanContext && (
                  <div className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Local context: {localScanContext.rootPath} ({localScanContext.fileCount.toLocaleString()} files, {formatBytes(localScanContext.totalSize)})
                      </span>
                    </div>
                    <button
                      onClick={releaseLocalContext}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                      Release
                    </button>
                  </div>
                )}

                {/* Crawl Status */}
                {crawlStatus && (
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                    crawlStatus.success 
                      ? crawlStatus.polling 
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {crawlStatus.success ? (
                      crawlStatus.polling ? (
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      )
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{crawlStatus.message}</span>
                  </div>
                )}

                {/* Chat Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                >
                  <div className="relative flex items-center">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about cloud migration, AWS services, or your crawled docs..."
                      className="flex-1 pr-12 py-6 bg-zinc-900/50 border-zinc-800 focus:border-emerald-500/50 rounded-xl text-base placeholder:text-muted-foreground/50"
                      disabled={isLoading}
                    />
                    <Button 
                      type="submit" 
                      disabled={isLoading || !input.trim()}
                      size="icon"
                      className="absolute right-2 h-8 w-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </main>
        </div>

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
