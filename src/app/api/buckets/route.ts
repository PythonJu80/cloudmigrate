import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultS3Client, getAssumedRoleS3Client, listBuckets } from "@/lib/aws/s3";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tenant settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let s3Client;

    // Use customer's AWS account if configured, otherwise use default
    if (tenant.awsRoleArn && tenant.awsExternalId) {
      s3Client = await getAssumedRoleS3Client(
        tenant.awsRoleArn,
        tenant.awsExternalId,
        tenant.awsRegion
      );
    } else {
      s3Client = getDefaultS3Client();
    }

    const buckets = await listBuckets(s3Client);

    // Also get saved buckets from database
    const savedBuckets = await prisma.bucket.findMany({
      where: { tenantId: session.user.tenantId },
    });

    return NextResponse.json({
      buckets: buckets.map((b) => ({
        name: b.Name,
        creationDate: b.CreationDate,
      })),
      savedBuckets,
    });
  } catch (error) {
    console.error("Error listing buckets:", error);
    return NextResponse.json(
      { error: "Failed to list S3 buckets. Check your AWS credentials." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, region, isDefault } = await req.json();

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.bucket.updateMany({
        where: { tenantId: session.user.tenantId },
        data: { isDefault: false },
      });
    }

    const bucket = await prisma.bucket.upsert({
      where: {
        tenantId_name: {
          tenantId: session.user.tenantId,
          name,
        },
      },
      update: { region, isDefault },
      create: {
        name,
        region: region || "us-east-1",
        isDefault: isDefault || false,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json({ bucket });
  } catch (error) {
    console.error("Error saving bucket:", error);
    return NextResponse.json(
      { error: "Failed to save bucket" },
      { status: 500 }
    );
  }
}
