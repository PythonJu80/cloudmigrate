import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setSecret, getSecretStatus } from "@/lib/secrets";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can set API keys
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { apiKey } = await request.json();
    if (!apiKey || !apiKey.startsWith("sk-")) {
      return NextResponse.json({ error: "Invalid API key format" }, { status: 400 });
    }

    // Store encrypted in secrets table
    await setSecret(session.user.tenantId, "OPENAI_API_KEY", apiKey);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        action: "UPDATE_OPENAI_KEY",
        resource: "secret",
        details: "OpenAI API key updated (encrypted)",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save OpenAI key:", error);
    return NextResponse.json({ error: "Failed to save API key" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getSecretStatus(session.user.tenantId, "OPENAI_API_KEY");

    return NextResponse.json({
      hasKey: status.exists,
      maskedKey: status.masked,
    });
  } catch (error) {
    console.error("Failed to get OpenAI key status:", error);
    return NextResponse.json({ error: "Failed to get key status" }, { status: 500 });
  }
}
