"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  BookOpen,
  FileText,
  Layers,
  MessageSquare,
  Building2,
  Target,
  Clock,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  type: "status" | "search" | "source" | "research" | "knowledge" | "complete" | "error";
  message?: string;
  similarity?: number;
  step?: number;
  total_steps?: number;
  url?: string;
  title?: string;
  company?: Record<string, unknown>;
  scenario?: Record<string, unknown>;
  company_info?: Record<string, unknown>;
  cert_code?: string;
  cert_name?: string;
  sources?: string[];
}

interface ScenarioGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  industry: string;
  certCode: string;
  certName: string;
  userLevel?: string;
  latitude?: number;
  longitude?: number;
  apiKey?: string | null;
  preferredModel?: string | null;
  onQuiz?: (scenario: Record<string, unknown>, companyInfo: Record<string, unknown>) => void;
  onNotes?: (scenario: Record<string, unknown>, companyInfo: Record<string, unknown>) => void;
  onFlashcards?: (scenario: Record<string, unknown>, companyInfo: Record<string, unknown>) => void;
  onCoach?: (scenario: Record<string, unknown>, companyInfo: Record<string, unknown>) => void;
}

export function ScenarioGenerationModal({
  isOpen,
  onClose,
  businessName,
  industry,
  certCode,
  certName,
  userLevel = "intermediate",
  latitude,
  longitude,
  apiKey,
  preferredModel,
  onQuiz,
  onNotes,
  onFlashcards,
  onCoach,
}: ScenarioGenerationModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    scenario: Record<string, unknown>;
    companyInfo: Record<string, unknown>;
    certCode?: string;
    certName?: string;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(5);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (scrollRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [logs]);

  // Start generation when modal opens
  useEffect(() => {
    if (isOpen && !isGenerating && !isComplete) {
      startGeneration();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLogs([]);
      setIsGenerating(false);
      setIsComplete(false);
      setError(null);
      setResult(null);
      setCurrentStep(0);
    }
  }, [isOpen]);

  const startGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setLogs([]);

    try {
      const response = await fetch("http://localhost:1027/api/learning/generate-scenario-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: businessName,
          industry: industry,
          cert_code: certCode,
          user_level: userLevel,
          latitude: latitude,
          longitude: longitude,
          openai_api_key: apiKey,
          preferred_model: preferredModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data: LogEntry = JSON.parse(line.slice(6));
              setLogs((prev) => [...prev, data]);

              if (data.step) setCurrentStep(data.step);
              if (data.total_steps) setTotalSteps(data.total_steps);

              if (data.type === "complete") {
                setIsComplete(true);
                setIsGenerating(false);
                setResult({
                  scenario: data.scenario as Record<string, unknown>,
                  companyInfo: data.company_info as Record<string, unknown>,
                  certCode: data.cert_code,
                  certName: data.cert_name,
                });
              }

              if (data.type === "error") {
                setError(data.message || "Unknown error");
                setIsGenerating(false);
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to connect to learning agent");
      setIsGenerating(false);
    }
  };

  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGenerating && <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />}
            {isComplete && <CheckCircle2 className="w-5 h-5 text-green-400" />}
            {error && <XCircle className="w-5 h-5 text-red-400" />}
            <span>
              {isGenerating && "Generating Challenge..."}
              {isComplete && "Challenge Ready!"}
              {error && "Generation Failed"}
              {!isGenerating && !isComplete && !error && "Starting..."}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Logs View - shown during generation */}
        {!isComplete && (
          <div className="flex-1 max-h-[400px] overflow-y-auto rounded-lg border border-border/50 bg-slate-900/50 p-4">
            <div ref={scrollRef} className="space-y-2 font-mono text-sm">
              {logs.map((log, i) => (
                <div key={i} className={cn(
                  "flex items-start gap-2",
                  log.type === "error" && "text-red-400",
                  log.type === "status" && "text-cyan-400",
                  log.type === "search" && "text-yellow-400",
                  log.type === "source" && "text-green-400 pl-4",
                )}>
                  {log.type === "status" && <span>{log.message}</span>}
                  {log.type === "search" && <span>{log.message}</span>}
                  {log.type === "source" && (
                    <a 
                      href={log.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {log.title || log.url}
                    </a>
                  )}
                  {log.type === "knowledge" && (
                    <a 
                      href={log.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:underline text-purple-400"
                    >
                      <BookOpen className="w-3 h-3" />
                      AWS KB: {log.url?.split('/').pop()} ({log.similarity || 0} match)
                    </a>
                  )}
                  {log.type === "error" && <span>❌ {log.message}</span>}
                </div>
              ))}
              {isGenerating && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results View - shown after completion */}
        {isComplete && result && (
          <div className="flex-1 space-y-4 overflow-y-auto">
            {/* Company Info */}
            <div className="rounded-lg border border-border/50 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="w-5 h-5 text-cyan-400" />
                {result.companyInfo.name as string}
              </div>
              <p className="text-sm text-muted-foreground">
                {result.companyInfo.description as string}
              </p>
              <div className="flex flex-wrap gap-2">
                {(result.companyInfo.key_services as string[] || []).slice(0, 5).map((service, i) => (
                  <span key={i} className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs">
                    {service}
                  </span>
                ))}
              </div>
            </div>

            {/* Scenario Info */}
            <div className="rounded-lg border border-border/50 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Target className="w-5 h-5 text-amber-400" />
                {result.scenario.scenario_title as string}
              </div>
              <p className="text-sm text-muted-foreground">
                {result.scenario.scenario_description as string}
              </p>
              
              {/* Challenges */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Challenges:</div>
                {(result.scenario.challenges as Array<{title: string; difficulty: string}> || []).map((challenge, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                    <span className="text-sm">{challenge.title}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      challenge.difficulty === "beginner" && "bg-green-500/20 text-green-400",
                      challenge.difficulty === "intermediate" && "bg-yellow-500/20 text-yellow-400",
                      challenge.difficulty === "advanced" && "bg-orange-500/20 text-orange-400",
                      challenge.difficulty === "expert" && "bg-red-500/20 text-red-400",
                    )}>
                      {challenge.difficulty}
                    </span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {result.scenario.estimated_total_time_minutes as number || 60} min
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  {result.scenario.difficulty as string}
                </div>
                {result.certName && (
                  <div className="flex items-center gap-1 text-cyan-400">
                    <Target className="w-4 h-4" />
                    {result.certName}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="gap-2 h-14 border-purple-500/30 hover:bg-purple-500/10"
                onClick={() => onQuiz?.(result.scenario, result.companyInfo)}
              >
                <BookOpen className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <div className="font-medium">Quiz</div>
                  <div className="text-xs text-muted-foreground">Test your knowledge</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="gap-2 h-14 border-green-500/30 hover:bg-green-500/10"
                onClick={() => onNotes?.(result.scenario, result.companyInfo)}
              >
                <FileText className="w-5 h-5 text-green-400" />
                <div className="text-left">
                  <div className="font-medium">Notes</div>
                  <div className="text-xs text-muted-foreground">Study materials</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="gap-2 h-14 border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => onFlashcards?.(result.scenario, result.companyInfo)}
              >
                <Layers className="w-5 h-5 text-amber-400" />
                <div className="text-left">
                  <div className="font-medium">Flashcards</div>
                  <div className="text-xs text-muted-foreground">Quick review</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="gap-2 h-14 border-cyan-500/30 hover:bg-cyan-500/10"
                onClick={() => onCoach?.(result.scenario, result.companyInfo)}
              >
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <div className="text-left">
                  <div className="font-medium">Coach with AI</div>
                  <div className="text-xs text-muted-foreground">Get guided help</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
            <p className="font-medium">Generation Failed</p>
            <p className="text-sm mt-1">{error}</p>
            <Button 
              variant="outline" 
              className="mt-3"
              onClick={() => {
                setError(null);
                startGeneration();
              }}
            >
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
