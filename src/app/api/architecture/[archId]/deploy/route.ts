import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { 
  deployWithCloudFormation, 
  updateStack,
  deleteStack,
  listStackResources,
  stackExists,
  getStackStatus 
} from "@/lib/architecture/cloudformation";

// POST - Deploy architecture to AWS
export async function POST(
  request: NextRequest,
  { params }: { params: { archId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get architecture
    const architecture = await prisma.architecture.findFirst({
      where: {
        id: params.archId,
        userId: session.user.id, // Only owner can deploy
      },
    });

    if (!architecture) {
      return NextResponse.json(
        { error: "Architecture not found or not authorized" },
        { status: 404 }
      );
    }

    // Parse nodes and edges
    const nodes = JSON.parse(architecture.nodes);
    const edges = JSON.parse(architecture.edges);

    if (nodes.length === 0) {
      return NextResponse.json(
        { error: "Architecture has no resources to deploy" },
        { status: 400 }
      );
    }

    // Get tenant region
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { awsRegion: true },
    });
    const region = tenant?.awsRegion || "us-east-1";

    // Create deployment record
    const deployment = await prisma.architectureDeployment.create({
      data: {
        architectureId: architecture.id,
        version: architecture.version,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    // Update architecture status
    await prisma.architecture.update({
      where: { id: architecture.id },
      data: { status: "deploying" },
    });

    // Start CloudFormation deployment (async - don't await)
    // Pass existing stack name if re-deploying (for update instead of create)
    deployWithCloudFormationAsync(
      deployment.id,
      architecture.id,
      architecture.name,
      nodes,
      edges,
      session.user.tenantId,
      region,
      architecture.terraformCode // Existing stack name if any
    );

    return NextResponse.json({
      deploymentId: deployment.id,
      status: "IN_PROGRESS",
      message: "Deployment started",
    });
  } catch (error: any) {
    console.error("Deploy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get deployment status
export async function GET(
  request: NextRequest,
  { params }: { params: { archId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get("deploymentId");

    if (deploymentId) {
      // Get specific deployment
      const deployment = await prisma.architectureDeployment.findFirst({
        where: {
          id: deploymentId,
          architecture: {
            id: params.archId,
            OR: [
              { userId: session.user.id },
              { tenantId: session.user.tenantId, isShared: true },
            ],
          },
        },
      });

      if (!deployment) {
        return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
      }

      return NextResponse.json({ deployment });
    }

    // Get all deployments for architecture
    const deployments = await prisma.architectureDeployment.findMany({
      where: {
        architecture: {
          id: params.archId,
          OR: [
            { userId: session.user.id },
            { tenantId: session.user.tenantId, isShared: true },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ deployments });
  } catch (error: any) {
    console.error("Get deployment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Tear down deployed architecture (delete CloudFormation stack)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { archId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get architecture - only owner can delete deployment
    const architecture = await prisma.architecture.findFirst({
      where: {
        id: params.archId,
        userId: session.user.id,
      },
    });

    if (!architecture) {
      return NextResponse.json(
        { error: "Architecture not found or not authorized" },
        { status: 404 }
      );
    }

    // Check if there's a stack to delete (stored in terraformCode field)
    const stackName = architecture.terraformCode;
    if (!stackName) {
      return NextResponse.json(
        { error: "No deployed stack found for this architecture" },
        { status: 400 }
      );
    }

    // Get tenant region
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { awsRegion: true },
    });
    const region = tenant?.awsRegion || "us-east-1";

    // Create deployment record for the deletion
    const deployment = await prisma.architectureDeployment.create({
      data: {
        architectureId: architecture.id,
        version: architecture.version,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        resourcesDeleted: 0,
      },
    });

    // Update architecture status
    await prisma.architecture.update({
      where: { id: architecture.id },
      data: { status: "deploying" }, // Use deploying for deletion too
    });

    // Start async deletion
    deleteStackAsync(
      deployment.id,
      architecture.id,
      stackName,
      session.user.tenantId,
      region
    );

    return NextResponse.json({
      deploymentId: deployment.id,
      status: "IN_PROGRESS",
      message: "Stack deletion started",
    });
  } catch (error: any) {
    console.error("Delete deployment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Async stack deletion
async function deleteStackAsync(
  deploymentId: string,
  architectureId: string,
  stackName: string,
  tenantId: string,
  region: string
) {
  try {
    // Get resource count before deletion
    const resources = await listStackResources(stackName, tenantId, region);
    const resourceCount = resources.length;

    // Delete the stack
    const result = await deleteStack(stackName, tenantId, region);

    // Update deployment record
    await prisma.architectureDeployment.update({
      where: { id: deploymentId },
      data: {
        status: result.success ? "COMPLETED" : "FAILED",
        completedAt: new Date(),
        resourcesDeleted: result.success ? resourceCount : 0,
        logs: JSON.stringify({ stackName, action: "DELETE" }),
        error: result.error,
      },
    });

    // Update architecture status
    await prisma.architecture.update({
      where: { id: architectureId },
      data: {
        status: result.success ? "draft" : "failed",
        deployedAt: result.success ? null : undefined,
        deployError: result.error,
        terraformCode: result.success ? null : undefined, // Clear stack name on success
      },
    });

    // Delete CloudResource records for this architecture
    if (result.success) {
      await prisma.cloudResource.deleteMany({
        where: { architectureId },
      });
    }
  } catch (error: any) {
    await prisma.architectureDeployment.update({
      where: { id: deploymentId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: error.message,
      },
    });

    await prisma.architecture.update({
      where: { id: architectureId },
      data: {
        status: "failed",
        deployError: error.message,
      },
    });
  }
}

// Async CloudFormation deployment
// Note: CloudFormation handles dependency ordering automatically via DependsOn
async function deployWithCloudFormationAsync(
  deploymentId: string,
  architectureId: string,
  architectureName: string,
  nodes: any[],
  edges: any[],
  tenantId: string,
  region: string,
  existingStackName?: string | null
) {
  try {
    let result;
    let isUpdate = false;

    // Check if we should update existing stack or create new
    if (existingStackName && await stackExists(existingStackName, tenantId, region)) {
      // Update existing stack
      isUpdate = true;
      console.log(`[Deploy] Updating existing stack: ${existingStackName}`);
      result = await updateStack(
        existingStackName,
        nodes,
        edges,
        architectureName,
        tenantId,
        region
      );
    } else {
      // Create new stack
      console.log(`[Deploy] Creating new stack for: ${architectureName}`);
      result = await deployWithCloudFormation(
        architectureId,
        architectureName,
        nodes,
        edges,
        tenantId,
        region
      );
    }

    // Get created resources from stack
    let resourceCount = 0;
    if (result.success) {
      const stackResources = await listStackResources(result.stackName, tenantId, region);
      resourceCount = stackResources.length;

      // Create CloudResource records for each resource
      for (const resource of stackResources) {
        // Map CloudFormation type to our type
        const resourceType = mapCfnTypeToResourceType(resource.type);
        
        await prisma.cloudResource.upsert({
          where: {
            tenantId_arn: {
              tenantId,
              arn: `arn:aws:cloudformation:${region}:${resource.physicalId}`,
            },
          },
          create: {
            tenantId,
            type: resourceType,
            awsId: resource.physicalId,
            arn: `arn:aws:cloudformation:${region}:${resource.physicalId}`,
            name: resource.logicalId,
            region,
            status: resource.status === "CREATE_COMPLETE" ? "ACTIVE" : "PENDING",
            config: JSON.stringify({ cfnType: resource.type }),
            architectureId,
          },
          update: {
            status: resource.status === "CREATE_COMPLETE" ? "ACTIVE" : "PENDING",
          },
        });
      }
    }

    // Update deployment record
    await prisma.architectureDeployment.update({
      where: { id: deploymentId },
      data: {
        status: result.success ? "COMPLETED" : "FAILED",
        completedAt: new Date(),
        resourcesCreated: isUpdate ? 0 : resourceCount,
        resourcesUpdated: isUpdate ? resourceCount : 0,
        logs: JSON.stringify({
          stackName: result.stackName,
          stackId: result.stackId,
          outputs: result.outputs,
          action: isUpdate ? "UPDATE" : "CREATE",
        }),
        error: result.error,
      },
    });

    // Update architecture status
    await prisma.architecture.update({
      where: { id: architectureId },
      data: {
        status: result.success ? "deployed" : "failed",
        deployedAt: result.success ? new Date() : undefined,
        deployError: result.error,
        // Store the CloudFormation stack name for future updates/deletes
        terraformCode: result.stackName,
      },
    });
  } catch (error: any) {
    // Update deployment as failed
    await prisma.architectureDeployment.update({
      where: { id: deploymentId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: error.message,
      },
    });

    await prisma.architecture.update({
      where: { id: architectureId },
      data: {
        status: "failed",
        deployError: error.message,
      },
    });
  }
}

// Map CloudFormation resource type to our ResourceType
function mapCfnTypeToResourceType(cfnType: string): string {
  const mapping: Record<string, string> = {
    "AWS::EC2::VPC": "VPC",
    "AWS::EC2::Subnet": "SUBNET",
    "AWS::EC2::Instance": "EC2",
    "AWS::EC2::SecurityGroup": "SG",
    "AWS::EC2::InternetGateway": "IGW",
    "AWS::EC2::NatGateway": "NAT",
    "AWS::Lambda::Function": "LAMBDA",
    "AWS::S3::Bucket": "S3",
    "AWS::DynamoDB::Table": "DYNAMODB",
    "AWS::RDS::DBInstance": "RDS",
    "AWS::SNS::Topic": "SNS",
    "AWS::SQS::Queue": "SQS",
    "AWS::ElasticLoadBalancingV2::LoadBalancer": "ALB",
    "AWS::ApiGateway::RestApi": "API_GATEWAY",
    "AWS::IAM::Role": "IAM_ROLE",
  };
  return mapping[cfnType] || cfnType.split("::").pop() || "UNKNOWN";
}
