import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch current AWS config for tenant
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        awsRegion: true,
        awsRoleArn: true,
        awsExternalId: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Return config (secrets are stored separately or masked)
    return NextResponse.json({
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ? "••••" + process.env.AWS_ACCESS_KEY_ID.slice(-4) : "",
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? "••••••••" : "",
      awsRegion: tenant.awsRegion || process.env.AWS_REGION || "us-east-1",
      awsRoleArn: tenant.awsRoleArn || "",
      awsExternalId: tenant.awsExternalId || "",
    });
  } catch (error) {
    console.error("Error fetching config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

// POST - Save AWS config for tenant
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can update configuration" },
        { status: 403 }
      );
    }

    const { awsRegion, awsRoleArn, awsExternalId } = await req.json();

    // Update tenant config
    const tenant = await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        awsRegion: awsRegion || "us-east-1",
        awsRoleArn: awsRoleArn || null,
        awsExternalId: awsExternalId || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        action: "CONFIG_UPDATED",
        resource: "aws_config",
        details: JSON.stringify({ awsRegion, hasRoleArn: !!awsRoleArn }),
      },
    });

    return NextResponse.json({
      message: "Configuration saved successfully",
      config: {
        awsRegion: tenant.awsRegion,
        awsRoleArn: tenant.awsRoleArn,
        awsExternalId: tenant.awsExternalId,
      },
    });
  } catch (error) {
    console.error("Error saving config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
