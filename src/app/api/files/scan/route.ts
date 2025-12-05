import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

// Base path where user home is mounted in Docker
const USER_HOME_MOUNT = "/user-home";

interface ScanResult {
  files: number;
  folders: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  largeFiles: Array<{ name: string; size: number; path: string }>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function scanDirectory(dirPath: string, result: ScanResult, depth: number = 0, maxDepth: number = 5): void {
  if (depth > maxDepth) return;
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip hidden files and common ignore patterns
      if (entry.name.startsWith(".") || 
          entry.name === "node_modules" || 
          entry.name === "__pycache__" ||
          entry.name === "venv") {
        continue;
      }
      
      try {
        if (entry.isDirectory()) {
          result.folders++;
          scanDirectory(fullPath, result, depth + 1, maxDepth);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          result.files++;
          result.totalSize += stats.size;
          
          // Track file types
          const ext = path.extname(entry.name).toLowerCase() || "no-ext";
          result.fileTypes[ext] = (result.fileTypes[ext] || 0) + 1;
          
          // Track large files (> 10MB)
          if (stats.size > 10 * 1024 * 1024) {
            result.largeFiles.push({
              name: entry.name,
              size: stats.size,
              path: fullPath.replace(USER_HOME_MOUNT, "~"),
            });
          }
        }
      } catch (err) {
        // Skip files we can't access
      }
    }
  } catch (err) {
    // Skip directories we can't access
  }
}

/**
 * POST /api/files/scan - Scan a local directory
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: requestedPath } = await request.json();
    
    if (!requestedPath || typeof requestedPath !== "string") {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    // Convert user path to mounted path
    // e.g., /home/kingju/projects -> /user-home/projects
    // or ~/projects -> /user-home/projects
    let scanPath = requestedPath;
    
    if (scanPath.startsWith("~")) {
      scanPath = scanPath.replace("~", USER_HOME_MOUNT);
    } else if (scanPath.startsWith("/home/")) {
      // Extract path after /home/username/
      const parts = scanPath.split("/");
      if (parts.length >= 4) {
        scanPath = USER_HOME_MOUNT + "/" + parts.slice(3).join("/");
      }
    }

    // Security: Ensure we're only accessing the mounted user-home
    if (!scanPath.startsWith(USER_HOME_MOUNT)) {
      return NextResponse.json({ 
        error: "Access denied. Only paths within your home directory are accessible." 
      }, { status: 403 });
    }

    // Check if path exists
    if (!fs.existsSync(scanPath)) {
      return NextResponse.json({ 
        error: `Directory not found: ${requestedPath}. Make sure the path exists and is mounted.` 
      }, { status: 404 });
    }

    const stats = fs.statSync(scanPath);
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
    }

    // Scan the directory
    const result: ScanResult = {
      files: 0,
      folders: 0,
      totalSize: 0,
      fileTypes: {},
      largeFiles: [],
    };

    scanDirectory(scanPath, result);

    // Sort large files by size
    result.largeFiles.sort((a, b) => b.size - a.size);
    result.largeFiles = result.largeFiles.slice(0, 20); // Top 20

    // Save scan result to tenant
    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: { 
        localPath: requestedPath,
        // Could store scan results in a separate table if needed
      },
    });

    return NextResponse.json({
      success: true,
      path: requestedPath,
      stats: {
        files: result.files,
        folders: result.folders,
        size: formatBytes(result.totalSize),
        totalBytes: result.totalSize,
      },
      fileTypes: Object.entries(result.fileTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ext, count]) => ({ ext, count })),
      largeFiles: result.largeFiles.map(f => ({
        ...f,
        sizeFormatted: formatBytes(f.size),
      })),
    });
  } catch (error) {
    console.error("Scan directory error:", error);
    return NextResponse.json({ error: "Failed to scan directory" }, { status: 500 });
  }
}

/**
 * GET /api/files/scan - List files in a directory (for AI agent)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedPath = searchParams.get("path");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get tenant's configured local path if no path specified
    let scanPath = requestedPath;
    if (!scanPath) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: { localPath: true },
      });
      scanPath = tenant?.localPath;
    }

    if (!scanPath) {
      return NextResponse.json({ 
        error: "No path configured. Set a local path in Settings first." 
      }, { status: 400 });
    }

    // Convert to mounted path
    let mountedPath = scanPath;
    if (mountedPath.startsWith("~")) {
      mountedPath = mountedPath.replace("~", USER_HOME_MOUNT);
    } else if (mountedPath.startsWith("/home/")) {
      const parts = mountedPath.split("/");
      if (parts.length >= 4) {
        mountedPath = USER_HOME_MOUNT + "/" + parts.slice(3).join("/");
      }
    }

    if (!fs.existsSync(mountedPath)) {
      return NextResponse.json({ error: "Directory not found" }, { status: 404 });
    }

    const entries = fs.readdirSync(mountedPath, { withFileTypes: true });
    const files = entries
      .filter(e => !e.name.startsWith("."))
      .slice(0, limit)
      .map(entry => {
        const fullPath = path.join(mountedPath, entry.name);
        try {
          const stats = fs.statSync(fullPath);
          return {
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            size: entry.isFile() ? stats.size : null,
            sizeFormatted: entry.isFile() ? formatBytes(stats.size) : null,
            modified: stats.mtime.toISOString(),
          };
        } catch {
          return {
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            size: null,
            sizeFormatted: null,
            modified: null,
          };
        }
      });

    return NextResponse.json({
      path: scanPath,
      files,
      count: files.length,
      truncated: entries.length > limit,
    });
  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}
