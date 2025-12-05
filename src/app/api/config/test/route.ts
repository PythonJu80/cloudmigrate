import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { awsAccessKeyId, awsSecretAccessKey, awsRegion, awsRoleArn, awsExternalId } =
      await req.json();

    // Use provided credentials or fall back to env vars
    const accessKeyId = awsAccessKeyId && !awsAccessKeyId.includes("••••")
      ? awsAccessKeyId
      : process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = awsSecretAccessKey && !awsSecretAccessKey.includes("••••")
      ? awsSecretAccessKey
      : process.env.AWS_SECRET_ACCESS_KEY;
    const region = awsRegion || process.env.AWS_REGION || "us-east-1";

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: "AWS credentials not configured" },
        { status: 400 }
      );
    }

    let s3Client: S3Client;

    // If role ARN provided, assume role first
    if (awsRoleArn) {
      const stsClient = new STSClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const assumeRoleCommand = new AssumeRoleCommand({
        RoleArn: awsRoleArn,
        RoleSessionName: "CloudMigrateTest",
        ExternalId: awsExternalId || undefined,
        DurationSeconds: 900,
      });

      const assumedRole = await stsClient.send(assumeRoleCommand);

      if (!assumedRole.Credentials) {
        return NextResponse.json(
          { error: "Failed to assume role" },
          { status: 400 }
        );
      }

      s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: assumedRole.Credentials.AccessKeyId!,
          secretAccessKey: assumedRole.Credentials.SecretAccessKey!,
          sessionToken: assumedRole.Credentials.SessionToken,
        },
      });
    } else {
      s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }

    // Test connection by listing buckets
    const listCommand = new ListBucketsCommand({});
    const response = await s3Client.send(listCommand);

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      bucketCount: response.Buckets?.length || 0,
    });
  } catch (error: any) {
    console.error("AWS connection test failed:", error);
    
    let errorMessage = "Connection failed";
    if (error.name === "InvalidAccessKeyId") {
      errorMessage = "Invalid Access Key ID";
    } else if (error.name === "SignatureDoesNotMatch") {
      errorMessage = "Invalid Secret Access Key";
    } else if (error.name === "AccessDenied") {
      errorMessage = "Access denied - check IAM permissions";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
