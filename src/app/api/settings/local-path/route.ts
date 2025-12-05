import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/settings/local-path - Get saved local path for tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { localPath: true },
    });

    return NextResponse.json({ localPath: tenant?.localPath || "" });
  } catch (error) {
    console.error("Get local path error:", error);
    return NextResponse.json({ error: "Failed to get local path" }, { status: 500 });
  }
}

/**
 * POST /api/settings/local-path - Save local path for tenant
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { localPath } = await request.json();
    
    if (!localPath || typeof localPath !== "string") {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Validate path format (basic check)
    const isValidPath = localPath.startsWith("/") || /^[A-Za-z]:\\/.test(localPath);
    if (!isValidPath) {
      return NextResponse.json({ 
        error: "Invalid path format. Use absolute path like /home/user or C:\\Users" 
      }, { status: 400 });
    }

    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: { localPath },
    });

    return NextResponse.json({ success: true, localPath });
  } catch (error) {
    console.error("Save local path error:", error);
    return NextResponse.json({ error: "Failed to save local path" }, { status: 500 });
  }
}
