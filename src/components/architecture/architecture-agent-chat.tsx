"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Bot, 
  Send, 
  Trash2, 
  Loader2, 
  Sparkles,
  Search,
  DollarSign,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
  Boxes
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ArchitectureAgentChatProps {
  onArchitectureGenerated?: (archId: string) => void;
  className?: string;
}

const STORAGE_KEY = "architecture-agent-chat";

const AGENT_MODES = [
  { id: "designer", label: "Architecture Designer", icon: Sparkles, description: "Design new architectures" },
  { id: "reviewer", label: "Architecture Reviewer", icon: Search, description: "Review & improve existing" },
  { id: "costOptimizer", label: "Cost Optimizer", icon: DollarSign, description: "Optimize for cost" },
];

const MODELS = [
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

export function ArchitectureAgentChat({ onArchitectureGenerated, className }: ArchitectureAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState("gpt-4.1");
  const [agentMode, setAgentMode] = useState("designer");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setMessages(data.messages || []);
        setModel(data.model || "gpt-4.1");
        setAgentMode(data.agentMode || "designer");
      } catch (e) {
        // Invalid data, ignore
      }
    }
  }, []);

  // Save to localStorage when messages change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages,
      model,
      agentMode,
    }));
  }, [messages, model, agentMode]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/architecture/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          model,
          mode: agentMode,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to get response");
      }

      const data = await res.json();
      
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Generate architecture from chat history - saves to DB and returns archId
  const generateArchitecture = async () => {
    if (messages.length === 0 || isGenerating) return;

    setIsGenerating(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/architecture/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatHistory }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate architecture");
      }

      const data = await res.json();

      // Clear chat after successful generation
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);

      // Notify parent with the new architecture ID
      if (onArchitectureGenerated && data.archId) {
        onArchitectureGenerated(data.archId);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error generating architecture: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentMode = AGENT_MODES.find(m => m.id === agentMode) || AGENT_MODES[0];
  const ModeIcon = currentMode.icon;

  return (
    <div className={cn(
      "flex flex-col bg-card border border-border rounded-lg shadow-xl",
      isExpanded ? "fixed inset-4 z-50" : "w-full h-[500px]",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-purple-500/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/20 rounded">
            <Boxes className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Architecture Agent</p>
            <p className="text-xs text-muted-foreground">{currentMode.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowSettings(!showSettings)}
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", showSettings && "rotate-180")} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-border/50 bg-accent/30 space-y-3">
          {/* Mode Selection */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">AGENT MODE</p>
            <div className="flex gap-2">
              {AGENT_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setAgentMode(mode.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors",
                      agentMode === mode.id
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                        : "bg-accent/50 hover:bg-accent text-muted-foreground"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">MODEL</p>
            <div className="flex gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={cn(
                    "px-2 py-1 rounded text-xs transition-colors",
                    model === m.id
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                      : "bg-accent/50 hover:bg-accent text-muted-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <Boxes className="w-12 h-12 mb-3 text-purple-400/50" />
            <p className="text-sm font-medium">Architecture Agent</p>
            <p className="text-xs mt-1 max-w-[250px]">
              {agentMode === "designer" && "Describe your architecture requirements and I'll help you design it."}
              {agentMode === "reviewer" && "Describe your current architecture and I'll review it for improvements."}
              {agentMode === "costOptimizer" && "Tell me about your architecture and I'll suggest cost optimizations."}
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-2",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-purple-500/20 text-foreground"
                    : "bg-accent/50 text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            </div>
            <div className="bg-accent/50 rounded-lg px-3 py-2">
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border/50 space-y-2">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              agentMode === "designer" 
                ? "Describe your architecture needs..." 
                : agentMode === "reviewer"
                ? "Describe your current architecture..."
                : "Tell me about your AWS costs..."
            }
            className="flex-1 bg-accent/50 border border-border/50 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            rows={2}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-purple-500 hover:bg-purple-600 text-white h-8"
            >
              <Send className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearChat}
              disabled={messages.length === 0}
              className="h-8 text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Generate Architecture Button - only show when there's chat history and in designer mode */}
        {messages.length > 0 && agentMode === "designer" && (
          <Button
            onClick={generateArchitecture}
            disabled={isGenerating}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating Architecture...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Architecture
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
