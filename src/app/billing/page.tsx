"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  CreditCard, 
  Check, 
  Users, 
  HardDrive, 
  Cpu, 
  Zap,
  Building2,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { PLANS, type PlanId, formatPrice } from "@/lib/plans";

interface UsageData {
  storage: { used: number; limit: number };
  transfers: { count: number; bytes: number };
  users: { count: number; limit: number };
  graph: { 
    nodes: number; 
    limit: number; 
    queries: number;
    queriesLimit: number;
    computeSeconds: number;
    computeLimit: number;
  };
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<PlanId>("FREE");
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchBillingData();
    }
  }, [session]);

  // Handle Stripe checkout callbacks
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const plan = searchParams.get("plan");

    if (success === "true" && plan) {
      toast({
        title: "Upgrade Successful!",
        description: `You're now on the ${plan === "PRO" ? "Business" : plan} plan. Welcome aboard!`,
      });
      // Clean up URL params
      router.replace("/billing", { scroll: false });
    } else if (canceled === "true") {
      toast({
        title: "Checkout Canceled",
        description: "No worries! You can upgrade anytime.",
        variant: "destructive",
      });
      router.replace("/billing", { scroll: false });
    }
  }, [searchParams, router, toast]);

  const fetchBillingData = async () => {
    try {
      const res = await fetch("/api/billing");
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan((data.plan as PlanId) || "FREE");
        setUsage(data.usage);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === "ENTERPRISE") {
      window.open("mailto:sales@cloudmigrate.io?subject=Enterprise Plan Inquiry", "_blank");
      return;
    }

    setUpgrading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Checkout Error",
          description: data.error || "Stripe is not configured. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpgrading(null);
    }
  };

  // Dev only: Reset plan to FREE
  const handleResetPlan = async () => {
    if (!confirm("Reset to FREE plan? (Dev only)")) return;
    try {
      const res = await fetch("/api/billing/reset", { method: "POST" });
      if (res.ok) {
        await fetchBillingData();
        toast({
          title: "Plan Reset",
          description: "Your plan has been reset to FREE.",
        });
      }
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const data = await res.json();
        toast({
          title: "Portal Error",
          description: data.error || "Failed to open billing portal.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Portal Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num === -1) return "Unlimited";
    return num.toLocaleString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return null;

  const currentPlanData = PLANS.find(p => p.id === currentPlan);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="w-56 shrink-0" /> {/* Spacer for fixed sidebar */}

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="shrink-0">
            <div className="max-w-5xl mx-auto px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Billing & Plans</h1>
                  <p className="text-xs text-muted-foreground">Manage your subscription and usage</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {/* Current Usage */}
            {usage && (
              <div className="mb-8">
                <h2 className="text-sm font-medium text-muted-foreground mb-4">Current Usage</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Team Members</span>
                    </div>
                    <p className="text-2xl font-semibold text-foreground">
                      {usage.users.count}
                      <span className="text-sm text-muted-foreground font-normal">
                        /{formatNumber(usage.users.limit)}
                      </span>
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Storage Used</span>
                    </div>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatBytes(usage.storage.used)}
                      <span className="text-sm text-muted-foreground font-normal">
                        /{formatBytes(usage.storage.limit)}
                      </span>
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Graph Nodes</span>
                    </div>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatNumber(usage.graph.nodes)}
                      <span className="text-sm text-muted-foreground font-normal">
                        /{formatNumber(usage.graph.limit)}
                      </span>
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Graph Queries</span>
                    </div>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatNumber(usage.graph.queries)}
                      <span className="text-sm text-muted-foreground font-normal">/month</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Manage Subscription */}
            {currentPlan !== "FREE" && (
              <div className="mb-8 p-4 bg-card border border-border rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    You're on the <span className="text-primary">{currentPlanData?.name}</span> plan
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Manage your subscription, update payment method, or view invoices
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleManageBilling} disabled={portalLoading}>
                    {portalLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Manage Subscription
                  </Button>
                  {/* Dev only reset button */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleResetPlan}
                    className="text-xs text-muted-foreground"
                  >
                    Reset to Free (Dev)
                  </Button>
                </div>
              </div>
            )}

            {/* Pricing Plans */}
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Available Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-card border rounded-xl p-6 ${
                    plan.popular 
                      ? "border-primary shadow-lg shadow-primary/10" 
                      : "border-border"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-3xl font-bold text-foreground">
                      {formatPrice(plan)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 mt-0.5 shrink-0" />
                        )}
                        <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.id === currentPlan ? "outline" : plan.popular ? "default" : "secondary"}
                    disabled={plan.id === currentPlan || upgrading === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                    aria-current={plan.id === currentPlan ? "true" : undefined}
                  >
                    {upgrading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : plan.id === currentPlan ? (
                      "Current Plan"
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {/* Cost Breakdown */}
            <div className="mt-8 p-4 bg-muted/30 border border-border rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Fair Usage Policy</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All plans include reasonable usage limits. If you exceed your plan limits, 
                    you'll be notified and can upgrade or purchase additional capacity. 
                    Enterprise customers get custom limits and dedicated resources.
                  </p>
                </div>
              </div>
            </div>

            {/* Enterprise CTA */}
            <div className="mt-6 p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-700 rounded-lg">
                    <Building2 className="w-6 h-6 text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Need a custom solution?</h3>
                    <p className="text-sm text-zinc-400">
                      Get dedicated support, custom integrations, and volume discounts
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  onClick={() => window.open("mailto:sales@cloudmigrate.io", "_blank")}
                >
                  Contact Sales
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
