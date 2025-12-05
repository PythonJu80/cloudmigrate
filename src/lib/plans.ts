/**
 * Centralized plan configuration
 * Single source of truth for all plan limits and features
 */

export type PlanId = "FREE" | "PRO" | "ENTERPRISE";

export interface PlanLimits {
  users: number;
  storage: number;
  nodes: number;
  gds: boolean;
  maxRelationships: number;
  queriesPerMonth: number;
  computeSecondsPerMonth: number;
}

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string;
  features: PlanFeature[];
  limits: PlanLimits;
  cta: string;
  popular: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  FREE: {
    users: 5,
    storage: 5 * 1024 * 1024 * 1024, // 5GB
    nodes: 1000,
    gds: false,
    maxRelationships: 5000,
    queriesPerMonth: 100,
    computeSecondsPerMonth: 60,
  },
  PRO: {
    users: 25,
    storage: 100 * 1024 * 1024 * 1024, // 100GB
    nodes: 100000,
    gds: true,
    maxRelationships: 500000,
    queriesPerMonth: 10000,
    computeSecondsPerMonth: 3600,
  },
  ENTERPRISE: {
    users: -1, // unlimited
    storage: 1024 * 1024 * 1024 * 1024, // 1TB
    nodes: -1, // unlimited (10M practical limit)
    gds: true,
    maxRelationships: 50000000,
    queriesPerMonth: -1, // unlimited
    computeSecondsPerMonth: -1, // unlimited
  },
};

export const PLANS: Plan[] = [
  {
    id: "FREE",
    name: "Free Trial",
    price: 0,
    currency: "GBP",
    period: "forever",
    description: "Try CloudMigrate with basic features",
    features: [
      { text: "5 team members", included: true },
      { text: "5 GB storage transfers", included: true },
      { text: "1,000 graph nodes", included: true },
      { text: "Basic AI assistant", included: true },
      { text: "Community support", included: true },
      { text: "Graph algorithms (GDS)", included: false },
      { text: "Company knowledge base", included: false },
      { text: "Priority support", included: false },
    ],
    limits: PLAN_LIMITS.FREE,
    cta: "Current Plan",
    popular: false,
  },
  {
    id: "PRO",
    name: "Business",
    price: 79,
    currency: "GBP",
    period: "/month",
    description: "For growing teams migrating to cloud",
    features: [
      { text: "25 team members", included: true },
      { text: "100 GB storage transfers", included: true },
      { text: "100,000 graph nodes", included: true },
      { text: "Advanced AI assistant", included: true },
      { text: "Graph algorithms (GDS)", included: true },
      { text: "Company knowledge base", included: true },
      { text: "Email support", included: true },
      { text: "API access", included: true },
    ],
    limits: PLAN_LIMITS.PRO,
    cta: "Upgrade to Business",
    popular: true,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 299,
    currency: "GBP",
    period: "/month",
    description: "For large organizations with complex needs",
    features: [
      { text: "Unlimited team members", included: true },
      { text: "1 TB storage transfers", included: true },
      { text: "Unlimited graph nodes", included: true },
      { text: "Custom AI training", included: true },
      { text: "Advanced graph algorithms", included: true },
      { text: "Bring Your Own Neo4j", included: true },
      { text: "Dedicated support", included: true },
      { text: "SLA guarantee", included: true },
    ],
    limits: PLAN_LIMITS.ENTERPRISE,
    cta: "Contact Sales",
    popular: false,
  },
];

export function getPlan(planId: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId] || PLAN_LIMITS.FREE;
}

export function formatPrice(plan: Plan): string {
  if (plan.price === 0) return "Free";
  const symbol = plan.currency === "GBP" ? "£" : "$";
  return `${symbol}${plan.price}`;
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}
