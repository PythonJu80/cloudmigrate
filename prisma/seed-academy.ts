/**
 * Seed script for CloudAcademy locations and achievements
 * Run with: npx ts-node prisma/seed-academy.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Location data (migrated from hardcoded LOCATIONS array)
const LOCATIONS = [
  // Financial District - London
  {
    slug: "hsbc-london",
    name: "HSBC Tower",
    company: "HSBC",
    industry: "Banking & Finance",
    lat: 51.5045,
    lng: -0.0195,
    region: "EMEA",
    country: "UK",
    city: "London",
    difficulty: "advanced",
    icon: "🏦",
    description: "Design a multi-region, PCI-DSS compliant banking infrastructure with real-time transaction processing.",
    compliance: ["PCI-DSS", "GDPR", "FCA"],
    tags: ["finance", "global", "high-availability", "compliance-heavy"],
    isLocked: false,
  },
  {
    slug: "barclays-canary",
    name: "Barclays HQ",
    company: "Barclays",
    industry: "Banking & Finance",
    lat: 51.5054,
    lng: -0.0235,
    region: "EMEA",
    country: "UK",
    city: "London",
    difficulty: "advanced",
    icon: "🏦",
    description: "Build a secure trading platform with sub-millisecond latency and disaster recovery.",
    compliance: ["PCI-DSS", "MiFID II", "GDPR"],
    tags: ["finance", "low-latency", "trading", "disaster-recovery"],
    isLocked: false,
  },
  // Healthcare - London
  {
    slug: "nhs-london",
    name: "NHS Digital",
    company: "NHS",
    industry: "Healthcare",
    lat: 51.5194,
    lng: -0.127,
    region: "EMEA",
    country: "UK",
    city: "London",
    difficulty: "expert",
    icon: "🏥",
    description: "Architect a nationwide health records system with strict data sovereignty and HIPAA-equivalent compliance.",
    compliance: ["NHS DSPT", "GDPR", "ISO 27001"],
    tags: ["healthcare", "government", "data-sovereignty", "high-security"],
    isLocked: false,
  },
  // Tech - Silicon Valley
  {
    slug: "google-mv",
    name: "Googleplex",
    company: "Google",
    industry: "Technology",
    lat: 37.422,
    lng: -122.0841,
    region: "Americas",
    country: "USA",
    city: "Mountain View",
    difficulty: "expert",
    icon: "🔍",
    description: "Design a planet-scale search infrastructure handling billions of queries per day.",
    compliance: ["SOC 2", "ISO 27001", "CCPA"],
    tags: ["big-tech", "planet-scale", "search", "ml-infrastructure"],
    isLocked: true,
    unlockRequirements: [
      { type: "locations_completed", count: 3 }
    ],
  },
  {
    slug: "meta-menlo",
    name: "Meta HQ",
    company: "Meta",
    industry: "Social Media",
    lat: 37.4848,
    lng: -122.1484,
    region: "Americas",
    country: "USA",
    city: "Menlo Park",
    difficulty: "expert",
    icon: "📱",
    description: "Build a real-time social graph with billions of connections and instant updates.",
    compliance: ["GDPR", "CCPA", "SOC 2"],
    tags: ["social", "real-time", "graph-database", "global-scale"],
    isLocked: true,
    unlockRequirements: [
      { type: "locations_completed", count: 3 }
    ],
  },
  // E-Commerce - Seattle
  {
    slug: "amazon-seattle",
    name: "Amazon HQ",
    company: "Amazon",
    industry: "E-Commerce",
    lat: 47.6223,
    lng: -122.3364,
    region: "Americas",
    country: "USA",
    city: "Seattle",
    difficulty: "advanced",
    icon: "🛒",
    description: "Design a global e-commerce platform handling Black Friday scale traffic.",
    compliance: ["PCI-DSS", "SOC 2", "GDPR"],
    tags: ["e-commerce", "auto-scaling", "peak-traffic", "microservices"],
    isLocked: false,
  },
  // Streaming - Los Angeles
  {
    slug: "netflix-la",
    name: "Netflix HQ",
    company: "Netflix",
    industry: "Media & Streaming",
    lat: 34.0259,
    lng: -118.3965,
    region: "Americas",
    country: "USA",
    city: "Los Angeles",
    difficulty: "advanced",
    icon: "📺",
    description: "Architect a global content delivery network for 4K streaming to 200M+ subscribers.",
    compliance: ["SOC 2", "MPAA"],
    tags: ["streaming", "cdn", "video", "global-delivery"],
    isLocked: false,
  },
  // Gaming - Tokyo
  {
    slug: "nintendo-kyoto",
    name: "Nintendo HQ",
    company: "Nintendo",
    industry: "Gaming",
    lat: 34.9692,
    lng: 135.7556,
    region: "APAC",
    country: "Japan",
    city: "Kyoto",
    difficulty: "intermediate",
    icon: "🎮",
    description: "Build a low-latency multiplayer gaming infrastructure for millions of concurrent players.",
    compliance: ["APPI", "SOC 2"],
    tags: ["gaming", "multiplayer", "low-latency", "real-time"],
    isLocked: false,
  },
  // Automotive - Germany
  {
    slug: "bmw-munich",
    name: "BMW Welt",
    company: "BMW",
    industry: "Automotive",
    lat: 48.1771,
    lng: 11.5564,
    region: "EMEA",
    country: "Germany",
    city: "Munich",
    difficulty: "intermediate",
    icon: "🚗",
    description: "Design IoT infrastructure for connected vehicles with real-time telemetry.",
    compliance: ["GDPR", "ISO 27001", "TISAX"],
    tags: ["automotive", "iot", "telemetry", "connected-vehicles"],
    isLocked: false,
  },
  // Fintech - Singapore
  {
    slug: "dbs-singapore",
    name: "DBS Bank Tower",
    company: "DBS Bank",
    industry: "Banking & Finance",
    lat: 1.2789,
    lng: 103.8536,
    region: "APAC",
    country: "Singapore",
    city: "Singapore",
    difficulty: "advanced",
    icon: "🏦",
    description: "Build a digital banking platform for Southeast Asia with multi-currency support.",
    compliance: ["MAS TRM", "PCI-DSS", "PDPA"],
    tags: ["fintech", "digital-banking", "multi-currency", "apac"],
    isLocked: false,
  },
  // Logistics - Dubai
  {
    slug: "emirates-dubai",
    name: "Emirates HQ",
    company: "Emirates",
    industry: "Logistics & Aviation",
    lat: 25.2532,
    lng: 55.3657,
    region: "EMEA",
    country: "UAE",
    city: "Dubai",
    difficulty: "intermediate",
    icon: "✈️",
    description: "Design a real-time flight operations system with global coverage.",
    compliance: ["IATA", "GDPR"],
    tags: ["aviation", "logistics", "real-time", "global-operations"],
    isLocked: false,
  },
  // Retail - Paris
  {
    slug: "lvmh-paris",
    name: "LVMH Tower",
    company: "LVMH",
    industry: "Retail & Luxury",
    lat: 48.8698,
    lng: 2.3075,
    region: "EMEA",
    country: "France",
    city: "Paris",
    difficulty: "intermediate",
    icon: "👜",
    description: "Build a global luxury e-commerce platform with personalized experiences.",
    compliance: ["GDPR", "PCI-DSS"],
    tags: ["luxury", "e-commerce", "personalization", "global-retail"],
    isLocked: false,
  },
];

// Achievement definitions
const ACHIEVEMENTS = [
  // Getting Started
  {
    slug: "first_steps",
    name: "First Steps",
    description: "Complete your first challenge",
    icon: "👣",
    rarity: "common",
    category: "milestone",
    criteria: { type: "challenges_completed", value: 1 },
    pointsReward: 50,
    xpReward: 100,
  },
  {
    slug: "getting_started",
    name: "Getting Started",
    description: "Complete your first scenario",
    icon: "🚀",
    rarity: "common",
    category: "milestone",
    criteria: { type: "scenarios_completed", value: 1 },
    pointsReward: 100,
    xpReward: 200,
  },
  {
    slug: "world_traveler",
    name: "World Traveler",
    description: "Visit 5 different locations",
    icon: "🌍",
    rarity: "uncommon",
    category: "exploration",
    criteria: { type: "locations_visited", value: 5 },
    pointsReward: 150,
    xpReward: 300,
  },
  {
    slug: "globe_trotter",
    name: "Globe Trotter",
    description: "Complete challenges in all 3 regions",
    icon: "✈️",
    rarity: "rare",
    category: "exploration",
    criteria: { type: "regions_completed", value: 3 },
    pointsReward: 500,
    xpReward: 1000,
  },
  
  // Mastery
  {
    slug: "perfect_score",
    name: "Perfect Score",
    description: "Complete a challenge with 100% score",
    icon: "💯",
    rarity: "uncommon",
    category: "mastery",
    criteria: { type: "perfect_challenge", value: 1 },
    pointsReward: 200,
    xpReward: 400,
  },
  {
    slug: "no_hints_needed",
    name: "No Hints Needed",
    description: "Complete a scenario without using any hints",
    icon: "🧠",
    rarity: "rare",
    category: "mastery",
    criteria: { type: "scenario_no_hints", value: 1 },
    pointsReward: 300,
    xpReward: 600,
  },
  {
    slug: "expert_architect",
    name: "Expert Architect",
    description: "Complete an expert-level scenario",
    icon: "🏆",
    rarity: "epic",
    category: "mastery",
    criteria: { type: "expert_scenario_completed", value: 1 },
    pointsReward: 500,
    xpReward: 1000,
  },
  
  // Speed
  {
    slug: "speed_demon",
    name: "Speed Demon",
    description: "Complete a challenge in under 5 minutes",
    icon: "⚡",
    rarity: "uncommon",
    category: "speed",
    criteria: { type: "challenge_under_minutes", value: 5 },
    pointsReward: 150,
    xpReward: 300,
  },
  {
    slug: "lightning_fast",
    name: "Lightning Fast",
    description: "Complete a scenario in under 30 minutes",
    icon: "🏃",
    rarity: "rare",
    category: "speed",
    criteria: { type: "scenario_under_minutes", value: 30 },
    pointsReward: 400,
    xpReward: 800,
  },
  
  // Streaks
  {
    slug: "on_fire",
    name: "On Fire",
    description: "Maintain a 7-day streak",
    icon: "🔥",
    rarity: "uncommon",
    category: "dedication",
    criteria: { type: "streak_days", value: 7 },
    pointsReward: 200,
    xpReward: 400,
  },
  {
    slug: "unstoppable",
    name: "Unstoppable",
    description: "Maintain a 30-day streak",
    icon: "💪",
    rarity: "epic",
    category: "dedication",
    criteria: { type: "streak_days", value: 30 },
    pointsReward: 1000,
    xpReward: 2000,
  },
  
  // Social/Team
  {
    slug: "team_player",
    name: "Team Player",
    description: "Join a team",
    icon: "🤝",
    rarity: "common",
    category: "social",
    criteria: { type: "team_joined", value: 1 },
    pointsReward: 50,
    xpReward: 100,
  },
  {
    slug: "team_leader",
    name: "Team Leader",
    description: "Create a team",
    icon: "👑",
    rarity: "uncommon",
    category: "social",
    criteria: { type: "team_created", value: 1 },
    pointsReward: 100,
    xpReward: 200,
  },
  {
    slug: "team_champion",
    name: "Team Champion",
    description: "Complete a team challenge",
    icon: "🏅",
    rarity: "rare",
    category: "social",
    criteria: { type: "team_challenge_completed", value: 1 },
    pointsReward: 300,
    xpReward: 600,
  },
  
  // Industry Mastery
  {
    slug: "finance_expert",
    name: "Finance Expert",
    description: "Complete all Banking & Finance locations",
    icon: "💰",
    rarity: "epic",
    category: "industry",
    criteria: { type: "industry_completed", industry: "Banking & Finance" },
    pointsReward: 1000,
    xpReward: 2000,
  },
  {
    slug: "tech_titan",
    name: "Tech Titan",
    description: "Complete all Technology locations",
    icon: "💻",
    rarity: "epic",
    category: "industry",
    criteria: { type: "industry_completed", industry: "Technology" },
    pointsReward: 1000,
    xpReward: 2000,
  },
  
  // Secret achievements
  {
    slug: "night_owl",
    name: "Night Owl",
    description: "Complete a challenge between midnight and 5am",
    icon: "🦉",
    rarity: "rare",
    category: "secret",
    criteria: { type: "time_of_day", startHour: 0, endHour: 5 },
    pointsReward: 200,
    xpReward: 400,
    isSecret: true,
  },
  {
    slug: "completionist",
    name: "Completionist",
    description: "Complete every location on the map",
    icon: "🌟",
    rarity: "legendary",
    category: "milestone",
    criteria: { type: "all_locations_completed" },
    pointsReward: 5000,
    xpReward: 10000,
  },
];

async function main() {
  console.log("🌍 Seeding CloudAcademy locations...");
  
  for (const location of LOCATIONS) {
    await prisma.academyLocation.upsert({
      where: { slug: location.slug },
      update: {
        name: location.name,
        company: location.company,
        industry: location.industry,
        lat: location.lat,
        lng: location.lng,
        region: location.region,
        country: location.country,
        city: location.city,
        difficulty: location.difficulty,
        icon: location.icon,
        description: location.description,
        compliance: location.compliance,
        tags: location.tags,
        isLocked: location.isLocked,
        unlockRequirements: location.unlockRequirements || [],
      },
      create: {
        slug: location.slug,
        name: location.name,
        company: location.company,
        industry: location.industry,
        lat: location.lat,
        lng: location.lng,
        region: location.region,
        country: location.country,
        city: location.city,
        difficulty: location.difficulty,
        icon: location.icon,
        description: location.description,
        compliance: location.compliance,
        tags: location.tags,
        isLocked: location.isLocked,
        unlockRequirements: location.unlockRequirements || [],
      },
    });
    console.log(`  ✓ ${location.icon} ${location.company} (${location.slug})`);
  }
  
  console.log("\n🏆 Seeding achievements...");
  
  for (const achievement of ACHIEVEMENTS) {
    await prisma.academyAchievement.upsert({
      where: { slug: achievement.slug },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        category: achievement.category,
        criteria: achievement.criteria,
        pointsReward: achievement.pointsReward,
        xpReward: achievement.xpReward,
        isSecret: achievement.isSecret || false,
      },
      create: {
        slug: achievement.slug,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        category: achievement.category,
        criteria: achievement.criteria,
        pointsReward: achievement.pointsReward,
        xpReward: achievement.xpReward,
        isSecret: achievement.isSecret || false,
      },
    });
    console.log(`  ✓ ${achievement.icon} ${achievement.name}`);
  }
  
  console.log("\n✅ CloudAcademy seed complete!");
  console.log(`   - ${LOCATIONS.length} locations`);
  console.log(`   - ${ACHIEVEMENTS.length} achievements`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
