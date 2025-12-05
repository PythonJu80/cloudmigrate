import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - fetch current target certification
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.academyUserProfile.findFirst({
      where: { academyUserId: session.user.id },
      select: { targetCertification: true },
    });

    return NextResponse.json({
      targetCertification: profile?.targetCertification || "SAA",
    });
  } catch (error) {
    console.error("Certification GET error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PUT - update target certification
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { certCode } = await request.json();
    
    // Validate cert code - using full IDs that match backend
    const validCerts = [
      "solutions-architect-associate", "developer-associate", "sysops-associate",
      "solutions-architect-professional", "devops-professional",
      "networking-specialty", "security-specialty", "machine-learning-specialty", "database-specialty"
    ];
    if (!validCerts.includes(certCode)) {
      return NextResponse.json({ error: "Invalid certification code" }, { status: 400 });
    }

    await prisma.academyUserProfile.updateMany({
      where: { academyUserId: session.user.id },
      data: { targetCertification: certCode },
    });

    return NextResponse.json({ success: true, targetCertification: certCode });
  } catch (error) {
    console.error("Certification PUT error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
