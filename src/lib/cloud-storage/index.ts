/**
 * Cloud Storage Abstraction Layer
 * Provides a unified interface for AWS S3, GCP Cloud Storage, Azure Blob Storage, and Oracle Object Storage
 */

import { getAwsCredentials, getGcpCredentials, getAzureCredentials, getOracleCredentials } from "@/lib/secrets";

export type CloudProvider = "aws" | "gcp" | "azure" | "oracle";

export interface StorageBucket {
  name: string;
  creationDate?: Date | null;
  region?: string;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: string | null;
  isFolder: boolean;
}

export interface ListObjectsResult {
  objects: StorageObject[];
  isTruncated?: boolean;
  nextContinuationToken?: string;
}

export interface CloudStorageClient {
  listBuckets(): Promise<StorageBucket[]>;
  listObjects(bucket: string, prefix?: string): Promise<ListObjectsResult>;
  deleteObject(bucket: string, key: string): Promise<void>;
  getPresignedDownloadUrl(bucket: string, key: string): Promise<string>;
  getPresignedUploadUrl(bucket: string, key: string, contentType: string): Promise<string>;
}

/**
 * Get a cloud storage client for the specified provider
 */
export async function getCloudStorageClient(
  tenantId: string,
  provider: CloudProvider
): Promise<CloudStorageClient> {
  switch (provider) {
    case "aws":
      return getAwsStorageClient(tenantId);
    case "gcp":
      return getGcpStorageClient(tenantId);
    case "azure":
      return getAzureStorageClient(tenantId);
    case "oracle":
      return getOracleStorageClient(tenantId);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// ============================================
// AWS S3 Implementation
// ============================================
async function getAwsStorageClient(tenantId: string): Promise<CloudStorageClient> {
  const { S3Client, ListBucketsCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  
  const credentials = await getAwsCredentials(tenantId);
  
  // Use tenant credentials if available, otherwise fall back to env vars
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: credentials.accessKeyId && credentials.secretAccessKey ? {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    } : {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });

  return {
    async listBuckets(): Promise<StorageBucket[]> {
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      return (response.Buckets || []).map(b => ({
        name: b.Name || "",
        creationDate: b.CreationDate || null,
      }));
    },

    async listObjects(bucket: string, prefix?: string): Promise<ListObjectsResult> {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || "",
        Delimiter: "/",
      });
      const response = await s3Client.send(command);

      const folders = (response.CommonPrefixes || []).map(p => ({
        key: p.Prefix || "",
        size: 0,
        lastModified: null,
        isFolder: true,
      }));

      const files = (response.Contents || [])
        .filter(obj => obj.Key !== prefix)
        .map(obj => ({
          key: obj.Key || "",
          size: obj.Size || 0,
          lastModified: obj.LastModified?.toISOString() || null,
          isFolder: false,
        }));

      return {
        objects: [...folders, ...files],
        isTruncated: response.IsTruncated,
        nextContinuationToken: response.NextContinuationToken,
      };
    },

    async deleteObject(bucket: string, key: string): Promise<void> {
      const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
      await s3Client.send(command);
    },

    async getPresignedDownloadUrl(bucket: string, key: string): Promise<string> {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      return getSignedUrl(s3Client, command, { expiresIn: 3600 });
    },

    async getPresignedUploadUrl(bucket: string, key: string, contentType: string): Promise<string> {
      const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
      return getSignedUrl(s3Client, command, { expiresIn: 3600 });
    },
  };
}

// ============================================
// GCP Cloud Storage Implementation
// ============================================
async function getGcpStorageClient(tenantId: string): Promise<CloudStorageClient> {
  const credentials = await getGcpCredentials(tenantId);
  
  // Check if GCP credentials are configured
  if (!credentials.projectId || !credentials.privateKey) {
    throw new Error("GCP credentials not configured. Please add your GCP service account credentials in Settings.");
  }

  // Note: In production, you'd use @google-cloud/storage SDK
  // For now, we'll throw a helpful error since the SDK isn't installed
  return {
    async listBuckets(): Promise<StorageBucket[]> {
      // In production with @google-cloud/storage:
      // const { Storage } = await import("@google-cloud/storage");
      // const storage = new Storage({ projectId: credentials.projectId, credentials: { client_email: credentials.serviceAccountEmail, private_key: credentials.privateKey } });
      // const [buckets] = await storage.getBuckets();
      // return buckets.map(b => ({ name: b.name, creationDate: b.metadata.timeCreated }));
      
      throw new Error("GCP Cloud Storage SDK not installed. Install @google-cloud/storage to enable GCP support.");
    },

    async listObjects(bucket: string, prefix?: string): Promise<ListObjectsResult> {
      throw new Error("GCP Cloud Storage SDK not installed. Install @google-cloud/storage to enable GCP support.");
    },

    async deleteObject(bucket: string, key: string): Promise<void> {
      throw new Error("GCP Cloud Storage SDK not installed. Install @google-cloud/storage to enable GCP support.");
    },

    async getPresignedDownloadUrl(bucket: string, key: string): Promise<string> {
      throw new Error("GCP Cloud Storage SDK not installed. Install @google-cloud/storage to enable GCP support.");
    },

    async getPresignedUploadUrl(bucket: string, key: string, contentType: string): Promise<string> {
      throw new Error("GCP Cloud Storage SDK not installed. Install @google-cloud/storage to enable GCP support.");
    },
  };
}

// ============================================
// Azure Blob Storage Implementation
// ============================================
async function getAzureStorageClient(tenantId: string): Promise<CloudStorageClient> {
  const credentials = await getAzureCredentials(tenantId);
  
  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error("Azure credentials not configured. Please add your Azure service principal credentials in Settings.");
  }

  // Note: In production, you'd use @azure/storage-blob SDK
  return {
    async listBuckets(): Promise<StorageBucket[]> {
      // In production with @azure/storage-blob:
      // const { BlobServiceClient } = await import("@azure/storage-blob");
      // const { DefaultAzureCredential } = await import("@azure/identity");
      // const blobServiceClient = new BlobServiceClient(`https://${storageAccount}.blob.core.windows.net`, new DefaultAzureCredential());
      // const containers = [];
      // for await (const container of blobServiceClient.listContainers()) { containers.push({ name: container.name }); }
      // return containers;
      
      throw new Error("Azure Blob Storage SDK not installed. Install @azure/storage-blob to enable Azure support.");
    },

    async listObjects(bucket: string, prefix?: string): Promise<ListObjectsResult> {
      throw new Error("Azure Blob Storage SDK not installed. Install @azure/storage-blob to enable Azure support.");
    },

    async deleteObject(bucket: string, key: string): Promise<void> {
      throw new Error("Azure Blob Storage SDK not installed. Install @azure/storage-blob to enable Azure support.");
    },

    async getPresignedDownloadUrl(bucket: string, key: string): Promise<string> {
      throw new Error("Azure Blob Storage SDK not installed. Install @azure/storage-blob to enable Azure support.");
    },

    async getPresignedUploadUrl(bucket: string, key: string, contentType: string): Promise<string> {
      throw new Error("Azure Blob Storage SDK not installed. Install @azure/storage-blob to enable Azure support.");
    },
  };
}

// ============================================
// Oracle Object Storage Implementation
// ============================================
async function getOracleStorageClient(tenantId: string): Promise<CloudStorageClient> {
  const credentials = await getOracleCredentials(tenantId);
  
  if (!credentials.tenancyOcid || !credentials.privateKey) {
    throw new Error("Oracle Cloud credentials not configured. Please add your OCI credentials in Settings.");
  }

  // Note: In production, you'd use oci-sdk
  return {
    async listBuckets(): Promise<StorageBucket[]> {
      // In production with oci-sdk:
      // const oci = await import("oci-sdk");
      // const provider = new oci.common.SimpleAuthenticationDetailsProvider(credentials.tenancyOcid, credentials.userOcid, credentials.fingerprint, credentials.privateKey, null, oci.common.Region.US_ASHBURN_1);
      // const client = new oci.objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
      // const response = await client.listBuckets({ namespaceName: namespace, compartmentId: credentials.compartmentOcid });
      // return response.items.map(b => ({ name: b.name, creationDate: b.timeCreated }));
      
      throw new Error("Oracle Cloud SDK not installed. Install oci-sdk to enable Oracle support.");
    },

    async listObjects(bucket: string, prefix?: string): Promise<ListObjectsResult> {
      throw new Error("Oracle Cloud SDK not installed. Install oci-sdk to enable Oracle support.");
    },

    async deleteObject(bucket: string, key: string): Promise<void> {
      throw new Error("Oracle Cloud SDK not installed. Install oci-sdk to enable Oracle support.");
    },

    async getPresignedDownloadUrl(bucket: string, key: string): Promise<string> {
      throw new Error("Oracle Cloud SDK not installed. Install oci-sdk to enable Oracle support.");
    },

    async getPresignedUploadUrl(bucket: string, key: string, contentType: string): Promise<string> {
      throw new Error("Oracle Cloud SDK not installed. Install oci-sdk to enable Oracle support.");
    },
  };
}

/**
 * Get provider display info
 */
export function getProviderInfo(provider: CloudProvider) {
  const info = {
    aws: { name: "AWS", storageName: "S3", prefix: "s3://" },
    gcp: { name: "GCP", storageName: "Cloud Storage", prefix: "gs://" },
    azure: { name: "Azure", storageName: "Blob Storage", prefix: "azure://" },
    oracle: { name: "Oracle", storageName: "Object Storage", prefix: "oci://" },
  };
  return info[provider];
}
