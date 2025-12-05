import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startAlertChecker, stopAlertChecker, checkAlertRules } from "@/lib/jobs/alert-checker";

// POST /api/admin/alert-checker - Control the alert checker
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin role check
    // if (session.user.role !== "ADMIN") {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "start":
        startAlertChecker(60000); // 1 minute interval
        return NextResponse.json({ status: "started", interval: 60000 });

      case "stop":
        stopAlertChecker();
        return NextResponse.json({ status: "stopped" });

      case "run":
        // Run once immediately
        const stats = await checkAlertRules();
        return NextResponse.json({ status: "completed", stats });

      default:
        return NextResponse.json({ error: "Invalid action. Use: start, stop, run" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Alert checker API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
