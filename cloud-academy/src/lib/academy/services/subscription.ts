/**
 * Subscription & Feature Access Service
 * Handles tier checks and feature gating
 */

export type SubscriptionTier = "free" | "learner" | "pro" | "team";

export interface TierFeatures {
  canStartChallenges: boolean;
  hasAiAccess: boolean;
  hasNeo4jAccess: boolean;
  hasTeamAccess: boolean;
  canCreateCustomScenarios: boolean;
  canExportReports: boolean;
  hasApiAccess: boolean;
}

/**
 * Get features available for a subscription tier
 */
export function getTierFeatures(tier: SubscriptionTier): TierFeatures {
  switch (tier) {
    case "free":
      return {
        canStartChallenges: false,
        hasAiAccess: false,
        hasNeo4jAccess: false,
        hasTeamAccess: false,
        canCreateCustomScenarios: false,
        canExportReports: false,
        hasApiAccess: false,
      };
    case "learner":
      return {
        canStartChallenges: true,
        hasAiAccess: true,
        hasNeo4jAccess: false,
        hasTeamAccess: false,
        canCreateCustomScenarios: false,
        canExportReports: false,
        hasApiAccess: false,
      };
    case "pro":
      return {
        canStartChallenges: true,
        hasAiAccess: true,
        hasNeo4jAccess: true,
        hasTeamAccess: false,
        canCreateCustomScenarios: true,
        canExportReports: true,
        hasApiAccess: true,
      };
    case "team":
      return {
        canStartChallenges: true,
        hasAiAccess: true,
        hasNeo4jAccess: true,
        hasTeamAccess: true,
        canCreateCustomScenarios: true,
        canExportReports: true,
        hasApiAccess: true,
      };
    default:
      return getTierFeatures("free");
  }
}

/**
 * Check if a user can perform a specific action
 */
export function canPerformAction(
  tier: SubscriptionTier,
  action: keyof TierFeatures
): boolean {
  const features = getTierFeatures(tier);
  return features[action];
}

/**
 * Get upgrade message for a blocked feature
 */
export function getUpgradeMessage(action: keyof TierFeatures): {
  title: string;
  description: string;
  requiredTier: SubscriptionTier;
} {
  switch (action) {
    case "canStartChallenges":
      return {
        title: "Upgrade to Start Challenges",
        description: "Start your learning journey with unlimited challenges, AI coaching, and progress tracking.",
        requiredTier: "learner",
      };
    case "hasAiAccess":
      return {
        title: "Upgrade for AI Coaching",
        description: "Get personalized AI feedback on your solutions and real-time coaching.",
        requiredTier: "learner",
      };
    case "hasNeo4jAccess":
      return {
        title: "Upgrade for Knowledge Graph",
        description: "Access the Neo4j knowledge graph for advanced AWS service relationships and insights.",
        requiredTier: "pro",
      };
    case "canCreateCustomScenarios":
      return {
        title: "Upgrade for Custom Scenarios",
        description: "Create your own scenarios tailored to your learning goals.",
        requiredTier: "pro",
      };
    case "hasTeamAccess":
      return {
        title: "Upgrade to Team Plan",
        description: "Train your team together with shared progress, admin controls, and team analytics.",
        requiredTier: "team",
      };
    default:
      return {
        title: "Upgrade Required",
        description: "This feature requires a paid subscription.",
        requiredTier: "learner",
      };
  }
}

/**
 * Tier display info
 */
export const TIER_INFO: Record<SubscriptionTier, { name: string; color: string; price: string }> = {
  free: { name: "Free", color: "text-muted-foreground", price: "$0" },
  learner: { name: "Learner", color: "text-cyan-400", price: "$19/mo" },
  pro: { name: "Pro", color: "text-purple-400", price: "$49/mo" },
  team: { name: "Team", color: "text-amber-400", price: "$29/user/mo" },
};
