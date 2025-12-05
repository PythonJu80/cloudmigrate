import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { 
  setSecret, 
  getSecretStatus, 
  type SecretKey,
  getAwsCredentials,
  getGcpCredentials,
  getAzureCredentials,
  getOracleCredentials,
} from "@/lib/secrets";

type CloudProvider = "aws" | "gcp" | "azure" | "oracle";

// Provider-specific secret keys
const providerSecretKeys: Record<CloudProvider, SecretKey[]> = {
  aws: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_ROLE_ARN", "AWS_EXTERNAL_ID"],
  gcp: ["GCP_PROJECT_ID", "GCP_SERVICE_ACCOUNT_EMAIL", "GCP_PRIVATE_KEY"],
  azure: ["AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"],
  oracle: ["ORACLE_TENANCY_OCID", "ORACLE_USER_OCID", "ORACLE_COMPARTMENT_OCID", "ORACLE_FINGERPRINT", "ORACLE_PRIVATE_KEY"],
};

// GET - Get status of all provider credentials
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const provider = request.nextUrl.searchParams.get("provider") as CloudProvider | null;

    if (provider && providerSecretKeys[provider]) {
      // Get status for specific provider
      const statuses: Record<string, { exists: boolean; masked: string | null }> = {};
      for (const key of providerSecretKeys[provider]) {
        statuses[key] = await getSecretStatus(session.user.tenantId, key);
      }
      return NextResponse.json({ provider, statuses });
    }

    // Get status for all providers
    const allStatuses: Record<CloudProvider, Record<string, { exists: boolean; masked: string | null }>> = {
      aws: {},
      gcp: {},
      azure: {},
      oracle: {},
    };

    for (const [prov, keys] of Object.entries(providerSecretKeys)) {
      for (const key of keys) {
        allStatuses[prov as CloudProvider][key] = await getSecretStatus(session.user.tenantId, key);
      }
    }

    return NextResponse.json({ providers: allStatuses });
  } catch (error) {
    console.error("Failed to get provider credentials status:", error);
    return NextResponse.json({ error: "Failed to get credentials status" }, { status: 500 });
  }
}

// POST - Save provider credentials
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can set credentials
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { provider, credentials } = body as { provider: CloudProvider; credentials: Record<string, string> };

    if (!provider || !providerSecretKeys[provider]) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    if (!credentials || typeof credentials !== "object") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    // Save each credential
    const savedKeys: string[] = [];
    for (const [key, value] of Object.entries(credentials)) {
      if (value && providerSecretKeys[provider].includes(key as SecretKey)) {
        await setSecret(session.user.tenantId, key as SecretKey, value);
        savedKeys.push(key);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        action: "UPDATE_PROVIDER_CREDENTIALS",
        resource: `${provider}_credentials`,
        details: JSON.stringify({ provider, keysUpdated: savedKeys.length }),
      },
    });

    return NextResponse.json({ 
      success: true, 
      provider,
      keysUpdated: savedKeys.length,
    });
  } catch (error) {
    console.error("Failed to save provider credentials:", error);
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}
