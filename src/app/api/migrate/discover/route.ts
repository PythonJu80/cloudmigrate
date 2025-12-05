import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Types matching the Go agent's discovery output
interface DiscoveredHost {
  ip: string;
  hostname: string;
  mac?: string;
  status: "online" | "offline";
  os?: string;
  osVersion?: string;
  openPorts: PortInfo[];
  services: ServiceInfo[];
  category: string;
  awsTarget?: string;
  responseTimeMs: number;
  lastSeen: string;
  metadata?: Record<string, string>;
}

interface PortInfo {
  port: number;
  protocol: string;
  state: string;
  service?: string;
  banner?: string;
}

interface ServiceInfo {
  name: string;
  type: string;
  version?: string;
  port: number;
  product?: string;
  awsTarget: string;
  confidence: number;
}

interface DiscoveryResult {
  scanId: string;
  networkCidr: string;
  startedAt: string;
  completedAt: string;
  hosts: DiscoveredHost[];
  summary: {
    totalHosts: number;
    onlineHosts: number;
    byCategory: Record<string, number>;
    byOs: Record<string, number>;
  };
}

// POST - Receive discovery results from agent
export async function POST(req: NextRequest) {
  try {
    // Check for agent API key authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);
    
    // Find tenant by agent API key
    const tenant = await prisma.tenant.findFirst({
      where: { agentApiKey: apiKey },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const result: DiscoveryResult = await req.json();

    // Store discovery scan
    const scan = await prisma.discoveryScan.create({
      data: {
        tenantId: tenant.id,
        scanId: result.scanId,
        networkCidr: result.networkCidr,
        startedAt: new Date(result.startedAt),
        completedAt: new Date(result.completedAt),
        hostsFound: result.summary.onlineHosts,
        summary: JSON.stringify(result.summary),
      },
    });

    // Store discovered hosts
    for (const host of result.hosts) {
      await prisma.discoveredHost.upsert({
        where: {
          tenantId_ip: {
            tenantId: tenant.id,
            ip: host.ip,
          },
        },
        update: {
          hostname: host.hostname || null,
          status: host.status,
          os: host.os || null,
          osVersion: host.osVersion || null,
          category: host.category,
          awsTarget: host.awsTarget || null,
          openPorts: JSON.stringify(host.openPorts),
          services: JSON.stringify(host.services),
          responseTimeMs: host.responseTimeMs,
          lastSeen: new Date(host.lastSeen),
          metadata: host.metadata ? JSON.stringify(host.metadata) : null,
          scanId: scan.id,
        },
        create: {
          tenantId: tenant.id,
          ip: host.ip,
          hostname: host.hostname || null,
          status: host.status,
          os: host.os || null,
          osVersion: host.osVersion || null,
          category: host.category,
          awsTarget: host.awsTarget || null,
          openPorts: JSON.stringify(host.openPorts),
          services: JSON.stringify(host.services),
          responseTimeMs: host.responseTimeMs,
          lastSeen: new Date(host.lastSeen),
          metadata: host.metadata ? JSON.stringify(host.metadata) : null,
          scanId: scan.id,
        },
      });
    }

    // Update tenant's last scan time
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        agentLastSeen: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      scanId: scan.id,
      hostsProcessed: result.hosts.length,
    });
  } catch (error) {
    console.error("Error processing discovery results:", error);
    return NextResponse.json(
      { error: "Failed to process discovery results" },
      { status: 500 }
    );
  }
}

// GET - Get discovery results for the current tenant
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Build where clause
    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    // Get discovered hosts
    const hosts = await prisma.discoveredHost.findMany({
      where,
      orderBy: { lastSeen: "desc" },
      take: limit,
    });

    // Get latest scan
    const latestScan = await prisma.discoveryScan.findFirst({
      where: { tenantId: session.user.tenantId },
      orderBy: { completedAt: "desc" },
    });

    // Get summary stats
    const stats = await prisma.discoveredHost.groupBy({
      by: ["category"],
      where: { tenantId: session.user.tenantId, status: "online" },
      _count: { id: true },
    });

    const byCategory: Record<string, number> = {};
    for (const stat of stats) {
      byCategory[stat.category] = stat._count.id;
    }

    // Parse JSON fields for response
    const parsedHosts = hosts.map((host: any) => ({
      ...host,
      openPorts: JSON.parse(host.openPorts || "[]"),
      services: JSON.parse(host.services || "[]"),
      metadata: host.metadata ? JSON.parse(host.metadata) : null,
    }));

    return NextResponse.json({
      hosts: parsedHosts,
      latestScan: latestScan
        ? {
            id: latestScan.id,
            scanId: latestScan.scanId,
            networkCidr: latestScan.networkCidr,
            completedAt: latestScan.completedAt,
            hostsFound: latestScan.hostsFound,
            summary: JSON.parse(latestScan.summary || "{}"),
          }
        : null,
      summary: {
        totalHosts: hosts.length,
        onlineHosts: hosts.filter((h: any) => h.status === "online").length,
        byCategory,
      },
    });
  } catch (error) {
    console.error("Error fetching discovery results:", error);
    return NextResponse.json(
      { error: "Failed to fetch discovery results" },
      { status: 500 }
    );
  }
}
