import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/billing/reset - Reset plan to FREE (dev only)
 */
export async function POST() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        plan: "FREE",
        stripeSubId: null,
      },
    });

    return NextResponse.json({ success: true, plan: "FREE" });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: "Failed to reset plan" }, { status: 500 });
  }
}
