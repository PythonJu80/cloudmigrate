import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

/**
 * GET /api/settings/agent - Get agent settings for tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { 
        agentApiKey: true, 
        agentConnected: true, 
        agentLastSeen: true 
      },
    });

    return NextResponse.json({
      apiKey: tenant?.agentApiKey || null,
      connected: tenant?.agentConnected || false,
      lastSeen: tenant?.agentLastSeen?.toISOString() || null,
    });
  } catch (error) {
    console.error("Get agent settings error:", error);
    return NextResponse.json({ error: "Failed to get agent settings" }, { status: 500 });
  }
}

/**
 * POST /api/settings/agent - Generate or revoke agent API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "generate") {
      // Generate a new API key
      const apiKey = `cm_${crypto.randomBytes(32).toString("hex")}`;
      
      await prisma.tenant.update({
        where: { id: session.user.tenantId },
        data: { 
          agentApiKey: apiKey,
          agentConnected: false,
          agentLastSeen: null,
        },
      });

      return NextResponse.json({ 
        success: true, 
        apiKey,
        message: "API key generated successfully" 
      });
    } else if (action === "revoke") {
      // Revoke the API key
      await prisma.tenant.update({
        where: { id: session.user.tenantId },
        data: { 
          agentApiKey: null,
          agentConnected: false,
          agentLastSeen: null,
        },
      });

      // Also delete any scan data
      await prisma.agentScan.deleteMany({
        where: { tenantId: session.user.tenantId },
      });

      return NextResponse.json({ 
        success: true, 
        message: "API key revoked" 
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Agent settings error:", error);
    return NextResponse.json({ error: "Failed to update agent settings" }, { status: 500 });
  }
}
