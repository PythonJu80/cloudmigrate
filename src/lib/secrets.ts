import { prisma } from "./db";
import { encrypt, decrypt, maskSecret } from "./encryption";

// Secret key types
export type SecretKey =
  // AWS
  | "AWS_ACCESS_KEY_ID"
  | "AWS_SECRET_ACCESS_KEY"
  | "AWS_ROLE_ARN"
  | "AWS_EXTERNAL_ID"
  // GCP
  | "GCP_PROJECT_ID"
  | "GCP_SERVICE_ACCOUNT_EMAIL"
  | "GCP_PRIVATE_KEY"
  // Azure
  | "AZURE_TENANT_ID"
  | "AZURE_SUBSCRIPTION_ID"
  | "AZURE_CLIENT_ID"
  | "AZURE_CLIENT_SECRET"
  // Oracle
  | "ORACLE_TENANCY_OCID"
  | "ORACLE_USER_OCID"
  | "ORACLE_COMPARTMENT_OCID"
  | "ORACLE_FINGERPRINT"
  | "ORACLE_PRIVATE_KEY"
  // Other
  | "OPENAI_API_KEY"
  | "STRIPE_API_KEY";

/**
 * Set an encrypted secret for a tenant
 */
export async function setSecret(
  tenantId: string,
  key: SecretKey,
  value: string
): Promise<void> {
  const encryptedValue = encrypt(value);

  await prisma.secret.upsert({
    where: {
      tenantId_key: { tenantId, key },
    },
    update: {
      value: encryptedValue,
    },
    create: {
      tenantId,
      key,
      value: encryptedValue,
    },
  });
}

/**
 * Get a decrypted secret for a tenant
 * Returns null if not found
 */
export async function getSecret(
  tenantId: string,
  key: SecretKey
): Promise<string | null> {
  const secret = await prisma.secret.findUnique({
    where: {
      tenantId_key: { tenantId, key },
    },
  });

  if (!secret) return null;

  try {
    return decrypt(secret.value);
  } catch (error) {
    console.error(`Failed to decrypt secret ${key}:`, error);
    return null;
  }
}

/**
 * Get multiple secrets for a tenant
 */
export async function getSecrets(
  tenantId: string,
  keys: SecretKey[]
): Promise<Record<SecretKey, string | null>> {
  const secrets = await prisma.secret.findMany({
    where: {
      tenantId,
      key: { in: keys },
    },
  });

  const result: Record<string, string | null> = {};
  for (const key of keys) {
    const secret = secrets.find((s) => s.key === key);
    if (secret) {
      try {
        result[key] = decrypt(secret.value);
      } catch {
        result[key] = null;
      }
    } else {
      result[key] = null;
    }
  }

  return result as Record<SecretKey, string | null>;
}

/**
 * Delete a secret
 */
export async function deleteSecret(
  tenantId: string,
  key: SecretKey
): Promise<void> {
  await prisma.secret.deleteMany({
    where: { tenantId, key },
  });
}

/**
 * Check if a secret exists and return masked version
 */
export async function getSecretStatus(
  tenantId: string,
  key: SecretKey
): Promise<{ exists: boolean; masked: string | null }> {
  const value = await getSecret(tenantId, key);
  if (!value) {
    return { exists: false, masked: null };
  }

  // Determine prefix based on key type
  let prefix = "***";
  if (key === "AWS_ACCESS_KEY_ID") prefix = "AKIA***";
  if (key === "OPENAI_API_KEY") prefix = "sk-***";

  return {
    exists: true,
    masked: maskSecret(value, prefix),
  };
}

/**
 * Get AWS credentials for a tenant
 */
export async function getAwsCredentials(tenantId: string): Promise<{
  accessKeyId: string | null;
  secretAccessKey: string | null;
  roleArn: string | null;
  externalId: string | null;
}> {
  const secrets = await getSecrets(tenantId, [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_ROLE_ARN",
    "AWS_EXTERNAL_ID",
  ]);

  return {
    accessKeyId: secrets.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY,
    roleArn: secrets.AWS_ROLE_ARN,
    externalId: secrets.AWS_EXTERNAL_ID,
  };
}

/**
 * Get GCP credentials for a tenant
 */
export async function getGcpCredentials(tenantId: string): Promise<{
  projectId: string | null;
  serviceAccountEmail: string | null;
  privateKey: string | null;
}> {
  const secrets = await getSecrets(tenantId, [
    "GCP_PROJECT_ID",
    "GCP_SERVICE_ACCOUNT_EMAIL",
    "GCP_PRIVATE_KEY",
  ]);

  return {
    projectId: secrets.GCP_PROJECT_ID,
    serviceAccountEmail: secrets.GCP_SERVICE_ACCOUNT_EMAIL,
    privateKey: secrets.GCP_PRIVATE_KEY,
  };
}

/**
 * Get Azure credentials for a tenant
 */
export async function getAzureCredentials(tenantId: string): Promise<{
  tenantId: string | null;
  subscriptionId: string | null;
  clientId: string | null;
  clientSecret: string | null;
}> {
  const secrets = await getSecrets(tenantId, [
    "AZURE_TENANT_ID",
    "AZURE_SUBSCRIPTION_ID",
    "AZURE_CLIENT_ID",
    "AZURE_CLIENT_SECRET",
  ]);

  return {
    tenantId: secrets.AZURE_TENANT_ID,
    subscriptionId: secrets.AZURE_SUBSCRIPTION_ID,
    clientId: secrets.AZURE_CLIENT_ID,
    clientSecret: secrets.AZURE_CLIENT_SECRET,
  };
}

/**
 * Get Oracle Cloud credentials for a tenant
 */
export async function getOracleCredentials(tenantId: string): Promise<{
  tenancyOcid: string | null;
  userOcid: string | null;
  compartmentOcid: string | null;
  fingerprint: string | null;
  privateKey: string | null;
}> {
  const secrets = await getSecrets(tenantId, [
    "ORACLE_TENANCY_OCID",
    "ORACLE_USER_OCID",
    "ORACLE_COMPARTMENT_OCID",
    "ORACLE_FINGERPRINT",
    "ORACLE_PRIVATE_KEY",
  ]);

  return {
    tenancyOcid: secrets.ORACLE_TENANCY_OCID,
    userOcid: secrets.ORACLE_USER_OCID,
    compartmentOcid: secrets.ORACLE_COMPARTMENT_OCID,
    fingerprint: secrets.ORACLE_FINGERPRINT,
    privateKey: secrets.ORACLE_PRIVATE_KEY,
  };
}

/**
 * Get credentials for any provider
 */
export type CloudProvider = "aws" | "gcp" | "azure" | "oracle";

export async function getProviderCredentials(tenantId: string, provider: CloudProvider) {
  switch (provider) {
    case "aws":
      return { provider: "aws", credentials: await getAwsCredentials(tenantId) };
    case "gcp":
      return { provider: "gcp", credentials: await getGcpCredentials(tenantId) };
    case "azure":
      return { provider: "azure", credentials: await getAzureCredentials(tenantId) };
    case "oracle":
      return { provider: "oracle", credentials: await getOracleCredentials(tenantId) };
  }
}
