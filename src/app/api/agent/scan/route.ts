import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface ScanResult {
  rootPath: string;
  fileCount: number;
  folderCount: number;
  totalSize: number;
  files: Array<{
    name: string;
    path: string;
    size: number;
    isDir: boolean;
    modified: string;
    ext: string;
  }>;
  fileTypes: Record<string, number>;
  largeFiles: Array<{
    name: string;
    path: string;
    size: number;
  }>;
  scannedAt: string;
}

/**
 * POST /api/agent/scan - Receive scan results from agent
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const apiKey = authHeader.slice(7);
    
    // Find tenant by agent API key
    const tenant = await prisma.tenant.findFirst({
      where: { agentApiKey: apiKey },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const scanResult: ScanResult = await request.json();

    // Store scan result
    await prisma.agentScan.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        rootPath: scanResult.rootPath,
        fileCount: scanResult.fileCount,
        folderCount: scanResult.folderCount,
        totalSize: BigInt(scanResult.totalSize),
        fileTypes: JSON.stringify(scanResult.fileTypes),
        largeFiles: JSON.stringify(scanResult.largeFiles),
        files: JSON.stringify(scanResult.files.slice(0, 500)), // Store first 500 files
        scannedAt: new Date(scanResult.scannedAt),
      },
      update: {
        rootPath: scanResult.rootPath,
        fileCount: scanResult.fileCount,
        folderCount: scanResult.folderCount,
        totalSize: BigInt(scanResult.totalSize),
        fileTypes: JSON.stringify(scanResult.fileTypes),
        largeFiles: JSON.stringify(scanResult.largeFiles),
        files: JSON.stringify(scanResult.files.slice(0, 500)),
        scannedAt: new Date(scanResult.scannedAt),
      },
    });

    // Update tenant's agent status
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { 
        agentConnected: true,
        agentLastSeen: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Scan results received",
      fileCount: scanResult.fileCount,
    });
  } catch (error) {
    console.error("Agent scan error:", error);
    return NextResponse.json({ error: "Failed to process scan" }, { status: 500 });
  }
}

/**
 * GET /api/agent/scan - Get latest scan results (for AI assistant)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const apiKey = authHeader.slice(7);
    
    const tenant = await prisma.tenant.findFirst({
      where: { agentApiKey: apiKey },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const scan = await prisma.agentScan.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });

    if (!scan) {
      return NextResponse.json({ error: "No scan data available" }, { status: 404 });
    }

    return NextResponse.json({
      rootPath: scan.scanPath,
      fileCount: scan.fileCount,
      folderCount: scan.folderCount,
      totalSize: scan.totalSize.toString(),
      fileTypes: scan.fileTypes,
      largeFiles: scan.largeFiles,
      scannedAt: scan.createdAt,
    });
  } catch (error) {
    console.error("Get scan error:", error);
    return NextResponse.json({ error: "Failed to get scan" }, { status: 500 });
  }
}

/**
 * DELETE /api/agent/scan - Clear/release the local scan data
 * This removes the local file context from the AI assistant
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const apiKey = authHeader.slice(7);
    
    const tenant = await prisma.tenant.findFirst({
      where: { agentApiKey: apiKey },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Delete all scan data for this tenant
    await prisma.agentScan.deleteMany({
      where: { tenantId: tenant.id },
    });

    return NextResponse.json({
      success: true,
      message: "Local scan data cleared. The AI assistant will no longer reference your local files.",
    });
  } catch (error) {
    console.error("Delete scan error:", error);
    return NextResponse.json({ error: "Failed to clear scan" }, { status: 500 });
  }
}
