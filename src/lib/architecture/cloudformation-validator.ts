/**
 * CloudFormation Template Validator
 * 
 * Validates CloudFormation templates against AWS specifications before deployment.
 * Based on AWS CloudFormation documentation and cfn-lint standards.
 */

import { CloudFormationTemplate, CloudFormationResource } from "./cloudformation";

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  resourceId?: string;
  property?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  resourceId?: string;
  property?: string;
}

// ============================================
// AWS RESOURCE SPECIFICATIONS
// Based on AWS CloudFormation documentation
// ============================================

interface ResourceSpec {
  requiredProperties: string[];
  optionalProperties: string[];
  propertyValidators?: Record<string, (value: any) => string | null>;
}

const AWS_RESOURCE_SPECS: Record<string, ResourceSpec> = {
  // VPC - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpc.html
  "AWS::EC2::VPC": {
    requiredProperties: [], // CidrBlock OR Ipv4IpamPoolId required (conditional)
    optionalProperties: [
      "CidrBlock", "EnableDnsHostnames", "EnableDnsSupport", 
      "InstanceTenancy", "Ipv4IpamPoolId", "Ipv4NetmaskLength", "Tags"
    ],
    propertyValidators: {
      CidrBlock: (v) => {
        if (v && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(v)) {
          return "CidrBlock must be in CIDR notation (e.g., 10.0.0.0/16)";
        }
        return null;
      },
      InstanceTenancy: (v) => {
        if (v && !["default", "dedicated", "host"].includes(v)) {
          return "InstanceTenancy must be 'default', 'dedicated', or 'host'";
        }
        return null;
      },
    },
  },

  // Subnet - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html
  "AWS::EC2::Subnet": {
    requiredProperties: ["VpcId"], // CidrBlock OR Ipv4IpamPoolId required
    optionalProperties: [
      "AvailabilityZone", "AvailabilityZoneId", "CidrBlock", 
      "EnableDns64", "Ipv6CidrBlock", "MapPublicIpOnLaunch", "Tags"
    ],
    propertyValidators: {
      CidrBlock: (v) => {
        if (v && typeof v === "string" && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(v)) {
          return "CidrBlock must be in CIDR notation";
        }
        return null;
      },
    },
  },

  // Internet Gateway
  "AWS::EC2::InternetGateway": {
    requiredProperties: [],
    optionalProperties: ["Tags"],
  },

  // NAT Gateway - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-natgateway.html
  "AWS::EC2::NatGateway": {
    requiredProperties: ["SubnetId"], // AllocationId required for public NAT
    optionalProperties: [
      "AllocationId", "ConnectivityType", "MaxDrainDurationSeconds",
      "PrivateIpAddress", "SecondaryAllocationIds", "Tags"
    ],
    propertyValidators: {
      ConnectivityType: (v) => {
        if (v && !["public", "private"].includes(v)) {
          return "ConnectivityType must be 'public' or 'private'";
        }
        return null;
      },
    },
  },

  // Security Group
  "AWS::EC2::SecurityGroup": {
    requiredProperties: ["GroupDescription"],
    optionalProperties: [
      "GroupName", "SecurityGroupEgress", "SecurityGroupIngress", 
      "Tags", "VpcId"
    ],
    propertyValidators: {
      GroupDescription: (v) => {
        if (!v || v.length === 0) {
          return "GroupDescription is required and cannot be empty";
        }
        if (v.length > 255) {
          return "GroupDescription must be 255 characters or less";
        }
        return null;
      },
    },
  },

  // EC2 Instance - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-instance.html
  "AWS::EC2::Instance": {
    requiredProperties: [], // ImageId or LaunchTemplate required (conditional)
    optionalProperties: [
      "ImageId", "InstanceType", "KeyName", "SecurityGroupIds",
      "SubnetId", "Tags", "UserData", "IamInstanceProfile"
    ],
    propertyValidators: {
      InstanceType: (v) => {
        if (v && typeof v === "string" && !/^[a-z][a-z0-9]*\.[a-z0-9]+$/.test(v)) {
          return "InstanceType format invalid (e.g., t3.micro)";
        }
        return null;
      },
    },
  },

  // S3 Bucket - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html
  "AWS::S3::Bucket": {
    requiredProperties: [],
    optionalProperties: [
      "BucketName", "VersioningConfiguration", "PublicAccessBlockConfiguration",
      "BucketEncryption", "Tags", "LifecycleConfiguration"
    ],
    propertyValidators: {
      BucketName: (v) => {
        if (v) {
          if (v.length < 3 || v.length > 63) {
            return "BucketName must be between 3 and 63 characters";
          }
          if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(v)) {
            return "BucketName must start/end with letter or number, contain only lowercase letters, numbers, hyphens, and periods";
          }
          if (/\.\./.test(v)) {
            return "BucketName cannot contain consecutive periods";
          }
          if (/^\d+\.\d+\.\d+\.\d+$/.test(v)) {
            return "BucketName cannot be formatted as an IP address";
          }
        }
        return null;
      },
    },
  },

  // Lambda Function - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
  "AWS::Lambda::Function": {
    requiredProperties: ["Code", "Role"], // Required per AWS docs
    optionalProperties: [
      "FunctionName", "Runtime", "Handler", "MemorySize", "Timeout",
      "Description", "Environment", "Tags", "Architectures"
    ],
    propertyValidators: {
      FunctionName: (v) => {
        if (v && (v.length < 1 || v.length > 64)) {
          return "FunctionName must be between 1 and 64 characters";
        }
        return null;
      },
      Runtime: (v) => {
        const validRuntimes = [
          "nodejs18.x", "nodejs20.x", "nodejs22.x",
          "python3.9", "python3.10", "python3.11", "python3.12", "python3.13",
          "java11", "java17", "java21",
          "dotnet6", "dotnet8",
          "ruby3.2", "ruby3.3",
          "provided.al2", "provided.al2023"
        ];
        if (v && !validRuntimes.includes(v)) {
          return `Runtime '${v}' is not valid. Use one of: ${validRuntimes.slice(0, 5).join(", ")}...`;
        }
        return null;
      },
      MemorySize: (v) => {
        if (v && (v < 128 || v > 10240)) {
          return "MemorySize must be between 128 and 10240 MB";
        }
        return null;
      },
      Timeout: (v) => {
        if (v && (v < 1 || v > 900)) {
          return "Timeout must be between 1 and 900 seconds";
        }
        return null;
      },
      Handler: (v) => {
        if (v && !/^[^\s]+$/.test(v)) {
          return "Handler cannot contain whitespace";
        }
        return null;
      },
    },
  },

  // DynamoDB Table
  "AWS::DynamoDB::Table": {
    requiredProperties: ["KeySchema", "AttributeDefinitions"],
    optionalProperties: [
      "TableName", "BillingMode", "ProvisionedThroughput", 
      "GlobalSecondaryIndexes", "LocalSecondaryIndexes", "Tags"
    ],
    propertyValidators: {
      BillingMode: (v) => {
        if (v && !["PROVISIONED", "PAY_PER_REQUEST"].includes(v)) {
          return "BillingMode must be 'PROVISIONED' or 'PAY_PER_REQUEST'";
        }
        return null;
      },
    },
  },

  // RDS DBInstance - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html
  "AWS::RDS::DBInstance": {
    requiredProperties: ["DBInstanceClass"], // Engine required unless restoring
    optionalProperties: [
      "AllocatedStorage", "Engine", "EngineVersion", "MasterUsername",
      "MasterUserPassword", "DBName", "VPCSecurityGroups", "DBSubnetGroupName",
      "MultiAZ", "StorageType", "Tags"
    ],
    propertyValidators: {
      DBInstanceClass: (v) => {
        if (v && typeof v === "string" && !v.startsWith("db.")) {
          return "DBInstanceClass must start with 'db.' (e.g., db.t3.micro)";
        }
        return null;
      },
      Engine: (v) => {
        const validEngines = [
          "mysql", "mariadb", "postgres", "oracle-ee", "oracle-se2",
          "sqlserver-ee", "sqlserver-se", "sqlserver-ex", "sqlserver-web",
          "aurora", "aurora-mysql", "aurora-postgresql"
        ];
        if (v && !validEngines.includes(v)) {
          return `Engine '${v}' is not valid`;
        }
        return null;
      },
      AllocatedStorage: (v) => {
        const num = parseInt(v);
        if (v && (isNaN(num) || num < 20 || num > 65536)) {
          return "AllocatedStorage must be between 20 and 65536 GiB";
        }
        return null;
      },
    },
  },

  // SNS Topic
  "AWS::SNS::Topic": {
    requiredProperties: [],
    optionalProperties: ["TopicName", "DisplayName", "Tags", "KmsMasterKeyId"],
  },

  // SQS Queue
  "AWS::SQS::Queue": {
    requiredProperties: [],
    optionalProperties: [
      "QueueName", "VisibilityTimeout", "MessageRetentionPeriod",
      "DelaySeconds", "MaximumMessageSize", "Tags"
    ],
    propertyValidators: {
      VisibilityTimeout: (v) => {
        if (v && (v < 0 || v > 43200)) {
          return "VisibilityTimeout must be between 0 and 43200 seconds";
        }
        return null;
      },
    },
  },

  // ALB
  "AWS::ElasticLoadBalancingV2::LoadBalancer": {
    requiredProperties: [],
    optionalProperties: [
      "Name", "Type", "Subnets", "SecurityGroups", "Scheme", "Tags"
    ],
    propertyValidators: {
      Type: (v) => {
        if (v && !["application", "network", "gateway"].includes(v)) {
          return "Type must be 'application', 'network', or 'gateway'";
        }
        return null;
      },
    },
  },

  // API Gateway
  "AWS::ApiGateway::RestApi": {
    requiredProperties: [],
    optionalProperties: ["Name", "Description", "EndpointConfiguration", "Tags"],
  },

  // IAM Role (for Lambda)
  "AWS::IAM::Role": {
    requiredProperties: ["AssumeRolePolicyDocument"],
    optionalProperties: [
      "RoleName", "Description", "ManagedPolicyArns", "Policies", "Tags"
    ],
  },

  // Elastic IP (for NAT Gateway)
  "AWS::EC2::EIP": {
    requiredProperties: [],
    optionalProperties: ["Domain", "Tags"],
    propertyValidators: {
      Domain: (v) => {
        if (v && v !== "vpc") {
          return "Domain should be 'vpc' for VPC EIPs";
        }
        return null;
      },
    },
  },
};

// ============================================
// TEMPLATE STRUCTURE VALIDATION
// ============================================

function validateTemplateStructure(template: CloudFormationTemplate): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check required top-level keys
  if (template.AWSTemplateFormatVersion !== "2010-09-09") {
    errors.push({
      code: "E1001",
      message: "AWSTemplateFormatVersion must be '2010-09-09'",
    });
  }

  if (!template.Resources || Object.keys(template.Resources).length === 0) {
    errors.push({
      code: "E1002",
      message: "Template must contain at least one resource",
    });
  }

  // Validate logical IDs
  for (const logicalId of Object.keys(template.Resources || {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(logicalId)) {
      errors.push({
        code: "E1003",
        message: `Logical ID '${logicalId}' is invalid. Must be alphanumeric and start with a letter`,
        resourceId: logicalId,
      });
    }
    if (logicalId.length > 255) {
      errors.push({
        code: "E1004",
        message: `Logical ID '${logicalId}' exceeds 255 characters`,
        resourceId: logicalId,
      });
    }
  }

  return errors;
}

// ============================================
// RESOURCE VALIDATION
// ============================================

function validateResource(
  logicalId: string,
  resource: CloudFormationResource
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const spec = AWS_RESOURCE_SPECS[resource.Type];
  
  if (!spec) {
    warnings.push({
      code: "W2001",
      message: `Unknown resource type '${resource.Type}' - cannot validate properties`,
      resourceId: logicalId,
    });
    return { errors, warnings };
  }

  // Check required properties
  for (const required of spec.requiredProperties) {
    if (!(required in resource.Properties)) {
      errors.push({
        code: "E2001",
        message: `Missing required property '${required}'`,
        resourceId: logicalId,
        property: required,
      });
    }
  }

  // Validate property values
  if (spec.propertyValidators) {
    for (const [prop, validator] of Object.entries(spec.propertyValidators)) {
      if (prop in resource.Properties) {
        const error = validator(resource.Properties[prop]);
        if (error) {
          errors.push({
            code: "E2002",
            message: error,
            resourceId: logicalId,
            property: prop,
          });
        }
      }
    }
  }

  // Check for unknown properties (warning only)
  const allKnownProps = [...spec.requiredProperties, ...spec.optionalProperties];
  for (const prop of Object.keys(resource.Properties)) {
    if (!allKnownProps.includes(prop)) {
      warnings.push({
        code: "W2002",
        message: `Unknown property '${prop}' for ${resource.Type}`,
        resourceId: logicalId,
        property: prop,
      });
    }
  }

  return { errors, warnings };
}

// ============================================
// DEPENDENCY VALIDATION
// ============================================

function validateDependencies(template: CloudFormationTemplate): ValidationError[] {
  const errors: ValidationError[] = [];
  const resourceIds = new Set(Object.keys(template.Resources));

  for (const [logicalId, resource] of Object.entries(template.Resources)) {
    // Check DependsOn references
    if (resource.DependsOn) {
      const deps = Array.isArray(resource.DependsOn) ? resource.DependsOn : [resource.DependsOn];
      for (const dep of deps) {
        if (!resourceIds.has(dep)) {
          errors.push({
            code: "E3001",
            message: `DependsOn references non-existent resource '${dep}'`,
            resourceId: logicalId,
          });
        }
      }
    }

    // Check Ref and Fn::GetAtt references in properties
    const refs = extractReferences(resource.Properties);
    for (const ref of refs) {
      if (!resourceIds.has(ref) && !isIntrinsicParameter(ref)) {
        errors.push({
          code: "E3002",
          message: `Reference to non-existent resource '${ref}'`,
          resourceId: logicalId,
        });
      }
    }
  }

  // Check for circular dependencies
  const circularDeps = detectCircularDependencies(template);
  for (const cycle of circularDeps) {
    errors.push({
      code: "E3003",
      message: `Circular dependency detected: ${cycle.join(" -> ")}`,
    });
  }

  return errors;
}

function extractReferences(obj: any, refs: string[] = []): string[] {
  if (!obj || typeof obj !== "object") return refs;

  if (obj.Ref && typeof obj.Ref === "string") {
    refs.push(obj.Ref);
  }
  if (obj["Fn::GetAtt"]) {
    const attr = obj["Fn::GetAtt"];
    if (Array.isArray(attr) && attr.length > 0) {
      refs.push(attr[0]);
    }
  }

  for (const value of Object.values(obj)) {
    extractReferences(value, refs);
  }

  return refs;
}

function isIntrinsicParameter(ref: string): boolean {
  // AWS pseudo parameters
  const pseudoParams = [
    "AWS::AccountId", "AWS::NotificationARNs", "AWS::NoValue",
    "AWS::Partition", "AWS::Region", "AWS::StackId", "AWS::StackName", "AWS::URLSuffix"
  ];
  return pseudoParams.includes(ref) || ref.startsWith("AWS::");
}

function detectCircularDependencies(template: CloudFormationTemplate): string[][] {
  const cycles: string[][] = [];
  const graph: Record<string, string[]> = {};

  // Build dependency graph
  for (const [logicalId, resource] of Object.entries(template.Resources)) {
    graph[logicalId] = [];
    
    if (resource.DependsOn) {
      const deps = Array.isArray(resource.DependsOn) ? resource.DependsOn : [resource.DependsOn];
      graph[logicalId].push(...deps);
    }

    // Add implicit dependencies from Ref/GetAtt
    const refs = extractReferences(resource.Properties);
    for (const ref of refs) {
      if (ref in template.Resources && !graph[logicalId].includes(ref)) {
        graph[logicalId].push(ref);
      }
    }
  }

  // DFS to detect cycles
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    for (const neighbor of graph[node] || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        cycles.push([...path.slice(cycleStart), neighbor]);
        return true;
      }
    }

    path.pop();
    recStack.delete(node);
    return false;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate a CloudFormation template
 */
export function validateCloudFormationTemplate(template: CloudFormationTemplate): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Validate template structure
  errors.push(...validateTemplateStructure(template));

  // 2. Validate each resource
  for (const [logicalId, resource] of Object.entries(template.Resources || {})) {
    const result = validateResource(logicalId, resource);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  // 3. Validate dependencies
  errors.push(...validateDependencies(template));

  // 4. Add best practice warnings
  warnings.push(...checkBestPractices(template));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// BEST PRACTICES CHECKS
// ============================================

function checkBestPractices(template: CloudFormationTemplate): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const [logicalId, resource] of Object.entries(template.Resources || {})) {
    // S3: Check for encryption
    if (resource.Type === "AWS::S3::Bucket") {
      if (!resource.Properties.BucketEncryption) {
        warnings.push({
          code: "W3001",
          message: "S3 bucket should have encryption enabled",
          resourceId: logicalId,
        });
      }
    }

    // RDS: Check for encryption and multi-AZ
    if (resource.Type === "AWS::RDS::DBInstance") {
      if (!resource.Properties.StorageEncrypted) {
        warnings.push({
          code: "W3002",
          message: "RDS instance should have storage encryption enabled",
          resourceId: logicalId,
        });
      }
      if (!resource.Properties.MultiAZ) {
        warnings.push({
          code: "W3003",
          message: "Consider enabling Multi-AZ for production RDS instances",
          resourceId: logicalId,
        });
      }
    }

    // Lambda: Check for reasonable timeout
    if (resource.Type === "AWS::Lambda::Function") {
      const timeout = resource.Properties.Timeout;
      if (timeout && timeout > 300) {
        warnings.push({
          code: "W3004",
          message: "Lambda timeout > 5 minutes may indicate need for Step Functions",
          resourceId: logicalId,
        });
      }
    }

    // Security Group: Check for overly permissive rules
    if (resource.Type === "AWS::EC2::SecurityGroup") {
      const ingress = resource.Properties.SecurityGroupIngress || [];
      for (const rule of ingress) {
        if (rule.CidrIp === "0.0.0.0/0" && rule.FromPort !== 443 && rule.FromPort !== 80) {
          warnings.push({
            code: "W3005",
            message: `Security group allows 0.0.0.0/0 on port ${rule.FromPort}`,
            resourceId: logicalId,
          });
        }
      }
    }
  }

  return warnings;
}

// ============================================
// SYNTAX VALIDATION (pre-deployment check)
// ============================================

/**
 * Validate template JSON syntax
 */
export function validateTemplateSyntax(templateJson: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const template = JSON.parse(templateJson);
    
    // Check it's an object
    if (typeof template !== "object" || template === null) {
      errors.push({
        code: "E0001",
        message: "Template must be a JSON object",
      });
      return { valid: false, errors, warnings };
    }

    // Validate as CloudFormation template
    return validateCloudFormationTemplate(template);
  } catch (e: any) {
    errors.push({
      code: "E0002",
      message: `Invalid JSON: ${e.message}`,
    });
    return { valid: false, errors, warnings };
  }
}
