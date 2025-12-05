/**
 * CloudFormation Template Generator - Regression Tests
 * 
 * Tests template generation and validation against AWS CloudFormation specs.
 * Run with: npx jest src/lib/architecture/__tests__/cloudformation.test.ts
 */

import { Node, Edge } from "@xyflow/react";
import { generateCloudFormationTemplate, CloudFormationTemplate } from "../cloudformation";
import { validateCloudFormationTemplate, validateTemplateSyntax } from "../cloudformation-validator";

// ============================================
// TEST HELPERS
// ============================================

function createNode(id: string, type: string, config: Record<string, any> = {}): Node {
  return {
    id,
    type: "awsResource",
    position: { x: 0, y: 0 },
    data: {
      type,
      label: config.name || id,
      ...config,
    },
  };
}

// ============================================
// VPC TESTS
// ============================================

describe("AWS::EC2::VPC", () => {
  it("should generate valid VPC with default CIDR", () => {
    const nodes = [createNode("vpc1", "vpc", { name: "TestVPC" })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.vpc1).toBeDefined();
    expect(template.Resources.vpc1.Type).toBe("AWS::EC2::VPC");
    expect(template.Resources.vpc1.Properties.CidrBlock).toBe("10.0.0.0/16");
    expect(template.Resources.vpc1.Properties.EnableDnsHostnames).toBe(true);
    expect(template.Resources.vpc1.Properties.EnableDnsSupport).toBe(true);
  });

  it("should use custom CIDR when provided", () => {
    const nodes = [createNode("vpc1", "vpc", { cidrBlock: "192.168.0.0/16" })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.vpc1.Properties.CidrBlock).toBe("192.168.0.0/16");
  });

  it("should pass validation", () => {
    const nodes = [createNode("vpc1", "vpc")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    const result = validateCloudFormationTemplate(template);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ============================================
// SUBNET TESTS
// ============================================

describe("AWS::EC2::Subnet", () => {
  it("should generate subnet with VPC reference", () => {
    const nodes = [
      createNode("vpc1", "vpc"),
      createNode("subnet1", "subnet", { cidrBlock: "10.0.1.0/24" }),
    ];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.subnet1.Type).toBe("AWS::EC2::Subnet");
    expect(template.Resources.subnet1.Properties.VpcId).toEqual({ Ref: "vpc1" });
    expect(template.Resources.subnet1.Properties.CidrBlock).toBe("10.0.1.0/24");
  });

  it("should set MapPublicIpOnLaunch for public subnets", () => {
    const nodes = [
      createNode("vpc1", "vpc"),
      createNode("subnet1", "subnet", { isPublic: true }),
    ];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.subnet1.Properties.MapPublicIpOnLaunch).toBe(true);
  });

  it("should have DependsOn for VPC", () => {
    const nodes = [
      createNode("vpc1", "vpc"),
      createNode("subnet1", "subnet"),
    ];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.subnet1.DependsOn).toContain("vpc1");
  });
});

// ============================================
// S3 BUCKET TESTS
// ============================================

describe("AWS::S3::Bucket", () => {
  it("should generate S3 bucket with encryption enabled", () => {
    const nodes = [createNode("bucket1", "s3", { name: "TestBucket" })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.bucket1.Type).toBe("AWS::S3::Bucket");
    expect(template.Resources.bucket1.Properties.BucketEncryption).toBeDefined();
    expect(template.Resources.bucket1.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm).toBe("AES256");
  });

  it("should have public access block enabled", () => {
    const nodes = [createNode("bucket1", "s3")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    const pab = template.Resources.bucket1.Properties.PublicAccessBlockConfiguration;
    expect(pab.BlockPublicAcls).toBe(true);
    expect(pab.BlockPublicPolicy).toBe(true);
    expect(pab.IgnorePublicAcls).toBe(true);
    expect(pab.RestrictPublicBuckets).toBe(true);
  });

  it("should enable versioning when configured", () => {
    const nodes = [createNode("bucket1", "s3", { versioning: true })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.bucket1.Properties.VersioningConfiguration).toEqual({ Status: "Enabled" });
  });

  it("should pass validation", () => {
    const nodes = [createNode("bucket1", "s3")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    const result = validateCloudFormationTemplate(template);
    
    expect(result.valid).toBe(true);
  });
});

// ============================================
// LAMBDA FUNCTION TESTS
// ============================================

describe("AWS::Lambda::Function", () => {
  it("should generate Lambda with required Code and Role", () => {
    const nodes = [createNode("lambda1", "lambda", { name: "TestFunction" })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.lambda1.Type).toBe("AWS::Lambda::Function");
    expect(template.Resources.lambda1.Properties.Code).toBeDefined();
    expect(template.Resources.lambda1.Properties.Role).toBeDefined();
  });

  it("should use default nodejs20.x runtime", () => {
    const nodes = [createNode("lambda1", "lambda")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.lambda1.Properties.Runtime).toBe("nodejs20.x");
  });

  it("should clamp MemorySize to valid range (128-10240)", () => {
    const nodes = [createNode("lambda1", "lambda", { memorySize: 50 })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.lambda1.Properties.MemorySize).toBe(128);
  });

  it("should clamp Timeout to valid range (1-900)", () => {
    const nodes = [createNode("lambda1", "lambda", { timeout: 1000 })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.lambda1.Properties.Timeout).toBe(900);
  });

  it("should use S3 code when s3Bucket is provided", () => {
    const nodes = [createNode("lambda1", "lambda", { 
      s3Bucket: "my-bucket", 
      s3Key: "code.zip" 
    })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.lambda1.Properties.Code.S3Bucket).toBe("my-bucket");
    expect(template.Resources.lambda1.Properties.Code.S3Key).toBe("code.zip");
  });

  it("should have DependsOn for IAM role when not providing roleArn", () => {
    const nodes = [createNode("lambda1", "lambda")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.lambda1.DependsOn).toContain("lambda1Role");
  });
});

// ============================================
// RDS TESTS
// ============================================

describe("AWS::RDS::DBInstance", () => {
  it("should generate RDS with required DBInstanceClass", () => {
    const nodes = [createNode("rds1", "rds", { name: "TestDB" })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.rds1.Type).toBe("AWS::RDS::DBInstance");
    expect(template.Resources.rds1.Properties.DBInstanceClass).toBe("db.t3.micro");
  });

  it("should have storage encryption enabled by default", () => {
    const nodes = [createNode("rds1", "rds")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.rds1.Properties.StorageEncrypted).toBe(true);
  });

  it("should have backup retention configured", () => {
    const nodes = [createNode("rds1", "rds")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.rds1.Properties.BackupRetentionPeriod).toBe(7);
  });

  it("should use mysql engine by default", () => {
    const nodes = [createNode("rds1", "rds")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.rds1.Properties.Engine).toBe("mysql");
  });

  it("should convert AllocatedStorage to string", () => {
    const nodes = [createNode("rds1", "rds", { allocatedStorage: 100 })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.rds1.Properties.AllocatedStorage).toBe("100");
  });
});

// ============================================
// DYNAMODB TESTS
// ============================================

describe("AWS::DynamoDB::Table", () => {
  it("should generate DynamoDB with KeySchema and AttributeDefinitions", () => {
    const nodes = [createNode("table1", "dynamodb", { partitionKey: "pk" })];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.table1.Type).toBe("AWS::DynamoDB::Table");
    expect(template.Resources.table1.Properties.KeySchema).toContainEqual({
      AttributeName: "pk",
      KeyType: "HASH",
    });
    expect(template.Resources.table1.Properties.AttributeDefinitions).toContainEqual({
      AttributeName: "pk",
      AttributeType: "S",
    });
  });

  it("should use PAY_PER_REQUEST billing by default", () => {
    const nodes = [createNode("table1", "dynamodb")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.table1.Properties.BillingMode).toBe("PAY_PER_REQUEST");
  });
});

// ============================================
// SECURITY GROUP TESTS
// ============================================

describe("AWS::EC2::SecurityGroup", () => {
  it("should generate security group with GroupDescription", () => {
    const nodes = [
      createNode("vpc1", "vpc"),
      createNode("sg1", "security-group", { description: "Test SG" }),
    ];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Resources.sg1.Type).toBe("AWS::EC2::SecurityGroup");
    expect(template.Resources.sg1.Properties.GroupDescription).toBe("Test SG");
  });

  it("should have default ingress rules for 80 and 443", () => {
    const nodes = [
      createNode("vpc1", "vpc"),
      createNode("sg1", "security-group"),
    ];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    const ingress = template.Resources.sg1.Properties.SecurityGroupIngress;
    expect(ingress).toContainEqual(expect.objectContaining({ FromPort: 443, ToPort: 443 }));
    expect(ingress).toContainEqual(expect.objectContaining({ FromPort: 80, ToPort: 80 }));
  });
});

// ============================================
// TEMPLATE STRUCTURE TESTS
// ============================================

describe("Template Structure", () => {
  it("should have correct AWSTemplateFormatVersion", () => {
    const nodes = [createNode("vpc1", "vpc")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.AWSTemplateFormatVersion).toBe("2010-09-09");
  });

  it("should have Description", () => {
    const nodes = [createNode("vpc1", "vpc")];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch", "Custom description");
    
    expect(template.Description).toBe("Custom description");
  });

  it("should generate Outputs for key resources", () => {
    const nodes = [
      createNode("vpc1", "vpc"),
      createNode("bucket1", "s3"),
    ];
    const template = generateCloudFormationTemplate(nodes, [], "TestArch");
    
    expect(template.Outputs).toBeDefined();
    expect(template.Outputs!.vpc1Id).toBeDefined();
    expect(template.Outputs!.bucket1Name).toBeDefined();
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe("Template Validation", () => {
  it("should reject empty template", () => {
    const template: CloudFormationTemplate = {
      AWSTemplateFormatVersion: "2010-09-09",
      Description: "Empty",
      Resources: {},
    };
    const result = validateCloudFormationTemplate(template);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "E1002")).toBe(true);
  });

  it("should reject invalid logical IDs", () => {
    const template: CloudFormationTemplate = {
      AWSTemplateFormatVersion: "2010-09-09",
      Description: "Test",
      Resources: {
        "123invalid": {
          Type: "AWS::EC2::VPC",
          Properties: { CidrBlock: "10.0.0.0/16" },
        },
      },
    };
    const result = validateCloudFormationTemplate(template);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "E1003")).toBe(true);
  });

  it("should detect circular dependencies", () => {
    const template: CloudFormationTemplate = {
      AWSTemplateFormatVersion: "2010-09-09",
      Description: "Test",
      Resources: {
        ResourceA: {
          Type: "AWS::EC2::VPC",
          Properties: { CidrBlock: "10.0.0.0/16" },
          DependsOn: "ResourceB",
        },
        ResourceB: {
          Type: "AWS::EC2::VPC",
          Properties: { CidrBlock: "10.1.0.0/16" },
          DependsOn: "ResourceA",
        },
      },
    };
    const result = validateCloudFormationTemplate(template);
    
    expect(result.errors.some(e => e.code === "E3003")).toBe(true);
  });

  it("should detect missing required properties", () => {
    const template: CloudFormationTemplate = {
      AWSTemplateFormatVersion: "2010-09-09",
      Description: "Test",
      Resources: {
        MySG: {
          Type: "AWS::EC2::SecurityGroup",
          Properties: {
            // Missing GroupDescription - required
            VpcId: "vpc-123",
          },
        },
      },
    };
    const result = validateCloudFormationTemplate(template);
    
    expect(result.errors.some(e => e.property === "GroupDescription")).toBe(true);
  });

  it("should warn about missing S3 encryption", () => {
    const template: CloudFormationTemplate = {
      AWSTemplateFormatVersion: "2010-09-09",
      Description: "Test",
      Resources: {
        MyBucket: {
          Type: "AWS::S3::Bucket",
          Properties: {},
        },
      },
    };
    const result = validateCloudFormationTemplate(template);
    
    expect(result.warnings.some(w => w.code === "W3001")).toBe(true);
  });

  it("should validate JSON syntax", () => {
    const invalidJson = "{ invalid json }";
    const result = validateTemplateSyntax(invalidJson);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "E0002")).toBe(true);
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe("Full Architecture Generation", () => {
  it("should generate valid 3-tier architecture", () => {
    const nodes = [
      createNode("vpc1", "vpc", { cidrBlock: "10.0.0.0/16" }),
      createNode("publicSubnet", "subnet", { cidrBlock: "10.0.1.0/24", isPublic: true }),
      createNode("privateSubnet", "subnet", { cidrBlock: "10.0.2.0/24" }),
      createNode("webSg", "security-group", { description: "Web tier SG" }),
      createNode("appSg", "security-group", { description: "App tier SG" }),
      createNode("webServer", "ec2", { instanceType: "t3.small" }),
      createNode("appServer", "ec2", { instanceType: "t3.medium" }),
      createNode("database", "rds", { engine: "postgres", instanceClass: "db.t3.small" }),
      createNode("staticAssets", "s3", { versioning: true }),
    ];
    
    const template = generateCloudFormationTemplate(nodes, [], "ThreeTierApp");
    const result = validateCloudFormationTemplate(template);
    
    // Should be valid
    expect(result.valid).toBe(true);
    
    // Should have all resources
    expect(Object.keys(template.Resources)).toHaveLength(9);
    
    // Check resource types
    expect(template.Resources.vpc1.Type).toBe("AWS::EC2::VPC");
    expect(template.Resources.publicSubnet.Type).toBe("AWS::EC2::Subnet");
    expect(template.Resources.webServer.Type).toBe("AWS::EC2::Instance");
    expect(template.Resources.database.Type).toBe("AWS::RDS::DBInstance");
    expect(template.Resources.staticAssets.Type).toBe("AWS::S3::Bucket");
  });

  it("should generate valid serverless architecture", () => {
    const nodes = [
      createNode("api", "api-gateway", { name: "MyAPI" }),
      createNode("handler", "lambda", { runtime: "nodejs20.x", memorySize: 256 }),
      createNode("dataStore", "dynamodb", { partitionKey: "id" }),
      createNode("notifications", "sns"),
      createNode("queue", "sqs", { visibilityTimeout: 60 }),
    ];
    
    const template = generateCloudFormationTemplate(nodes, [], "ServerlessApp");
    const result = validateCloudFormationTemplate(template);
    
    expect(result.valid).toBe(true);
    expect(template.Resources.api.Type).toBe("AWS::ApiGateway::RestApi");
    expect(template.Resources.handler.Type).toBe("AWS::Lambda::Function");
    expect(template.Resources.dataStore.Type).toBe("AWS::DynamoDB::Table");
  });
});
