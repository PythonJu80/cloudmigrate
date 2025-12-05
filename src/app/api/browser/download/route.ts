import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getDefaultS3Client, getAssumedRoleS3Client } from "@/lib/aws/s3";

// GET - Get presigned download URL
export async function GET(req: NextRequest) {
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

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    // Generate presigned URL valid for 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        action: "DOWNLOAD_OBJECT",
        resource: `s3://${bucket}/${key}`,
      },
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL. Check your AWS credentials." },
      { status: 500 }
    );
  }
}
