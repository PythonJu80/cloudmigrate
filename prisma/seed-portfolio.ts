/**
 * Seed script for Example Portfolio with DYNAMIC layout
 * Container sizes are calculated based on their children
 * Run with: npx tsx prisma/seed-portfolio.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// DYNAMIC LAYOUT ENGINE - HIERARCHY BASED
// Each node has EXCLUSIVE padding - no overlaps possible
// Subnets size to fit node bounding boxes
// VPC sizes to fit subnet bounding boxes
// ============================================
interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  parentId?: string;
  width?: number;
  height?: number;
}

const LAYOUT_CONFIG = {
  // NODE LEVEL - each node has exclusive padding
  nodeWidth: 100,
  nodeHeight: 80,
  nodePadding: 20,             // EXCLUSIVE - nothing can enter this space around each node
  
  // SUBNET LEVEL
  subnetPadding: 25,           // Padding inside subnet edges
  subnetHeaderHeight: 30,      // Space for label
  subnetMinWidth: 160,
  subnetMinHeight: 140,
  
  // VPC LEVEL
  vpcPadding: 25,
  vpcHeaderHeight: 25,
  subnetGapX: 30,              // Gap between AZ columns
  subnetGapY: 20,              // Gap between public/private rows
};

/**
 * AWS Service Tiers - same-tier = horizontal, different tier = vertical
 */
const SERVICE_TIERS: Record<string, number> = {
  "internet-gateway": 1, "nat-gateway": 1, "vpn-gateway": 1, "bastion": 1,
  "ec2": 2, "ecs": 2, "fargate": 2, "eks": 2, "lambda": 2,
  "elasticache": 3, "redis": 3,
  "rds": 4, "aurora": 4, "dynamodb": 4,
};

function getServiceTier(serviceId: string): number {
  return SERVICE_TIERS[serviceId] || 2;
}

function getNodeBoundingBox() {
  return {
    width: LAYOUT_CONFIG.nodeWidth + (LAYOUT_CONFIG.nodePadding * 2),
    height: LAYOUT_CONFIG.nodeHeight + (LAYOUT_CONFIG.nodePadding * 2),
  };
}

function layoutSubnet(subnet: DiagramNode, children: DiagramNode[]): void {
  const cfg = LAYOUT_CONFIG;
  
  if (children.length === 0) {
    subnet.width = cfg.subnetMinWidth;
    subnet.height = cfg.subnetMinHeight;
    return;
  }

  const nodeBB = getNodeBoundingBox();
  
  // Group nodes by tier
  const tierGroups = new Map<number, DiagramNode[]>();
  children.forEach(node => {
    const serviceId = node.data.serviceId as string || "";
    const tier = getServiceTier(serviceId);
    if (!tierGroups.has(tier)) tierGroups.set(tier, []);
    tierGroups.get(tier)!.push(node);
  });

  // Sort tiers top to bottom
  const sortedTiers = Array.from(tierGroups.keys()).sort((a, b) => a - b);
  
  // Max nodes in any tier determines width
  const maxNodesInTier = Math.max(...Array.from(tierGroups.values()).map(g => g.length));
  const requiredWidth = cfg.subnetPadding + (maxNodesInTier * nodeBB.width) + cfg.subnetPadding;
  subnet.width = Math.max(requiredWidth, cfg.subnetMinWidth);

  // Position nodes: same tier = horizontal, different tier = vertical
  let currentY = cfg.subnetHeaderHeight + cfg.subnetPadding;
  
  sortedTiers.forEach(tier => {
    const nodesInTier = tierGroups.get(tier)!;
    const tierWidth = nodesInTier.length * nodeBB.width;
    const startX = (subnet.width! - tierWidth) / 2;
    
    nodesInTier.forEach((node, index) => {
      node.position.x = startX + (index * nodeBB.width) + cfg.nodePadding;
      node.position.y = currentY + cfg.nodePadding;
    });
    
    currentY += nodeBB.height;
  });

  subnet.height = Math.max(currentY + cfg.subnetPadding, cfg.subnetMinHeight);
}

function layoutVPC(vpc: DiagramNode, publicSubnets: DiagramNode[], privateSubnets: DiagramNode[]): void {
  const cfg = LAYOUT_CONFIG;
  const albSpace = cfg.vpcHeaderHeight + 80;

  // Position public subnets
  let currentX = cfg.vpcPadding;
  let maxPublicHeight = 0;
  
  publicSubnets.forEach((subnet) => {
    subnet.position.x = currentX;
    subnet.position.y = albSpace;
    currentX += (subnet.width || cfg.subnetMinWidth) + cfg.subnetGapX;
    maxPublicHeight = Math.max(maxPublicHeight, subnet.height || cfg.subnetMinHeight);
  });

  // Position private subnets below
  currentX = cfg.vpcPadding;
  const privateRowY = albSpace + maxPublicHeight + cfg.subnetGapY;
  let maxPrivateHeight = 0;
  
  privateSubnets.forEach((subnet) => {
    subnet.position.x = currentX;
    subnet.position.y = privateRowY;
    currentX += (subnet.width || cfg.subnetMinWidth) + cfg.subnetGapX;
    maxPrivateHeight = Math.max(maxPrivateHeight, subnet.height || cfg.subnetMinHeight);
  });

  // Normalize row heights
  publicSubnets.forEach(s => s.height = maxPublicHeight);
  privateSubnets.forEach(s => s.height = maxPrivateHeight);

  // Calculate VPC size
  const allSubnets = [...publicSubnets, ...privateSubnets];
  if (allSubnets.length > 0) {
    vpc.width = Math.max(...allSubnets.map(s => s.position.x + (s.width || cfg.subnetMinWidth))) + cfg.vpcPadding;
    vpc.height = Math.max(...allSubnets.map(s => s.position.y + (s.height || cfg.subnetMinHeight))) + cfg.vpcPadding;
  }
}

function applyDynamicLayout(nodes: DiagramNode[]): DiagramNode[] {
  const result = JSON.parse(JSON.stringify(nodes)) as DiagramNode[];
  const cfg = LAYOUT_CONFIG;

  const vpc = result.find(n => n.type === "vpc");
  if (!vpc) return result;

  const subnets = result.filter(n => n.type === "subnet" && n.parentId === vpc.id);
  const publicSubnets = subnets.filter(s => s.data.subnetType === "public");
  const privateSubnets = subnets.filter(s => s.data.subnetType === "private");

  // STEP 1: Layout each subnet (nodes determine subnet size)
  [...publicSubnets, ...privateSubnets].forEach(subnet => {
    const children = result.filter(n => n.parentId === subnet.id && n.type === "awsResource");
    layoutSubnet(subnet, children);
  });

  // STEP 2: Layout VPC (subnets determine VPC size)
  layoutVPC(vpc, publicSubnets, privateSubnets);

  // STEP 3: Center ALB
  const alb = result.find(n => n.parentId === vpc.id && n.data.serviceId === "alb");
  if (alb && vpc.width) {
    alb.position.x = (vpc.width - cfg.nodeWidth) / 2;
    alb.position.y = cfg.vpcHeaderHeight + 10;
  }

  // STEP 4: Position external services
  const externalServices = result.filter(n => !n.parentId && n.type === "awsResource" && n.position.x > 500);
  if (externalServices.length > 0 && vpc.width) {
    const externalX = vpc.position.x + vpc.width + 30;
    const nodeBB = getNodeBoundingBox();
    externalServices.forEach((service, index) => {
      service.position.x = externalX;
      service.position.y = vpc.position.y + 50 + (index * (nodeBB.height + 20));
    });
  }

  return result;
}

// ============================================
// RAW DIAGRAM DATA (positions will be calculated)
// ============================================
const RAW_DIAGRAM = {
  nodes: [
    // Edge services (outside VPC) - positions are approximate, will be kept
    { id: "route53", type: "awsResource", position: { x: 80, y: 20 }, data: { serviceId: "route53", label: "Route 53", sublabel: "DNS", color: "#8C4FFF" } },
    { id: "cloudfront", type: "awsResource", position: { x: 230, y: 20 }, data: { serviceId: "cloudfront", label: "CloudFront", sublabel: "CDN", color: "#8C4FFF" } },
    { id: "s3-static", type: "awsResource", position: { x: 380, y: 20 }, data: { serviceId: "s3", label: "S3", sublabel: "Static Assets", color: "#7AA116" } },
    { id: "waf", type: "awsResource", position: { x: 530, y: 20 }, data: { serviceId: "waf", label: "WAF", sublabel: "Firewall", color: "#DD344C" } },

    // VPC - size will be calculated
    { id: "vpc", type: "vpc", position: { x: 50, y: 130 }, data: { label: "Production VPC", sublabel: "10.0.0.0/16" } },

    // Subnets - sizes will be calculated based on children
    { id: "public-1", type: "subnet", position: { x: 0, y: 0 }, parentId: "vpc", data: { label: "Public AZ-1", subnetType: "public" } },
    { id: "public-2", type: "subnet", position: { x: 0, y: 0 }, parentId: "vpc", data: { label: "Public AZ-2", subnetType: "public" } },
    { id: "private-1", type: "subnet", position: { x: 0, y: 0 }, parentId: "vpc", data: { label: "Private AZ-1", subnetType: "private" } },
    { id: "private-2", type: "subnet", position: { x: 0, y: 0 }, parentId: "vpc", data: { label: "Private AZ-2", subnetType: "private" } },

    // ALB - will be centered
    { id: "alb", type: "awsResource", position: { x: 0, y: 0 }, parentId: "vpc", data: { serviceId: "alb", label: "ALB", sublabel: "Internet-facing", color: "#8C4FFF" } },

    // Public subnet contents - NOW 2 NODES EACH (testing dynamic growth)
    { id: "igw-1", type: "awsResource", position: { x: 0, y: 0 }, parentId: "public-1", data: { serviceId: "internet-gateway", label: "IGW", sublabel: "Internet", color: "#8C4FFF" } },
    { id: "nat-1", type: "awsResource", position: { x: 0, y: 0 }, parentId: "public-1", data: { serviceId: "nat-gateway", label: "NAT GW", sublabel: "AZ-1", color: "#8C4FFF" } },
    { id: "nat-2", type: "awsResource", position: { x: 0, y: 0 }, parentId: "public-2", data: { serviceId: "nat-gateway", label: "NAT GW", sublabel: "AZ-2", color: "#8C4FFF" } },

    // Private-1 contents (3 nodes)
    { id: "fargate-1", type: "awsResource", position: { x: 0, y: 0 }, parentId: "private-1", data: { serviceId: "fargate", label: "Fargate", sublabel: "Web App", color: "#ED7100" } },
    { id: "elasticache-1", type: "awsResource", position: { x: 0, y: 0 }, parentId: "private-1", data: { serviceId: "elasticache", label: "ElastiCache", sublabel: "Redis", color: "#C925D1" } },
    { id: "aurora-primary", type: "awsResource", position: { x: 0, y: 0 }, parentId: "private-1", data: { serviceId: "aurora", label: "Aurora Primary", sublabel: "PostgreSQL", color: "#3B48CC" } },

    // Private-2 contents - NOW 3 NODES (testing dynamic growth)
    { id: "fargate-2", type: "awsResource", position: { x: 0, y: 0 }, parentId: "private-2", data: { serviceId: "fargate", label: "Fargate", sublabel: "Web App", color: "#ED7100" } },
    { id: "elasticache-2", type: "awsResource", position: { x: 0, y: 0 }, parentId: "private-2", data: { serviceId: "elasticache", label: "ElastiCache", sublabel: "Redis", color: "#C925D1" } },
    { id: "aurora-replica", type: "awsResource", position: { x: 0, y: 0 }, parentId: "private-2", data: { serviceId: "aurora", label: "Aurora Replica", sublabel: "Read Replica", color: "#3B48CC" } },

    // External services (will be positioned to right of VPC)
    { id: "kms", type: "awsResource", position: { x: 900, y: 0 }, data: { serviceId: "kms", label: "KMS", sublabel: "Encryption", color: "#DD344C" } },
    { id: "secrets", type: "awsResource", position: { x: 900, y: 0 }, data: { serviceId: "secrets-manager", label: "Secrets Mgr", sublabel: "Credentials", color: "#DD344C" } },
    { id: "cloudwatch", type: "awsResource", position: { x: 900, y: 0 }, data: { serviceId: "cloudwatch", label: "CloudWatch", sublabel: "Monitoring", color: "#E7157B" } },
  ],
  edges: [
    { id: "e1", source: "route53", target: "cloudfront" },
    { id: "e2", source: "cloudfront", target: "s3-static" },
    { id: "e3", source: "cloudfront", target: "waf" },
    { id: "e4", source: "waf", target: "alb" },
    { id: "e5", source: "alb", target: "igw-1" },
    { id: "e6", source: "igw-1", target: "nat-1" },
    { id: "e7", source: "alb", target: "nat-2" },
    { id: "e8", source: "nat-1", target: "fargate-1" },
    { id: "e9", source: "nat-2", target: "fargate-2" },
    { id: "e10", source: "fargate-1", target: "elasticache-1" },
    { id: "e11", source: "fargate-2", target: "elasticache-2" },
    { id: "e12", source: "fargate-1", target: "aurora-primary" },
    { id: "e13", source: "fargate-2", target: "aurora-replica" },
    { id: "e14", source: "aurora-primary", target: "aurora-replica" },
    { id: "e15", source: "aurora-primary", target: "kms" },
    { id: "e16", source: "fargate-1", target: "secrets" },
    { id: "e17", source: "fargate-1", target: "cloudwatch" },
  ],
};

// Apply dynamic layout to get final diagram
const EXAMPLE_DIAGRAM = {
  nodes: applyDynamicLayout(RAW_DIAGRAM.nodes as DiagramNode[]),
  edges: RAW_DIAGRAM.edges,
};

const EXAMPLE_PORTFOLIO = {
  title: "High-Availability E-Commerce Platform",
  description: "A scalable, fault-tolerant architecture for a global e-commerce platform handling millions of transactions.",
  status: "ready",
  type: "example",
  isExample: true,
  companyName: "TechMart",
  industry: "E-Commerce & Retail",
  locationName: "TechMart HQ",
  businessUseCase: "TechMart needed a cloud architecture capable of handling 10x traffic spikes during sales events while maintaining sub-second response times. The platform processes 50,000 orders per hour at peak and serves customers across 3 continents.",
  problemStatement: "Design a highly available e-commerce platform that can scale automatically during peak traffic, maintain PCI-DSS compliance for payment processing, and provide disaster recovery with RPO < 1 hour and RTO < 15 minutes.",
  solutionSummary: "Multi-AZ deployment using ECS Fargate for containerized microservices, Aurora PostgreSQL with read replicas for database tier, and CloudFront CDN for global content delivery. ElastiCache Redis handles session management and caching. All data encrypted at rest and in transit using KMS-managed keys.",
  awsServices: [
    "VPC", "ALB", "ECS Fargate", "Aurora PostgreSQL", "ElastiCache",
    "S3", "CloudFront", "Route 53", "WAF", "KMS", "Secrets Manager", "CloudWatch"
  ],
  keyDecisions: [
    "Multi-AZ deployment for high availability with automatic failover",
    "Fargate over EC2 for reduced operational overhead and automatic scaling",
    "Aurora PostgreSQL for ACID compliance and automatic storage scaling",
    "ElastiCache Redis for sub-millisecond session lookups and query caching",
    "CloudFront with S3 origin for static assets to reduce origin load",
    "WAF rules to protect against OWASP Top 10 vulnerabilities",
  ],
  complianceAchieved: ["PCI-DSS", "SOC 2", "GDPR"],
  challengeScore: 920,
  maxScore: 1000,
  completionTimeMinutes: 45,
  architectureDiagram: EXAMPLE_DIAGRAM,
};

async function main() {
  console.log("📋 Seeding Example Portfolio...");

  // Delete existing example portfolio
  await prisma.$executeRaw`DELETE FROM "AcademyPortfolio" WHERE "isExample" = true`;
  console.log("  ✓ Cleared existing example portfolio");

  // Insert new example portfolio
  await prisma.$executeRaw`
    INSERT INTO "AcademyPortfolio" (
      id, title, description, status, type, "isExample",
      "companyName", industry, "locationName",
      "businessUseCase", "problemStatement", "solutionSummary",
      "awsServices", "keyDecisions", "complianceAchieved",
      "challengeScore", "maxScore", "completionTimeMinutes",
      "architectureDiagram", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      ${EXAMPLE_PORTFOLIO.title},
      ${EXAMPLE_PORTFOLIO.description},
      ${EXAMPLE_PORTFOLIO.status},
      ${EXAMPLE_PORTFOLIO.type},
      ${EXAMPLE_PORTFOLIO.isExample},
      ${EXAMPLE_PORTFOLIO.companyName},
      ${EXAMPLE_PORTFOLIO.industry},
      ${EXAMPLE_PORTFOLIO.locationName},
      ${EXAMPLE_PORTFOLIO.businessUseCase},
      ${EXAMPLE_PORTFOLIO.problemStatement},
      ${EXAMPLE_PORTFOLIO.solutionSummary},
      ${JSON.stringify(EXAMPLE_PORTFOLIO.awsServices)}::jsonb,
      ${JSON.stringify(EXAMPLE_PORTFOLIO.keyDecisions)}::jsonb,
      ${JSON.stringify(EXAMPLE_PORTFOLIO.complianceAchieved)}::jsonb,
      ${EXAMPLE_PORTFOLIO.challengeScore},
      ${EXAMPLE_PORTFOLIO.maxScore},
      ${EXAMPLE_PORTFOLIO.completionTimeMinutes},
      ${JSON.stringify(EXAMPLE_PORTFOLIO.architectureDiagram)}::jsonb,
      NOW(),
      NOW()
    )
  `;

  console.log("  ✓ Created example portfolio: " + EXAMPLE_PORTFOLIO.title);
  console.log("\n✅ Portfolio seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
