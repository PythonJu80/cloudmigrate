"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "error" | "warning" | "command";
  message: string;
}

interface TerminalLogProps {
  logs: LogEntry[];
  className?: string;
}

export function TerminalLog({ logs, className }: TerminalLogProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "text-terminal-green";
      case "error":
        return "text-terminal-red";
      case "warning":
        return "text-terminal-amber";
      case "command":
        return "text-terminal-cyan";
      default:
        return "text-muted-foreground";
    }
  };

  const getTypePrefix = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "[OK]";
      case "error":
        return "[ERR]";
      case "warning":
        return "[WARN]";
      case "command":
        return "$";
      default:
        return "[INFO]";
    }
  };

  return (
    <div
      className={cn(
        "bg-background border border-border rounded-lg overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-card border-b border-border hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-terminal-green" />
          <span className="text-sm font-mono text-foreground">Terminal Output</span>
          <span className="text-xs text-muted-foreground">({logs.length} entries)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Log content */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="h-[200px] overflow-y-auto p-4 font-mono text-xs space-y-1"
        >
          {logs.length === 0 ? (
            <div className="text-muted-foreground flex items-center gap-2">
              <span className="text-terminal-green">$</span>
              <span>Waiting for commands...</span>
              <span className="animate-blink">_</span>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">
                  [{formatTime(log.timestamp)}]
                </span>
                <span className={cn("shrink-0", getTypeColor(log.type))}>
                  {getTypePrefix(log.type)}
                </span>
                <span className="text-foreground break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Helper to create log entries
export function createLogEntry(
  type: LogEntry["type"],
  message: string
): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    type,
    message,
  };
}
