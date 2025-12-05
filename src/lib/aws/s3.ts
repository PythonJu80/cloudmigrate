import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export interface S3UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Get S3 client with default credentials
export function getDefaultS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

// Get S3 client with assumed role (for customer AWS accounts)
export async function getAssumedRoleS3Client(
  roleArn: string,
  externalId: string,
  region: string
): Promise<S3Client> {
  const stsClient = new STSClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });

  const assumeRoleCommand = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: `cloudmigrate-${Date.now()}`,
    ExternalId: externalId,
    DurationSeconds: 3600,
  });

  const { Credentials } = await stsClient.send(assumeRoleCommand);

  if (!Credentials?.AccessKeyId || !Credentials?.SecretAccessKey) {
    throw new Error("Failed to assume role");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretAccessKey,
      sessionToken: Credentials.SessionToken,
    },
  });
}

// List all buckets
export async function listBuckets(client: S3Client) {
  const command = new ListBucketsCommand({});
  const response = await client.send(command);
  return response.Buckets || [];
}

// List objects in a bucket
export async function listObjects(
  client: S3Client,
  bucket: string,
  prefix?: string,
  maxKeys = 1000
) {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });
  const response = await client.send(command);
  return response.Contents || [];
}

// Upload file with progress tracking
export async function uploadFile(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string,
  onProgress?: (progress: S3UploadProgress) => void
): Promise<string> {
  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024, // 5MB parts
    leavePartsOnError: false,
  });

  if (onProgress) {
    upload.on("httpUploadProgress", (progress) => {
      const loaded = progress.loaded || 0;
      const total = progress.total || 0;
      onProgress({
        loaded,
        total,
        percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
      });
    });
  }

  await upload.done();
  return key;
}

// Generate presigned URL for upload
export async function getPresignedUploadUrl(
  client: S3Client,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

// Generate presigned URL for download
export async function getPresignedDownloadUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

// Delete object
export async function deleteObject(
  client: S3Client,
  bucket: string,
  key: string
): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await client.send(command);
}

// Check if object exists
export async function objectExists(
  client: S3Client,
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch {
    return false;
  }
}

// Get object metadata
export async function getObjectMetadata(
  client: S3Client,
  bucket: string,
  key: string
) {
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return client.send(command);
}
