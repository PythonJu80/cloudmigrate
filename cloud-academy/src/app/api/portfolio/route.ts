import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Portfolio {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  isExample: boolean;
  companyName: string | null;
  industry: string | null;
  locationName: string | null;
  awsServices: string[];
  challengeScore: number;
  maxScore: number;
  completionTimeMinutes: number;
  thumbnailUrl: string | null;
  pdfUrl: string | null;
  generatedAt: Date | null;
  createdAt: Date;
}

/**
 * GET /api/portfolio
 * 
 * Fetches user's portfolios + the example portfolio that all users see
 * Using raw SQL since Prisma client needs regeneration for new model
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Build WHERE clause
    let whereClause = '"isExample" = true';
    
    // If logged in, also include user's own portfolios
    if (session?.user?.academyProfileId) {
      whereClause = `("isExample" = true OR "profileId" = '${session.user.academyProfileId}')`;
    }

    const portfolios = await prisma.$queryRawUnsafe<Portfolio[]>(`
      SELECT 
        id,
        title,
        description,
        status,
        type,
        "isExample",
        "companyName",
        industry,
        "locationName",
        "awsServices",
        "challengeScore",
        "maxScore",
        "completionTimeMinutes",
        "thumbnailUrl",
        "pdfUrl",
        "generatedAt",
        "createdAt",
        "businessUseCase",
        "problemStatement",
        "solutionSummary",
        "keyDecisions",
        "complianceAchieved",
        "architectureDiagram"
      FROM "AcademyPortfolio"
      WHERE ${whereClause}
      ORDER BY "isExample" DESC, "createdAt" DESC
    `);

    return NextResponse.json({
      portfolios,
      count: portfolios.length,
      hasUserPortfolios: portfolios.some((p: Portfolio) => !p.isExample),
    });

  } catch (error) {
    console.error("Fetch portfolios error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolios" },
      { status: 500 }
    );
  }
}
