import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TenantGraphClient } from "@/lib/neo4j";
import { checkPlanLimits, trackGraphQuery } from "@/lib/graph-usage";

/**
 * GET /api/graph/nodes - List nodes by label
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const label = searchParams.get("label") || "Node";

    // Check plan limits
    const limitCheck = await checkPlanLimits(session.user.tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ 
        error: limitCheck.reason,
        upgradeRequired: true,
      }, { status: 429 });
    }

    const client = await TenantGraphClient.create(session.user.tenantId);
    const nodes = await client.findNodes(label);

    // Track the query
    await trackGraphQuery(session.user.tenantId, {
      nodesProcessed: nodes.length,
    });

    return NextResponse.json({ nodes });
  } catch (error) {
    console.error("List nodes error:", error);
    return NextResponse.json({ error: "Failed to list nodes" }, { status: 500 });
  }
}

/**
 * POST /api/graph/nodes - Create a new node
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { label, properties } = await request.json();
    if (!label) {
      return NextResponse.json({ error: "Label required" }, { status: 400 });
    }

    const client = await TenantGraphClient.create(session.user.tenantId);
    // Check plan limits
    const limitCheck = await checkPlanLimits(session.user.tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ 
        error: limitCheck.reason,
        upgradeRequired: true,
      }, { status: 429 });
    }

    const node = await client.createNode(label, {
      id: crypto.randomUUID(),
      ...properties,
      createdAt: new Date().toISOString(),
    });

    // Track the mutation
    await trackGraphQuery(session.user.tenantId, {
      nodesProcessed: 1,
    });

    return NextResponse.json({ 
      success: true,
      node: node?.properties,
    });
  } catch (error) {
    console.error("Create node error:", error);
    return NextResponse.json({ error: "Failed to create node" }, { status: 500 });
  }
}
