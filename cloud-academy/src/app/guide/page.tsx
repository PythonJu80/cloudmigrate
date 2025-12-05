"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Globe, 
  BookOpen, 
  Layers, 
  MessageSquare, 
  FileText,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Building2,
  Map,
  Sparkles,
  GraduationCap,
  Trophy,
  Brain,
  CheckCircle2,
  HelpCircle,
  Play,
  Key,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: React.ReactNode;
}

export default function GuidePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>("getting-started");

  const sections: GuideSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <Play className="w-5 h-5" />,
      description: "Learn the basics of Cloud Academy",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Welcome to Cloud Academy! This platform helps you prepare for AWS certifications through 
            real-world business scenarios and AI-powered learning tools.
          </p>
          
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Step 1: Set Up Your API Key
            </h4>
            <p className="text-sm text-muted-foreground pl-6">
              Go to <Link href="/settings" className="text-cyan-400 hover:underline">Settings</Link> and 
              add your OpenAI API key. This powers all AI features including challenge generation, 
              quizzes, and coaching.
            </p>
            
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Step 2: Choose Your Certification
            </h4>
            <p className="text-sm text-muted-foreground pl-6">
              Select your target AWS certification from the dropdown in the World Map sidebar. 
              All generated challenges will be tailored to that certification focus areas.
            </p>
            
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Step 3: Explore the World
            </h4>
            <p className="text-sm text-muted-foreground pl-6">
              Click on any location on the 3D globe to zoom in and discover real businesses. 
              Each business can become a unique learning scenario.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "world-map",
      title: "World Map & Business Discovery",
      icon: <Globe className="w-5 h-5" />,
      description: "Navigate the interactive globe and find businesses",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The World Map is your gateway to discovering real businesses that become the foundation 
            for your AWS learning scenarios.
          </p>
          
          <div className="grid gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-border/50">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                3D Globe Navigation
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Click and drag to rotate the globe</li>
                <li>Click on glowing location markers to zoom in</li>
                <li>Each marker represents a major city with businesses</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg bg-slate-800/50 border border-border/50">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Map className="w-4 h-4 text-green-400" />
                Satellite View
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>After clicking a location, you see the satellite map</li>
                <li>Colored markers show different business types</li>
                <li>Click any business marker to see details</li>
                <li>Use the industry filter (bottom-left) to show/hide categories</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg bg-slate-800/50 border border-border/50">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                Business Types
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Finance (Banks)</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400" /> Healthcare</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-400" /> Technology</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Retail</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400" /> Hospitality</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> Automotive</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400" /> Education</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-teal-400" /> Aviation</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "challenge-generation",
      title: "AI Challenge Generation",
      icon: <Zap className="w-5 h-5" />,
      description: "Create custom AWS challenges from real businesses",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Our AI researches real businesses and creates tailored AWS architecture challenges 
            based on their actual needs and your target certification.
          </p>
          
          <div className="space-y-3">
            <h4 className="font-semibold">How It Works:</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
              <li><strong>Select a business</strong> from the map or enter one manually</li>
              <li><strong>AI researches</strong> the company using web search (Tavily)</li>
              <li><strong>Knowledge base</strong> is searched for relevant AWS best practices</li>
              <li><strong>Certification focus</strong> is applied based on your target cert</li>
              <li><strong>Challenges are generated</strong> with real-world context</li>
            </ol>
          </div>
          
          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <h4 className="font-semibold text-cyan-400 mb-2">What You Will See:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Live streaming logs showing the AI research process</li>
              <li>Web sources being searched</li>
              <li>AWS knowledge base matches</li>
              <li>Final scenario with 3-5 progressive challenges</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <h4 className="font-semibold text-amber-400 mb-2">After Generation:</h4>
            <p className="text-sm text-muted-foreground">
              Choose from four learning modes: <strong>Quiz</strong>, <strong>Notes</strong>, 
              <strong>Flashcards</strong>, or <strong>Coach with AI</strong>.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "certifications",
      title: "AWS Certifications",
      icon: <GraduationCap className="w-5 h-5" />,
      description: "Supported certifications and focus areas",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Select your target certification and all content will be tailored to its specific 
            focus areas and exam objectives.
          </p>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-green-400">Associate Level</h4>
            <div className="grid gap-2">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-border/50">
                <div className="font-medium">Solutions Architect Associate</div>
                <p className="text-xs text-muted-foreground">Architecture design, high availability, cost optimization</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-border/50">
                <div className="font-medium">Developer Associate</div>
                <p className="text-xs text-muted-foreground">Serverless, APIs, CI/CD, SDKs</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-border/50">
                <div className="font-medium">SysOps Administrator Associate</div>
                <p className="text-xs text-muted-foreground">Operations, monitoring, automation</p>
              </div>
            </div>
            
            <h4 className="font-semibold text-amber-400 mt-4">Professional Level</h4>
            <div className="grid gap-2">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-border/50">
                <div className="font-medium">Solutions Architect Professional</div>
                <p className="text-xs text-muted-foreground">Complex architectures, multi-account, migrations</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-border/50">
                <div className="font-medium">DevOps Engineer Professional</div>
                <p className="text-xs text-muted-foreground">CI/CD pipelines, infrastructure as code, monitoring</p>
              </div>
            </div>
            
            <h4 className="font-semibold text-purple-400 mt-4">Specialty</h4>
            <div className="grid gap-2">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-border/50">
                <div className="font-medium">Security, Networking, ML, Database</div>
                <p className="text-xs text-muted-foreground">Deep-dive specialty certifications</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "learning-tools",
      title: "Learning Tools",
      icon: <Brain className="w-5 h-5" />,
      description: "Quiz, Notes, Flashcards, and AI Coaching",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            After generating a challenge, you have four ways to learn the material:
          </p>
          
          <div className="grid gap-4">
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <h4 className="font-semibold flex items-center gap-2 text-purple-400 mb-2">
                <BookOpen className="w-4 h-4" />
                Quiz
              </h4>
              <p className="text-sm text-muted-foreground">
                Test your knowledge with multiple-choice questions generated from the scenario. 
                Questions are tailored to your certification focus areas.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <h4 className="font-semibold flex items-center gap-2 text-green-400 mb-2">
                <FileText className="w-4 h-4" />
                Notes
              </h4>
              <p className="text-sm text-muted-foreground">
                Get comprehensive study notes covering the AWS services, best practices, 
                and architecture patterns relevant to the scenario.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <h4 className="font-semibold flex items-center gap-2 text-amber-400 mb-2">
                <Layers className="w-4 h-4" />
                Flashcards
              </h4>
              <p className="text-sm text-muted-foreground">
                Quick-review flashcards for memorizing key concepts, service features, 
                and exam-relevant facts.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <h4 className="font-semibold flex items-center gap-2 text-cyan-400 mb-2">
                <MessageSquare className="w-4 h-4" />
                Coach with AI
              </h4>
              <p className="text-sm text-muted-foreground">
                Chat with an AI coach who understands the scenario context. Ask questions, 
                get explanations, and work through the challenges step by step.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "settings",
      title: "Settings & API Keys",
      icon: <Settings className="w-5 h-5" />,
      description: "Configure your API key and preferences",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Cloud Academy uses your own OpenAI API key for AI features. This gives you full 
            control over costs and model selection.
          </p>
          
          <div className="p-4 rounded-lg bg-slate-800/50 border border-border/50">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-amber-400" />
              Setting Up Your API Key
            </h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
              <li>Go to <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">platform.openai.com</a></li>
              <li>Create an API key in your account settings</li>
              <li>Copy the key (starts with sk-)</li>
              <li>Paste it in <Link href="/settings" className="text-cyan-400 hover:underline">Settings</Link></li>
            </ol>
          </div>
          
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <h4 className="font-semibold text-green-400 mb-2">Security</h4>
            <p className="text-sm text-muted-foreground">
              Your API key is encrypted with AES-256-GCM before storage. Only the last 4 
              characters are visible for identification.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-800/50 border border-border/50">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-purple-400" />
              Preferred Model
            </h4>
            <p className="text-sm text-muted-foreground">
              Choose your preferred OpenAI model. GPT-4.1 is recommended for best results. 
              The model list is fetched from your OpenAI account.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "tips",
      title: "Tips & Best Practices",
      icon: <Sparkles className="w-5 h-5" />,
      description: "Get the most out of Cloud Academy",
      content: (
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <h4 className="font-semibold text-cyan-400 mb-2">🎯 Focus on One Cert at a Time</h4>
              <p className="text-sm text-muted-foreground">
                Set your target certification and stick with it. All generated content will 
                be tailored to that exam objectives.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <h4 className="font-semibold text-green-400 mb-2">🏢 Use Diverse Industries</h4>
              <p className="text-sm text-muted-foreground">
                Practice with different business types - banks need different architectures 
                than hospitals or retail stores. This builds versatile skills.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <h4 className="font-semibold text-purple-400 mb-2">💬 Use the AI Coach</h4>
              <p className="text-sm text-muted-foreground">
                Do not just read the challenges - discuss them with the AI coach. Ask why 
                questions and explore alternative solutions.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <h4 className="font-semibold text-amber-400 mb-2">📚 Review with Flashcards</h4>
              <p className="text-sm text-muted-foreground">
                After completing a scenario, use flashcards for spaced repetition. This 
                helps cement the knowledge for exam day.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <h4 className="font-semibold text-red-400 mb-2">🔄 Practice Regularly</h4>
              <p className="text-sm text-muted-foreground">
                Consistency beats intensity. 30 minutes daily is better than 4 hours once 
                a week. Build a study streak!
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/world">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to World
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <h1 className="text-lg font-semibold">User Guide</h1>
            </div>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 mb-4">
            <GraduationCap className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome to Cloud Academy</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Learn AWS through real-world business scenarios. Our AI generates custom challenges 
            based on actual companies, tailored to your target certification.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Link href="/world">
            <Card className="hover:border-cyan-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <Globe className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <div className="font-medium">World Map</div>
                <div className="text-xs text-muted-foreground">Explore businesses</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/settings">
            <Card className="hover:border-cyan-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <Key className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <div className="font-medium">Settings</div>
                <div className="text-xs text-muted-foreground">API key setup</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard">
            <Card className="hover:border-cyan-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="font-medium">Dashboard</div>
                <div className="text-xs text-muted-foreground">Your progress</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/coach">
            <Card className="hover:border-cyan-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="font-medium">AI Coach</div>
                <div className="text-xs text-muted-foreground">Get help</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                className="w-full text-left"
              >
                <CardHeader className="flex flex-row items-center gap-4 py-4 hover:bg-secondary/50 transition-colors">
                  <div className={cn(
                    "p-2 rounded-lg",
                    expandedSection === section.id ? "bg-cyan-500/20 text-cyan-400" : "bg-secondary text-muted-foreground"
                  )}>
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription className="text-sm">{section.description}</CardDescription>
                  </div>
                  {expandedSection === section.id ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </CardHeader>
              </button>
              {expandedSection === section.id && (
                <CardContent className="pt-0 pb-6 px-6 border-t border-border/50">
                  {section.content}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
            <CardContent className="py-8">
              <h3 className="text-xl font-semibold mb-2">Ready to Start Learning?</h3>
              <p className="text-muted-foreground mb-4">
                Explore the world and create your first challenge!
              </p>
              <Link href="/world">
                <Button variant="glow" size="lg" className="gap-2">
                  <Globe className="w-5 h-5" />
                  Open World Map
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
