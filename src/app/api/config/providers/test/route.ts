import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOracleCredentials } from "@/lib/secrets";
import { 
  testAwsCredentials, 
  testGcpCredentials, 
  testAzureCredentials 
} from "@/lib/cloudflow/executor/clients";

type CloudProvider = "aws" | "gcp" | "azure" | "oracle";

// POST - Test provider credentials
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider } = await request.json() as { provider: CloudProvider };

    if (!["aws", "gcp", "azure", "oracle"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Test credentials by actually calling the cloud provider
    let testResult: { success: boolean; message: string; details?: any };

    switch (provider) {
      case "aws": {
        const result = await testAwsCredentials(session.user.tenantId);
        testResult = {
          success: result.success,
          message: result.message,
          details: result.details ? `Account: ${result.details.accountId}` : undefined,
        };
        break;
      }
      case "gcp": {
        const gcpResult = await testGcpCredentials(session.user.tenantId);
        testResult = {
          success: gcpResult.success,
          message: gcpResult.message,
          details: gcpResult.details ? `Project: ${gcpResult.details.projectId}` : undefined,
        };
        break;
      }
      case "azure": {
        const azureResult = await testAzureCredentials(session.user.tenantId);
        testResult = {
          success: azureResult.success,
          message: azureResult.message,
          details: azureResult.details ? `Subscription: ${azureResult.details.subscriptionId}` : undefined,
        };
        break;
      }
      case "oracle": {
        const oracleCreds = await getOracleCredentials(session.user.tenantId);
        if (!oracleCreds.tenancyOcid || !oracleCreds.privateKey) {
          testResult = { success: false, message: "Oracle credentials not configured" };
        } else {
          testResult = { 
            success: true, 
            message: "Oracle credentials configured",
            details: `Tenancy: ${oracleCreds.tenancyOcid.slice(0, 20)}...`
          };
        }
        break;
      }
    }

    return NextResponse.json(testResult);
  } catch (error) {
    console.error("Failed to test provider credentials:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to test credentials",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
