"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Globe,
  Settings,
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ArrowLeft,
  Brain,
  Sparkles,
  Shield,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsData {
  hasOpenAiKey: boolean;
  openaiKeyLastFour: string | null;
  openaiKeyAddedAt: string | null;
  preferredModel: string;
  subscriptionTier: string;
  hasAiAccess: boolean;
  settings: Record<string, unknown>;
}

interface ModelOption {
  id: string;
  name: string;
  description: string;
}

// No fallback - models must come from OpenAI API

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API Key form state
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4.1");
  
  // Dynamic models state - no fallback, must fetch from OpenAI
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchSettings();
    }
  }, [status, router]);

  async function fetchSettings() {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await response.json();
      setSettings(data);
      setSelectedModel(data.preferredModel || "gpt-4.1");
      
      // If user has an API key, fetch available models
      if (data.hasOpenAiKey) {
        fetchModels();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchModels() {
    setModelsLoading(true);
    try {
      const response = await fetch("/api/models");
      if (response.ok) {
        const data = await response.json();
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
          setKeyValid(true);
        }
      } else if (response.status === 401) {
        // Invalid API key
        setKeyValid(false);
        setError("Your API key appears to be invalid. Please update it.");
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
      // Keep fallback models
    } finally {
      setModelsLoading(false);
    }
  }

  async function handleSaveApiKey() {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    if (!apiKey.startsWith("sk-")) {
      setError("Invalid API key format. Key should start with 'sk-'");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openaiApiKey: apiKey,
          preferredModel: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save API key");
      }

      setSettings(data);
      setApiKey("");
      setSuccess("API key saved successfully!");
      
      // Clear model cache and fetch fresh models to validate the key
      await fetch("/api/models", { method: "DELETE" });
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save API key");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateModel() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredModel: selectedModel }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update model");
      }

      setSettings(data);
      setSuccess("Model preference updated!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update model");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteApiKey() {
    if (!confirm("Are you sure you want to remove your API key? AI features will be disabled.")) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove API key");
      }

      // Refresh settings
      await fetchSettings();
      setSuccess("API key removed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove API key");
    } finally {
      setDeleting(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">CloudAcademy</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Settings className="w-8 h-8" />
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your API keys and preferences.
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <X className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <p className="text-green-400">{success}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setSuccess(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* OpenAI API Key Section */}
          <Card className="bg-card/50 border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                OpenAI API Key
              </CardTitle>
              <CardDescription>
                Add your own OpenAI API key to unlock AI-powered features like coaching,
                flashcard generation, and solution feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Key Status */}
              {settings?.hasOpenAiKey ? (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-medium text-green-400">API Key Active</p>
                        <p className="text-sm text-muted-foreground">
                          Key: {settings.openaiKeyLastFour}
                        </p>
                        {settings.openaiKeyAddedAt && (
                          <p className="text-xs text-muted-foreground">
                            Added: {new Date(settings.openaiKeyAddedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                      onClick={handleDeleteApiKey}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-400">No API Key</p>
                      <p className="text-sm text-muted-foreground">
                        Add your OpenAI API key to enable AI features.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Add/Update Key Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">
                    {settings?.hasOpenAiKey ? "Replace API Key" : "Add API Key"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      platform.openai.com
                    </a>
                  </p>
                </div>

                <Button
                  onClick={handleSaveApiKey}
                  disabled={saving || !apiKey.trim()}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  {settings?.hasOpenAiKey ? "Update API Key" : "Save API Key"}
                </Button>
              </div>

              {/* Security Note */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Your key is encrypted</p>
                  <p className="text-muted-foreground">
                    We encrypt your API key using AES-256-GCM before storing it. 
                    Only the last 4 characters are visible for identification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Selection - Only show when API key is configured */}
          <Card className="bg-card/50 border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Preferred Model
                {keyValid === true && (
                  <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {keyValid === false && (
                  <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Invalid Key
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {!settings?.hasOpenAiKey
                  ? "Add your OpenAI API key above to see available models."
                  : modelsLoading 
                    ? "Fetching available models from OpenAI..." 
                    : keyValid 
                      ? `${availableModels.length} models available from your OpenAI account`
                      : "Unable to fetch models. Please check your API key."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings?.hasOpenAiKey ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Key className="w-10 h-10 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Configure your OpenAI API key to unlock model selection
                  </p>
                </div>
              ) : modelsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Fetching models from OpenAI...</span>
                </div>
              ) : availableModels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertTriangle className="w-10 h-10 text-yellow-500/50 mb-3" />
                  <p className="text-muted-foreground">
                    Could not fetch models from OpenAI. Please verify your API key is valid.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => fetchModels()}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {availableModels.map((model) => (
                    <div
                      key={model.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedModel === model.id
                          ? "bg-primary/10 border-primary"
                          : "bg-background/50 border-border/50 hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedModel(model.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{model.name}</p>
                          <p className="text-sm text-muted-foreground">{model.description}</p>
                        </div>
                        {selectedModel === model.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {settings?.hasOpenAiKey && settings?.preferredModel !== selectedModel && (
                <Button onClick={handleUpdateModel} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Save Model Preference
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Subscription Info */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {settings?.subscriptionTier === "free"
                      ? "Free tier - Limited features"
                      : `${settings?.subscriptionTier} tier`}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-lg px-4 py-1">
                  {settings?.subscriptionTier || "free"}
                </Badge>
              </div>

              {settings?.subscriptionTier === "free" && (
                <div className="mt-4">
                  <Link href="/pricing">
                    <Button variant="glow" className="w-full gap-2">
                      <Sparkles className="w-4 h-4" />
                      Upgrade Your Plan
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
