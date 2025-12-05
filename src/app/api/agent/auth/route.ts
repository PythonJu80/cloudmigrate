import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/agent/auth - Authenticate agent with API key
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const apiKey = authHeader.slice(7);
    
    // Find tenant by agent API key
    const tenant = await prisma.tenant.findFirst({
      where: { agentApiKey: apiKey },
      select: { id: true, name: true, plan: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      tenantName: tenant.name,
      plan: tenant.plan,
    });
  } catch (error) {
    console.error("Agent auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
