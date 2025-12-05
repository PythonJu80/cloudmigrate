import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getDefaultS3Client,
  getAssumedRoleS3Client,
  getPresignedUploadUrl,
} from "@/lib/aws/s3";
import { generateS3Key, getMimeType } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileSize, bucketName, prefix } = await req.json();

    if (!fileName || !bucketName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check usage limits
    const newTotal = BigInt(tenant.bytesTransferred) + BigInt(fileSize || 0);
    if (newTotal > tenant.bytesLimit) {
      return NextResponse.json(
        { error: "Storage limit exceeded. Please upgrade your plan." },
        { status: 403 }
      );
    }

    // Get S3 client
    let s3Client;
    if (tenant.awsRoleArn && tenant.awsExternalId) {
      s3Client = await getAssumedRoleS3Client(
        tenant.awsRoleArn,
        tenant.awsExternalId,
        tenant.awsRegion
      );
    } else {
      s3Client = getDefaultS3Client();
    }

    // Generate S3 key
    const s3Key = generateS3Key(fileName, prefix);
    const contentType = getMimeType(fileName);

    // Get presigned URL
    const presignedUrl = await getPresignedUploadUrl(
      s3Client,
      bucketName,
      s3Key,
      contentType
    );

    // Get or create bucket record
    let bucket = await prisma.bucket.findFirst({
      where: {
        tenantId: session.user.tenantId,
        name: bucketName,
      },
    });

    if (!bucket) {
      bucket = await prisma.bucket.create({
        data: {
          name: bucketName,
          region: tenant.awsRegion,
          tenantId: session.user.tenantId,
        },
      });
    }

    // Create transfer record
    const transfer = await prisma.transfer.create({
      data: {
        fileName,
        filePath: fileName,
        fileSize: BigInt(fileSize || 0),
        mimeType: contentType,
        s3Key,
        bucketId: bucket.id,
        status: "PENDING",
        tenantId: session.user.tenantId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      presignedUrl,
      s3Key,
      transferId: transfer.id,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL. Check your AWS credentials." },
      { status: 500 }
    );
  }
}

// Update transfer status
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transferId, status, progress, error } = await req.json();

    const transfer = await prisma.transfer.update({
      where: {
        id: transferId,
        tenantId: session.user.tenantId,
      },
      data: {
        status,
        progress,
        error,
        ...(status === "UPLOADING" ? { startedAt: new Date() } : {}),
        ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });

    // Update tenant usage on completion
    if (status === "COMPLETED") {
      await prisma.tenant.update({
        where: { id: session.user.tenantId },
        data: {
          bytesTransferred: {
            increment: transfer.fileSize,
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
          action: "UPLOAD_COMPLETED",
          resource: transfer.s3Key,
          details: JSON.stringify({
            fileName: transfer.fileName,
            fileSize: transfer.fileSize.toString(),
            bucket: transfer.bucketId,
          }),
        },
      });
    }

    return NextResponse.json({ transfer });
  } catch (error) {
    console.error("Error updating transfer:", error);
    return NextResponse.json(
      { error: "Failed to update transfer" },
      { status: 500 }
    );
  }
}
