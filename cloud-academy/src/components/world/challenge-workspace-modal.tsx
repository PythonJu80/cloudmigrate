"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  X, 
  Send, 
  Loader2, 
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  HelpCircle,
  Square,
  Cloud,
  Database,
  Server,
  Shield,
  Globe,
  Trash2,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageCircle,
  PanelRightClose
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  hints: string[];
  success_criteria: string[];
  aws_services_relevant: string[];
  estimated_time_minutes: number;
}

interface ChallengeWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge;
  scenario: {
    scenario_title: string;
    scenario_description: string;
    business_context: string;
    company_name: string;
  };
  companyInfo: Record<string, unknown>;
  challengeIndex: number;
  totalChallenges: number;
  onNextChallenge?: () => void;
  onPrevChallenge?: () => void;
  apiKey?: string | null;
  preferredModel?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChallengeWorkspaceModal({
  isOpen,
  onClose,
  challenge,
  challengeIndex,
  totalChallenges,
  onNextChallenge,
  onPrevChallenge,
}: ChallengeWorkspaceModalProps) {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Challenge state
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [completedCriteria, setCompletedCriteria] = useState<number[]>([]);

  // Canvas state
  const [selectedTool, setSelectedTool] = useState<"select" | "vpc" | "ec2" | "rds" | "s3" | "lambda">("select");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: `I'm here to help you with "${challenge.title}". This challenge focuses on ${challenge.aws_services_relevant.join(", ")}. What specific aspect would you like to explore?`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const revealHint = (index: number) => {
    if (!revealedHints.includes(index)) {
      setRevealedHints((prev) => [...prev, index]);
    }
  };

  const toggleCriteria = (index: number) => {
    setCompletedCriteria((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const difficultyColor = {
    beginner: "text-green-400 bg-green-500/20",
    intermediate: "text-amber-400 bg-amber-500/20",
    advanced: "text-orange-400 bg-orange-500/20",
    expert: "text-red-400 bg-red-500/20",
  }[challenge.difficulty] || "text-gray-400 bg-gray-500/20";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 gap-0 bg-slate-950 border border-slate-800 overflow-hidden flex flex-col z-[100] [&>button]:hidden">
        {/* Header - Single compact line */}
        <div className="h-10 flex items-center justify-between px-3 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="w-4 h-4" />
            </Button>
            <span className="text-xs text-slate-500">{challengeIndex + 1}/{totalChallenges}</span>
            <span className={cn("text-xs px-1.5 py-0.5 rounded", difficultyColor)}>
              {challenge.difficulty}
            </span>
            <span className="text-xs text-cyan-400">+{challenge.points} pts</span>
            <span className="text-sm font-medium text-slate-200">{challenge.title}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onPrevChallenge} disabled={challengeIndex === 0} className="h-7 w-7">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNextChallenge} disabled={challengeIndex === totalChallenges - 1} className="h-7 w-7">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main workspace area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left side - Brief + Canvas */}
          <div className={cn(
            "flex flex-col transition-all duration-300",
            isChatOpen ? "flex-1" : "flex-1"
          )}>
            {/* Challenge Brief - Compact */}
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-slate-300">Challenge Brief</h3>
                    <div className="flex gap-1">
                      {challenge.aws_services_relevant.slice(0, 3).map((service, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[10px]">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{challenge.description}</p>
                </div>
              </div>
              
              {/* Success Criteria */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {challenge.success_criteria.map((criteria, i) => (
                  <button
                    key={i}
                    onClick={() => toggleCriteria(i)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors",
                      completedCriteria.includes(i) 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                    )}
                  >
                    {completedCriteria.includes(i) ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Circle className="w-3 h-3" />
                    )}
                    <span className="truncate max-w-[180px]">{criteria}</span>
                  </button>
                ))}
              </div>
              
              {/* Hints */}
              <button
                onClick={() => setShowHints(!showHints)}
                className="mt-2 flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
              >
                <Lightbulb className="w-3 h-3" />
                {showHints ? "Hide hints" : `${challenge.hints.length} hints available`}
              </button>
              {showHints && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {challenge.hints.map((hint, i) => (
                    revealedHints.includes(i) ? (
                      <span key={i} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-200 text-xs">{hint}</span>
                    ) : (
                      <button key={i} onClick={() => revealHint(i)} className="px-2 py-0.5 rounded border border-dashed border-slate-700 text-xs text-slate-500 hover:border-amber-500/50">
                        Reveal hint {i + 1}
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
              {/* Canvas Toolbar */}
              <div className="h-10 flex items-center gap-1 px-2 border-b border-slate-800 bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-0.5 pr-2 border-r border-slate-700">
                  <Button
                    variant={selectedTool === "select" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedTool("select")}
                  >
                    <Move className="w-3.5 h-3.5" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-0.5 pr-2 border-r border-slate-700">
                  <Button variant={selectedTool === "vpc" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setSelectedTool("vpc")}>
                    <Square className="w-3.5 h-3.5 text-purple-400" />
                  </Button>
                  <Button variant={selectedTool === "ec2" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setSelectedTool("ec2")}>
                    <Server className="w-3.5 h-3.5 text-orange-400" />
                  </Button>
                  <Button variant={selectedTool === "rds" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setSelectedTool("rds")}>
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                  </Button>
                  <Button variant={selectedTool === "s3" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setSelectedTool("s3")}>
                    <Cloud className="w-3.5 h-3.5 text-green-400" />
                  </Button>
                  <Button variant={selectedTool === "lambda" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setSelectedTool("lambda")}>
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                  </Button>
                </div>

                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ZoomIn className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ZoomOut className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><RotateCcw className="w-3.5 h-3.5" /></Button>
                </div>

                <div className="flex-1" />

                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Canvas */}
              <div className="flex-1 relative">
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
                    `,
                    backgroundSize: "24px 24px",
                  }}
                />
                
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm font-medium text-slate-600">Architecture Canvas</p>
                    <p className="text-xs text-slate-700 mt-1">Drag and drop AWS components to design your solution</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Collapsible Chat */}
          <div className={cn(
            "flex flex-col border-l border-slate-800 transition-all duration-300 overflow-hidden",
            isChatOpen ? "w-[320px] bg-slate-900" : "w-10 bg-slate-950"
          )}>
            {/* Chat toggle / header */}
            <div className="h-10 flex items-center justify-between px-2 border-b border-slate-800 shrink-0">
              {isChatOpen ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">Sophia</span>
                    <span className="text-xs text-slate-500">AI Coach</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsChatOpen(false)}>
                    <PanelRightClose className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 mx-auto"
                  onClick={() => setIsChatOpen(true)}
                >
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                </Button>
              )}
            </div>

            {/* Chat content - only visible when open */}
            {isChatOpen && (
              <>
                {/* Messages */}
                <div className="flex-1 p-3 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Need help?</p>
                      <p className="text-xs mt-1">Ask me anything about this challenge!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg, i) => (
                        <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                            msg.role === "user" ? "bg-cyan-500/20 text-cyan-100" : "bg-slate-800 text-slate-200"
                          )}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-slate-800 rounded-lg px-3 py-2">
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-2 border-t border-slate-800 shrink-0">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Ask Sophia..."
                      className="h-8 text-sm bg-slate-800 border-slate-700"
                    />
                    <Button
                      size="icon"
                      onClick={sendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="h-8 w-8 bg-cyan-500 hover:bg-cyan-600"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
