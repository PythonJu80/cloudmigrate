import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getDefaultS3Client, getAssumedRoleS3Client } from "@/lib/aws/s3";

// GET - List objects in bucket
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get("bucket");
    const prefix = searchParams.get("prefix") || "";

    if (!bucket) {
      return NextResponse.json({ error: "Bucket is required" }, { status: 400 });
    }

    // Get tenant settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let s3Client: S3Client;

    if (tenant.awsRoleArn && tenant.awsExternalId) {
      s3Client = await getAssumedRoleS3Client(
        tenant.awsRoleArn,
        tenant.awsExternalId,
        tenant.awsRegion
      );
    } else {
      s3Client = getDefaultS3Client();
    }

    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);

    // Process folders (CommonPrefixes)
    const folders = (response.CommonPrefixes || []).map((p) => ({
      key: p.Prefix || "",
      size: 0,
      lastModified: null,
      isFolder: true,
    }));

    // Process files (Contents)
    const files = (response.Contents || [])
      .filter((obj) => obj.Key !== prefix) // Exclude the prefix itself
      .map((obj) => ({
        key: obj.Key || "",
        size: obj.Size || 0,
        lastModified: obj.LastModified?.toISOString() || null,
        isFolder: false,
      }));

    return NextResponse.json({
      objects: [...folders, ...files],
      isTruncated: response.IsTruncated,
      nextContinuationToken: response.NextContinuationToken,
    });
  } catch (error) {
    console.error("Error listing objects:", error);
    return NextResponse.json(
      { error: "Failed to list S3 objects. Check your AWS credentials." },
      { status: 500 }
    );
  }
}

// DELETE - Delete object
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get("bucket");
    const key = searchParams.get("key");

    if (!bucket || !key) {
      return NextResponse.json(
        { error: "Bucket and key are required" },
        { status: 400 }
      );
    }

    // Get tenant settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let s3Client: S3Client;

    if (tenant.awsRoleArn && tenant.awsExternalId) {
      s3Client = await getAssumedRoleS3Client(
        tenant.awsRoleArn,
        tenant.awsExternalId,
        tenant.awsRegion
      );
    } else {
      s3Client = getDefaultS3Client();
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        action: "DELETE_OBJECT",
        resource: `s3://${bucket}/${key}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting object:", error);
    return NextResponse.json(
      { error: "Failed to delete S3 object. Check your AWS credentials." },
      { status: 500 }
    );
  }
}
