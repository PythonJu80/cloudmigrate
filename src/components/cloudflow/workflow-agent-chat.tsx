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
  Wrench,
  Bug,
  ChevronDown,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  workflow?: object;
  timestamp: number;
}

interface WorkflowAgentChatProps {
  onWorkflowGenerated?: (flowId: string) => void;
  className?: string;
}

const STORAGE_KEY = "cloudflow-agent-chat";

const AGENT_MODES = [
  { id: "builder", label: "Workflow Builder", icon: Sparkles, description: "Build new workflows" },
  { id: "optimizer", label: "Optimizer", icon: Wrench, description: "Optimize existing workflows" },
  { id: "debug", label: "Debug Assistant", icon: Bug, description: "Troubleshoot issues" },
];

const MODELS = [
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-5", label: "GPT-5" },
  { id: "gpt-5.1", label: "GPT-5.1" },
];

export function WorkflowAgentChat({ onWorkflowGenerated, className }: WorkflowAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState("gpt-4.1");
  const [agentMode, setAgentMode] = useState("builder");
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
        setAgentMode(data.agentMode || "builder");
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

  // Scroll to bottom on new messages
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

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/cloudflow/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          chatHistory,
          model,
          agentMode,
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
        workflow: data.workflow,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If workflow was generated, notify parent
      if (data.workflow && onWorkflowGenerated) {
        onWorkflowGenerated(data.workflow);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("Clear all chat history?")) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Generate workflow from chat history - saves to DB and returns flowId
  const generateWorkflow = async () => {
    if (messages.length === 0 || isGenerating) return;

    setIsGenerating(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/cloudflow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatHistory }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate workflow");
      }

      const data = await res.json();

      // Clear chat after successful generation
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);

      // Notify parent with the new flow ID
      if (onWorkflowGenerated && data.flowId) {
        onWorkflowGenerated(data.flowId);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error generating workflow: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentMode = AGENT_MODES.find((m) => m.id === agentMode) || AGENT_MODES[0];
  const ModeIcon = currentMode.icon;

  return (
    <div
      className={cn(
        "flex flex-col bg-card border border-border rounded-lg overflow-hidden transition-all duration-300",
        isExpanded ? "fixed inset-4 z-50" : "h-[500px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-accent/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Workflow Agent</h3>
            <p className="text-xs text-muted-foreground">{currentMode.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowSettings(!showSettings)}
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", showSettings && "rotate-180")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10"
            onClick={clearChat}
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-border bg-accent/20 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Agent Mode</label>
            <div className="flex gap-2">
              {AGENT_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setAgentMode(mode.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors",
                      agentMode === mode.id
                        ? "bg-purple-500 text-white"
                        : "bg-accent/50 hover:bg-accent"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Model</label>
            <div className="flex gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs transition-colors",
                    model === m.id
                      ? "bg-amber-500 text-white"
                      : "bg-accent/50 hover:bg-accent"
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
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
              <ModeIcon className="w-8 h-8 text-purple-500" />
            </div>
            <h4 className="text-lg font-medium mb-2">CloudFlow Workflow Agent</h4>
            <p className="text-sm text-muted-foreground max-w-sm">
              {agentMode === "builder" && "Describe the automation you want to build, and I'll help you create the perfect workflow."}
              {agentMode === "optimizer" && "Share your workflow details, and I'll suggest optimizations for performance and cost."}
              {agentMode === "debug" && "Tell me about the issue you're facing, and I'll help you troubleshoot."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {agentMode === "builder" && (
                <>
                  <button
                    onClick={() => setInput("Create a workflow that processes S3 uploads and stores metadata in DynamoDB")}
                    className="text-xs px-3 py-1.5 rounded-full bg-accent/50 hover:bg-accent transition-colors"
                  >
                    S3 → DynamoDB pipeline
                  </button>
                  <button
                    onClick={() => setInput("Build a scheduled workflow that checks EC2 instance health daily")}
                    className="text-xs px-3 py-1.5 rounded-full bg-accent/50 hover:bg-accent transition-colors"
                  >
                    Scheduled health check
                  </button>
                  <button
                    onClick={() => setInput("Create a webhook that triggers a Lambda function and sends SNS notifications")}
                    className="text-xs px-3 py-1.5 rounded-full bg-accent/50 hover:bg-accent transition-colors"
                  >
                    Webhook → Lambda → SNS
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-purple-500" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                  message.role === "user"
                    ? "bg-amber-500 text-white"
                    : "bg-accent/50"
                )}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.workflow && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => onWorkflowGenerated?.(message.workflow!)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Apply Workflow
                    </Button>
                  </div>
                )}
              </div>
              {message.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-amber-500">You</span>
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-purple-500" />
            </div>
            <div className="bg-accent/50 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              agentMode === "builder"
                ? "Describe the workflow you want to build..."
                : agentMode === "optimizer"
                ? "Describe your workflow for optimization..."
                : "Describe the issue you're facing..."
            }
            className="flex-1 bg-accent/30 border border-border rounded-lg px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            rows={2}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-purple-500 hover:bg-purple-600 self-end"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Generate Workflow Button - only show when there's chat history */}
        {messages.length > 0 && agentMode === "builder" && (
          <Button
            onClick={generateWorkflow}
            disabled={isGenerating}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating Workflow...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Workflow
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
