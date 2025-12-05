// CloudFlow Node Registry
// All available node types for the workflow builder

import { CloudNodeDefinition } from "./types";

// ============================================
// TRIGGER NODES
// ============================================

const triggerNodes: CloudNodeDefinition[] = [
  {
    id: "trigger.manual",
    type: "trigger",
    provider: "generic",
    category: "trigger",
    label: "Manual Trigger",
    description: "Start workflow manually with a button click",
    icon: "Play",
    color: "#22c55e",
    inputs: [],
    outputs: [{ id: "trigger", label: "Trigger", type: "any" }],
    config: [],
  },
  {
    id: "trigger.cron",
    type: "trigger",
    provider: "generic",
    category: "trigger",
    label: "Schedule",
    description: "Run workflow on a schedule (cron)",
    icon: "Clock",
    color: "#22c55e",
    inputs: [],
    outputs: [{ id: "trigger", label: "Trigger", type: "any" }],
    config: [
      {
        id: "expression",
        label: "Cron Expression",
        type: "text",
        placeholder: "0 0 * * *",
        required: true,
        description: "e.g., '0 0 * * *' for daily at midnight",
      },
      {
        id: "timezone",
        label: "Timezone",
        type: "select",
        options: [
          { label: "UTC", value: "UTC" },
          { label: "US/Eastern", value: "America/New_York" },
          { label: "US/Pacific", value: "America/Los_Angeles" },
          { label: "Europe/London", value: "Europe/London" },
        ],
        default: "UTC",
      },
    ],
  },
  {
    id: "trigger.webhook",
    type: "trigger",
    provider: "generic",
    category: "trigger",
    label: "Webhook",
    description: "Trigger workflow via HTTP webhook",
    icon: "Webhook",
    color: "#22c55e",
    inputs: [],
    outputs: [
      { id: "body", label: "Body", type: "object" },
      { id: "headers", label: "Headers", type: "object" },
    ],
    config: [
      {
        id: "method",
        label: "HTTP Method",
        type: "select",
        options: [
          { label: "POST", value: "POST" },
          { label: "GET", value: "GET" },
          { label: "PUT", value: "PUT" },
        ],
        default: "POST",
      },
    ],
  },
];

// ============================================
// AI/LLM NODES
// ============================================

const aiNodes: CloudNodeDefinition[] = [
  {
    id: "ai.workflow.agent",
    type: "action",
    provider: "generic",
    category: "ai",
    label: "Workflow Agent",
    description: "AI agent specialized in building CloudFlow workflows",
    icon: "Bot",
    color: "#8b5cf6",
    inputs: [{ id: "input", label: "Input", type: "any", required: false }],
    outputs: [
      { id: "response", label: "Response", type: "string" },
      { id: "workflow", label: "Generated Workflow", type: "object" },
    ],
    config: [
      {
        id: "model",
        label: "Model",
        type: "select",
        options: [
          { label: "GPT-5", value: "gpt-5" },
          { label: "GPT-5.1", value: "gpt-5.1" },
          { label: "GPT-4.1", value: "gpt-4.1" },
        ],
        default: "gpt-4.1",
      },
      {
        id: "agentMode",
        label: "Agent Mode",
        type: "select",
        options: [
          { label: "Workflow Builder", value: "builder" },
          { label: "Workflow Optimizer", value: "optimizer" },
          { label: "Debug Assistant", value: "debug" },
        ],
        default: "builder",
      },
    ],
  },
  {
    id: "ai.llm.chat",
    type: "action",
    provider: "generic",
    category: "ai",
    label: "LLM Chat",
    description: "Send a prompt to an LLM and get a response",
    icon: "Brain",
    color: "#10b981",
    inputs: [{ id: "input", label: "Input", type: "any", required: false }],
    outputs: [
      { id: "response", label: "Response", type: "string" },
      { id: "usage", label: "Token Usage", type: "object" },
    ],
    config: [
      {
        id: "model",
        label: "Model",
        type: "select",
        options: [
          { label: "GPT-5", value: "gpt-5" },
          { label: "GPT-5.1", value: "gpt-5.1" },
          { label: "GPT-4.1", value: "gpt-4.1" },
        ],
        default: "gpt-4.1",
      },
      {
        id: "systemPrompt",
        label: "System Prompt",
        type: "textarea",
        placeholder: "You are a helpful assistant...",
      },
      {
        id: "userPrompt",
        label: "User Prompt",
        type: "textarea",
        placeholder: "Enter your prompt or use {{input}} for dynamic input",
        required: true,
      },
      {
        id: "temperature",
        label: "Temperature",
        type: "select",
        options: [
          { label: "0 - Deterministic", value: "0" },
          { label: "0.3 - Focused", value: "0.3" },
          { label: "0.7 - Balanced", value: "0.7" },
          { label: "1.0 - Creative", value: "1" },
        ],
        default: "0.7",
      },
      {
        id: "maxTokens",
        label: "Max Tokens",
        type: "select",
        options: [
          { label: "256", value: "256" },
          { label: "512", value: "512" },
          { label: "1024", value: "1024" },
          { label: "2048", value: "2048" },
          { label: "4096", value: "4096" },
        ],
        default: "1024",
      },
    ],
  },
  {
    id: "ai.llm.completion",
    type: "action",
    provider: "generic",
    category: "ai",
    label: "LLM Completion",
    description: "Generate text completion from a prompt",
    icon: "Sparkles",
    color: "#10b981",
    inputs: [{ id: "input", label: "Input", type: "any", required: false }],
    outputs: [
      { id: "completion", label: "Completion", type: "string" },
      { id: "usage", label: "Token Usage", type: "object" },
    ],
    config: [
      {
        id: "model",
        label: "Model",
        type: "select",
        options: [
          { label: "GPT-5", value: "gpt-5" },
          { label: "GPT-5.1", value: "gpt-5.1" },
          { label: "GPT-4.1", value: "gpt-4.1" },
        ],
        default: "gpt-4.1",
      },
      {
        id: "prompt",
        label: "Prompt",
        type: "textarea",
        placeholder: "Enter prompt or use {{input}} for dynamic input",
        required: true,
      },
      {
        id: "temperature",
        label: "Temperature",
        type: "select",
        options: [
          { label: "0 - Deterministic", value: "0" },
          { label: "0.3 - Focused", value: "0.3" },
          { label: "0.7 - Balanced", value: "0.7" },
          { label: "1.0 - Creative", value: "1" },
        ],
        default: "0.7",
      },
      {
        id: "maxTokens",
        label: "Max Tokens",
        type: "select",
        options: [
          { label: "256", value: "256" },
          { label: "512", value: "512" },
          { label: "1024", value: "1024" },
          { label: "2048", value: "2048" },
          { label: "4096", value: "4096" },
        ],
        default: "1024",
      },
    ],
  },
];

// ============================================
// OUTPUT NODES
// ============================================

const outputNodes: CloudNodeDefinition[] = [
  {
    id: "output.response",
    type: "output",
    provider: "generic",
    category: "output",
    label: "Return Response",
    description: "Return data to webhook caller or store as flow output",
    icon: "Send",
    color: "#8b5cf6",
    inputs: [{ id: "data", label: "Data", type: "any", required: true }],
    outputs: [],
    config: [
      {
        id: "statusCode",
        label: "Status Code",
        type: "select",
        options: [
          { label: "200 OK", value: "200" },
          { label: "201 Created", value: "201" },
          { label: "204 No Content", value: "204" },
          { label: "400 Bad Request", value: "400" },
          { label: "500 Error", value: "500" },
        ],
        default: "200",
      },
      {
        id: "contentType",
        label: "Content Type",
        type: "select",
        options: [
          { label: "JSON", value: "application/json" },
          { label: "Text", value: "text/plain" },
          { label: "HTML", value: "text/html" },
        ],
        default: "application/json",
      },
    ],
  },
  {
    id: "output.log",
    type: "output",
    provider: "generic",
    category: "output",
    label: "Log Output",
    description: "Log the result and store in execution history",
    icon: "FileText",
    color: "#8b5cf6",
    inputs: [{ id: "data", label: "Data", type: "any", required: true }],
    outputs: [],
    config: [
      {
        id: "level",
        label: "Log Level",
        type: "select",
        options: [
          { label: "Info", value: "info" },
          { label: "Success", value: "success" },
          { label: "Warning", value: "warning" },
          { label: "Error", value: "error" },
        ],
        default: "info",
      },
      {
        id: "message",
        label: "Message Template",
        type: "textarea",
        placeholder: "Flow completed with result: {{data}}",
      },
    ],
  },
  {
    id: "output.webhook",
    type: "output",
    provider: "generic",
    category: "output",
    label: "Send to Webhook",
    description: "Send final output to an external webhook",
    icon: "Webhook",
    color: "#8b5cf6",
    inputs: [{ id: "data", label: "Data", type: "any", required: true }],
    outputs: [],
    config: [
      {
        id: "url",
        label: "Webhook URL",
        type: "text",
        placeholder: "https://example.com/webhook",
        required: true,
      },
      {
        id: "method",
        label: "HTTP Method",
        type: "select",
        options: [
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
        ],
        default: "POST",
      },
      {
        id: "headers",
        label: "Headers (JSON)",
        type: "textarea",
        placeholder: '{"Authorization": "Bearer token"}',
      },
    ],
  },
];

// ============================================
// AWS COMPUTE NODES
// ============================================

const awsComputeNodes: CloudNodeDefinition[] = [
  {
    id: "aws.ec2.create",
    type: "action",
    provider: "aws",
    category: "aws-compute",
    label: "Create EC2 Instance",
    description: "Launch a new EC2 instance",
    icon: "Server",
    color: "#f97316",
    inputs: [{ id: "config", label: "Config", type: "object", required: false }],
    outputs: [
      { id: "instanceId", label: "Instance ID", type: "string" },
      { id: "publicIp", label: "Public IP", type: "string" },
    ],
    config: [
      {
        id: "instanceType",
        label: "Instance Type",
        type: "select",
        options: [
          { label: "t3.micro", value: "t3.micro" },
          { label: "t3.small", value: "t3.small" },
          { label: "t3.medium", value: "t3.medium" },
          { label: "t3.large", value: "t3.large" },
          { label: "m5.large", value: "m5.large" },
          { label: "m5.xlarge", value: "m5.xlarge" },
        ],
        required: true,
        default: "t3.micro",
      },
      {
        id: "ami",
        label: "AMI ID",
        type: "text",
        placeholder: "ami-0123456789abcdef0",
        required: true,
      },
      {
        id: "keyName",
        label: "Key Pair Name",
        type: "text",
        placeholder: "my-key-pair",
      },
      {
        id: "securityGroupIds",
        label: "Security Group IDs",
        type: "text",
        placeholder: "sg-xxx,sg-yyy",
        description: "Comma-separated list",
      },
    ],
    iamRequired: ["ec2:RunInstances", "ec2:DescribeInstances"],
  },
  {
    id: "aws.ec2.start",
    type: "action",
    provider: "aws",
    category: "aws-compute",
    label: "Start EC2 Instance",
    description: "Start a stopped EC2 instance",
    icon: "Play",
    color: "#f97316",
    inputs: [{ id: "instanceId", label: "Instance ID", type: "string", required: true }],
    outputs: [{ id: "status", label: "Status", type: "string" }],
    config: [
      {
        id: "instanceId",
        label: "Instance ID",
        type: "text",
        placeholder: "i-0123456789abcdef0",
        required: true,
      },
    ],
    iamRequired: ["ec2:StartInstances"],
  },
  {
    id: "aws.ec2.stop",
    type: "action",
    provider: "aws",
    category: "aws-compute",
    label: "Stop EC2 Instance",
    description: "Stop a running EC2 instance",
    icon: "Square",
    color: "#f97316",
    inputs: [{ id: "instanceId", label: "Instance ID", type: "string", required: true }],
    outputs: [{ id: "status", label: "Status", type: "string" }],
    config: [
      {
        id: "instanceId",
        label: "Instance ID",
        type: "text",
        placeholder: "i-0123456789abcdef0",
        required: true,
      },
    ],
    iamRequired: ["ec2:StopInstances"],
  },
  {
    id: "aws.lambda.invoke",
    type: "action",
    provider: "aws",
    category: "aws-compute",
    label: "Invoke Lambda",
    description: "Invoke an AWS Lambda function",
    icon: "Zap",
    color: "#f97316",
    inputs: [{ id: "payload", label: "Payload", type: "object" }],
    outputs: [
      { id: "response", label: "Response", type: "object" },
      { id: "statusCode", label: "Status Code", type: "number" },
    ],
    config: [
      {
        id: "functionName",
        label: "Function Name",
        type: "text",
        placeholder: "my-function",
        required: true,
      },
      {
        id: "invocationType",
        label: "Invocation Type",
        type: "select",
        options: [
          { label: "Synchronous", value: "RequestResponse" },
          { label: "Asynchronous", value: "Event" },
        ],
        default: "RequestResponse",
      },
    ],
    iamRequired: ["lambda:InvokeFunction"],
  },
];

// ============================================
// AWS STORAGE NODES
// ============================================

const awsStorageNodes: CloudNodeDefinition[] = [
  {
    id: "aws.s3.createBucket",
    type: "action",
    provider: "aws",
    category: "aws-storage",
    label: "Create S3 Bucket",
    description: "Create a new S3 bucket",
    icon: "FolderPlus",
    color: "#22c55e",
    inputs: [],
    outputs: [{ id: "bucketName", label: "Bucket Name", type: "string" }],
    config: [
      {
        id: "bucketName",
        label: "Bucket Name",
        type: "text",
        placeholder: "my-bucket-name",
        required: true,
      },
      {
        id: "region",
        label: "Region",
        type: "select",
        options: [
          { label: "US East (N. Virginia)", value: "us-east-1" },
          { label: "US West (Oregon)", value: "us-west-2" },
          { label: "EU (Ireland)", value: "eu-west-1" },
          { label: "EU (London)", value: "eu-west-2" },
          { label: "Asia Pacific (Sydney)", value: "ap-southeast-2" },
        ],
        default: "us-east-1",
      },
    ],
    iamRequired: ["s3:CreateBucket"],
  },
  {
    id: "aws.s3.upload",
    type: "action",
    provider: "aws",
    category: "aws-storage",
    label: "Upload to S3",
    description: "Upload a file or data to S3",
    icon: "Upload",
    color: "#22c55e",
    inputs: [
      { id: "data", label: "Data", type: "any", required: true },
    ],
    outputs: [
      { id: "url", label: "Object URL", type: "string" },
      { id: "key", label: "Object Key", type: "string" },
    ],
    config: [
      {
        id: "bucket",
        label: "Bucket",
        type: "text",
        placeholder: "my-bucket",
        required: true,
      },
      {
        id: "key",
        label: "Object Key",
        type: "text",
        placeholder: "path/to/file.txt",
        required: true,
      },
      {
        id: "contentType",
        label: "Content Type",
        type: "text",
        placeholder: "application/json",
      },
    ],
    iamRequired: ["s3:PutObject"],
  },
  {
    id: "aws.s3.download",
    type: "action",
    provider: "aws",
    category: "aws-storage",
    label: "Download from S3",
    description: "Download a file from S3",
    icon: "Download",
    color: "#22c55e",
    inputs: [],
    outputs: [
      { id: "data", label: "Data", type: "any" },
      { id: "contentType", label: "Content Type", type: "string" },
    ],
    config: [
      {
        id: "bucket",
        label: "Bucket",
        type: "text",
        placeholder: "my-bucket",
        required: true,
      },
      {
        id: "key",
        label: "Object Key",
        type: "text",
        placeholder: "path/to/file.txt",
        required: true,
      },
    ],
    iamRequired: ["s3:GetObject"],
  },
];

// ============================================
// AWS DATABASE NODES
// ============================================

const awsDatabaseNodes: CloudNodeDefinition[] = [
  {
    id: "aws.rds.snapshot",
    type: "action",
    provider: "aws",
    category: "aws-database",
    label: "Create RDS Snapshot",
    description: "Create a snapshot of an RDS database",
    icon: "Database",
    color: "#3b82f6",
    inputs: [],
    outputs: [{ id: "snapshotId", label: "Snapshot ID", type: "string" }],
    config: [
      {
        id: "dbInstanceId",
        label: "DB Instance ID",
        type: "text",
        placeholder: "my-database",
        required: true,
      },
      {
        id: "snapshotId",
        label: "Snapshot ID",
        type: "text",
        placeholder: "my-snapshot-{{timestamp}}",
        required: true,
      },
    ],
    iamRequired: ["rds:CreateDBSnapshot"],
  },
  {
    id: "aws.dynamodb.putItem",
    type: "action",
    provider: "aws",
    category: "aws-database",
    label: "DynamoDB Put Item",
    description: "Insert or update an item in DynamoDB",
    icon: "Database",
    color: "#3b82f6",
    inputs: [{ id: "item", label: "Item", type: "object", required: true }],
    outputs: [{ id: "result", label: "Result", type: "object" }],
    config: [
      {
        id: "tableName",
        label: "Table Name",
        type: "text",
        placeholder: "my-table",
        required: true,
      },
    ],
    iamRequired: ["dynamodb:PutItem"],
  },
];

// ============================================
// AWS INTEGRATION NODES
// ============================================

const awsIntegrationNodes: CloudNodeDefinition[] = [
  {
    id: "aws.sns.publish",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "SNS Publish",
    description: "Publish a message to an SNS topic",
    icon: "Bell",
    color: "#ff9900",
    inputs: [{ id: "message", label: "Message", type: "string" }],
    outputs: [{ id: "messageId", label: "Message ID", type: "string" }],
    config: [
      { id: "topicArn", label: "Topic ARN", type: "text", placeholder: "arn:aws:sns:region:account:topic", required: true },
      { id: "subject", label: "Subject", type: "text", placeholder: "Notification subject" },
    ],
    iamRequired: ["sns:Publish"],
  },
  {
    id: "aws.sqs.send",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "SQS Send Message",
    description: "Send a message to an SQS queue",
    icon: "MessageSquare",
    color: "#ff9900",
    inputs: [{ id: "message", label: "Message", type: "any" }],
    outputs: [{ id: "messageId", label: "Message ID", type: "string" }],
    config: [
      { id: "queueUrl", label: "Queue URL", type: "text", placeholder: "https://sqs.region.amazonaws.com/account/queue", required: true },
      { id: "delaySeconds", label: "Delay (seconds)", type: "number", default: 0 },
    ],
    iamRequired: ["sqs:SendMessage"],
  },
  {
    id: "aws.sqs.receive",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "SQS Receive Messages",
    description: "Receive messages from an SQS queue",
    icon: "MessageSquare",
    color: "#ff9900",
    inputs: [],
    outputs: [{ id: "messages", label: "Messages", type: "array" }],
    config: [
      { id: "queueUrl", label: "Queue URL", type: "text", placeholder: "https://sqs.region.amazonaws.com/account/queue", required: true },
      { id: "maxMessages", label: "Max Messages", type: "number", default: 10 },
      { id: "waitTimeSeconds", label: "Wait Time (seconds)", type: "number", default: 20 },
    ],
    iamRequired: ["sqs:ReceiveMessage"],
  },
  {
    id: "aws.eventbridge.putEvent",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "EventBridge Put Event",
    description: "Send an event to EventBridge",
    icon: "Radio",
    color: "#ff9900",
    inputs: [{ id: "detail", label: "Event Detail", type: "object", required: true }],
    outputs: [{ id: "eventId", label: "Event ID", type: "string" }],
    config: [
      { id: "eventBusName", label: "Event Bus Name", type: "text", placeholder: "default", default: "default" },
      { id: "source", label: "Source", type: "text", placeholder: "my.application", required: true },
      { id: "detailType", label: "Detail Type", type: "text", placeholder: "MyEvent", required: true },
    ],
    iamRequired: ["events:PutEvents"],
  },
  {
    id: "aws.ses.sendEmail",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "SES Send Email",
    description: "Send an email via Amazon SES",
    icon: "Mail",
    color: "#ff9900",
    inputs: [{ id: "body", label: "Email Body", type: "string" }],
    outputs: [{ id: "messageId", label: "Message ID", type: "string" }],
    config: [
      { id: "to", label: "To", type: "text", placeholder: "recipient@example.com", required: true },
      { id: "from", label: "From", type: "text", placeholder: "sender@example.com", required: true },
      { id: "subject", label: "Subject", type: "text", placeholder: "Email subject", required: true },
      { id: "isHtml", label: "HTML Email", type: "boolean", default: false },
    ],
    iamRequired: ["ses:SendEmail"],
  },
  {
    id: "aws.secretsmanager.getSecret",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "Get Secret",
    description: "Retrieve a secret from Secrets Manager",
    icon: "Key",
    color: "#ff9900",
    inputs: [],
    outputs: [{ id: "secretValue", label: "Secret Value", type: "string" }],
    config: [
      { id: "secretId", label: "Secret ID", type: "text", placeholder: "my-secret", required: true },
      { id: "versionStage", label: "Version Stage", type: "text", placeholder: "AWSCURRENT", default: "AWSCURRENT" },
    ],
    iamRequired: ["secretsmanager:GetSecretValue"],
  },
  {
    id: "aws.stepfunctions.startExecution",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "Start Step Function",
    description: "Start a Step Functions state machine execution",
    icon: "Workflow",
    color: "#ff9900",
    inputs: [{ id: "input", label: "Input", type: "object" }],
    outputs: [
      { id: "executionArn", label: "Execution ARN", type: "string" },
      { id: "startDate", label: "Start Date", type: "string" },
    ],
    config: [
      { id: "stateMachineArn", label: "State Machine ARN", type: "text", placeholder: "arn:aws:states:...", required: true },
      { id: "name", label: "Execution Name", type: "text", placeholder: "Optional unique name" },
    ],
    iamRequired: ["states:StartExecution"],
  },
  {
    id: "aws.kinesis.putRecord",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "Kinesis Put Record",
    description: "Put a record into a Kinesis stream",
    icon: "Activity",
    color: "#ff9900",
    inputs: [{ id: "data", label: "Data", type: "any", required: true }],
    outputs: [
      { id: "shardId", label: "Shard ID", type: "string" },
      { id: "sequenceNumber", label: "Sequence Number", type: "string" },
    ],
    config: [
      { id: "streamName", label: "Stream Name", type: "text", placeholder: "my-stream", required: true },
      { id: "partitionKey", label: "Partition Key", type: "text", placeholder: "partition-key", required: true },
    ],
    iamRequired: ["kinesis:PutRecord"],
  },
];

// ============================================
// AWS NETWORKING NODES
// ============================================

const awsNetworkingNodes: CloudNodeDefinition[] = [
  {
    id: "aws.apigateway.invoke",
    type: "action",
    provider: "aws",
    category: "aws-networking",
    label: "API Gateway Invoke",
    description: "Invoke an API Gateway endpoint",
    icon: "Globe",
    color: "#ff9900",
    inputs: [{ id: "body", label: "Request Body", type: "any" }],
    outputs: [
      { id: "response", label: "Response", type: "any" },
      { id: "statusCode", label: "Status Code", type: "number" },
    ],
    config: [
      { id: "apiId", label: "API ID", type: "text", placeholder: "abc123", required: true },
      { id: "stage", label: "Stage", type: "text", placeholder: "prod", required: true },
      { id: "path", label: "Path", type: "text", placeholder: "/users", required: true },
      { id: "method", label: "Method", type: "select", options: [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" },
        { label: "DELETE", value: "DELETE" },
      ], default: "GET" },
    ],
  },
  {
    id: "aws.route53.changeRecord",
    type: "action",
    provider: "aws",
    category: "aws-networking",
    label: "Route 53 Change Record",
    description: "Create, update, or delete a DNS record",
    icon: "Globe",
    color: "#ff9900",
    inputs: [],
    outputs: [{ id: "changeId", label: "Change ID", type: "string" }],
    config: [
      { id: "hostedZoneId", label: "Hosted Zone ID", type: "text", placeholder: "Z1234567890ABC", required: true },
      { id: "recordName", label: "Record Name", type: "text", placeholder: "api.example.com", required: true },
      { id: "recordType", label: "Record Type", type: "select", options: [
        { label: "A", value: "A" },
        { label: "AAAA", value: "AAAA" },
        { label: "CNAME", value: "CNAME" },
        { label: "TXT", value: "TXT" },
        { label: "MX", value: "MX" },
      ], required: true },
      { id: "recordValue", label: "Record Value", type: "text", placeholder: "1.2.3.4", required: true },
      { id: "ttl", label: "TTL", type: "number", default: 300 },
      { id: "action", label: "Action", type: "select", options: [
        { label: "Create", value: "CREATE" },
        { label: "Update", value: "UPSERT" },
        { label: "Delete", value: "DELETE" },
      ], default: "UPSERT" },
    ],
    iamRequired: ["route53:ChangeResourceRecordSets"],
  },
  {
    id: "aws.cloudfront.invalidate",
    type: "action",
    provider: "aws",
    category: "aws-networking",
    label: "CloudFront Invalidate",
    description: "Invalidate CloudFront cache",
    icon: "Cloud",
    color: "#ff9900",
    inputs: [],
    outputs: [{ id: "invalidationId", label: "Invalidation ID", type: "string" }],
    config: [
      { id: "distributionId", label: "Distribution ID", type: "text", placeholder: "E1234567890ABC", required: true },
      { id: "paths", label: "Paths", type: "text", placeholder: "/*", required: true, description: "Comma-separated paths" },
    ],
    iamRequired: ["cloudfront:CreateInvalidation"],
  },
  {
    id: "aws.elb.registerTarget",
    type: "action",
    provider: "aws",
    category: "aws-networking",
    label: "ELB Register Target",
    description: "Register a target with a target group",
    icon: "Server",
    color: "#ff9900",
    inputs: [],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "targetGroupArn", label: "Target Group ARN", type: "text", required: true },
      { id: "targetId", label: "Target ID", type: "text", placeholder: "i-1234567890abcdef0", required: true },
      { id: "port", label: "Port", type: "number", default: 80 },
    ],
    iamRequired: ["elasticloadbalancing:RegisterTargets"],
  },
];

// ============================================
// AWS MONITORING NODES
// ============================================

const awsMonitoringNodes: CloudNodeDefinition[] = [
  {
    id: "aws.cloudwatch.putMetric",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "CloudWatch Put Metric",
    description: "Publish a custom metric to CloudWatch",
    icon: "BarChart",
    color: "#ff9900",
    inputs: [{ id: "value", label: "Value", type: "number", required: true }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "namespace", label: "Namespace", type: "text", placeholder: "MyApp/Metrics", required: true },
      { id: "metricName", label: "Metric Name", type: "text", placeholder: "RequestCount", required: true },
      { id: "unit", label: "Unit", type: "select", options: [
        { label: "Count", value: "Count" },
        { label: "Seconds", value: "Seconds" },
        { label: "Milliseconds", value: "Milliseconds" },
        { label: "Bytes", value: "Bytes" },
        { label: "Percent", value: "Percent" },
      ], default: "Count" },
    ],
    iamRequired: ["cloudwatch:PutMetricData"],
  },
  {
    id: "aws.cloudwatch.getMetrics",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "CloudWatch Get Metrics",
    description: "Get metric statistics from CloudWatch",
    icon: "BarChart",
    color: "#ff9900",
    inputs: [],
    outputs: [{ id: "datapoints", label: "Datapoints", type: "array" }],
    config: [
      { id: "namespace", label: "Namespace", type: "text", placeholder: "AWS/EC2", required: true },
      { id: "metricName", label: "Metric Name", type: "text", placeholder: "CPUUtilization", required: true },
      { id: "period", label: "Period (seconds)", type: "number", default: 300 },
      { id: "statistic", label: "Statistic", type: "select", options: [
        { label: "Average", value: "Average" },
        { label: "Sum", value: "Sum" },
        { label: "Maximum", value: "Maximum" },
        { label: "Minimum", value: "Minimum" },
      ], default: "Average" },
    ],
    iamRequired: ["cloudwatch:GetMetricStatistics"],
  },
  {
    id: "aws.cloudwatch.putLogEvent",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "CloudWatch Put Log",
    description: "Write a log event to CloudWatch Logs",
    icon: "FileText",
    color: "#ff9900",
    inputs: [{ id: "message", label: "Log Message", type: "string", required: true }],
    outputs: [{ id: "sequenceToken", label: "Sequence Token", type: "string" }],
    config: [
      { id: "logGroupName", label: "Log Group", type: "text", placeholder: "/aws/lambda/my-function", required: true },
      { id: "logStreamName", label: "Log Stream", type: "text", placeholder: "stream-name", required: true },
    ],
    iamRequired: ["logs:PutLogEvents"],
  },
  {
    id: "aws.cloudwatch.setAlarm",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "CloudWatch Set Alarm",
    description: "Create or update a CloudWatch alarm",
    icon: "AlertTriangle",
    color: "#ff9900",
    inputs: [],
    outputs: [{ id: "alarmArn", label: "Alarm ARN", type: "string" }],
    config: [
      { id: "alarmName", label: "Alarm Name", type: "text", required: true },
      { id: "namespace", label: "Namespace", type: "text", placeholder: "AWS/EC2", required: true },
      { id: "metricName", label: "Metric Name", type: "text", placeholder: "CPUUtilization", required: true },
      { id: "threshold", label: "Threshold", type: "number", required: true },
      { id: "comparisonOperator", label: "Comparison", type: "select", options: [
        { label: "Greater Than", value: "GreaterThanThreshold" },
        { label: "Less Than", value: "LessThanThreshold" },
        { label: "Greater or Equal", value: "GreaterThanOrEqualToThreshold" },
        { label: "Less or Equal", value: "LessThanOrEqualToThreshold" },
      ], required: true },
    ],
    iamRequired: ["cloudwatch:PutMetricAlarm"],
  },
];

// ============================================
// AWS AI/ML NODES
// ============================================

const awsAINodes: CloudNodeDefinition[] = [
  {
    id: "aws.bedrock.invoke",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "Bedrock Invoke Model",
    description: "Invoke an AI model via Amazon Bedrock",
    icon: "Brain",
    color: "#ff9900",
    inputs: [{ id: "prompt", label: "Prompt", type: "string", required: true }],
    outputs: [{ id: "response", label: "Response", type: "string" }],
    config: [
      { id: "modelId", label: "Model ID", type: "select", options: [
        { label: "Claude 3 Sonnet", value: "anthropic.claude-3-sonnet-20240229-v1:0" },
        { label: "Claude 3 Haiku", value: "anthropic.claude-3-haiku-20240307-v1:0" },
        { label: "Llama 2 70B", value: "meta.llama2-70b-chat-v1" },
        { label: "Titan Text", value: "amazon.titan-text-express-v1" },
      ], required: true },
      { id: "maxTokens", label: "Max Tokens", type: "number", default: 1000 },
      { id: "temperature", label: "Temperature", type: "number", default: 0.7 },
    ],
    iamRequired: ["bedrock:InvokeModel"],
  },
  {
    id: "aws.rekognition.detectLabels",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "Rekognition Detect Labels",
    description: "Detect objects and scenes in an image",
    icon: "Eye",
    color: "#ff9900",
    inputs: [{ id: "imageBytes", label: "Image Bytes", type: "any" }],
    outputs: [{ id: "labels", label: "Labels", type: "array" }],
    config: [
      { id: "s3Bucket", label: "S3 Bucket", type: "text", placeholder: "my-bucket" },
      { id: "s3Key", label: "S3 Key", type: "text", placeholder: "images/photo.jpg" },
      { id: "maxLabels", label: "Max Labels", type: "number", default: 10 },
      { id: "minConfidence", label: "Min Confidence", type: "number", default: 75 },
    ],
    iamRequired: ["rekognition:DetectLabels"],
  },
  {
    id: "aws.comprehend.detectSentiment",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "Comprehend Sentiment",
    description: "Detect sentiment in text",
    icon: "MessageCircle",
    color: "#ff9900",
    inputs: [{ id: "text", label: "Text", type: "string", required: true }],
    outputs: [
      { id: "sentiment", label: "Sentiment", type: "string" },
      { id: "scores", label: "Scores", type: "object" },
    ],
    config: [
      { id: "languageCode", label: "Language", type: "select", options: [
        { label: "English", value: "en" },
        { label: "Spanish", value: "es" },
        { label: "French", value: "fr" },
        { label: "German", value: "de" },
      ], default: "en" },
    ],
    iamRequired: ["comprehend:DetectSentiment"],
  },
  {
    id: "aws.textract.analyzeDocument",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "Textract Analyze Document",
    description: "Extract text and data from documents",
    icon: "FileText",
    color: "#ff9900",
    inputs: [{ id: "documentBytes", label: "Document Bytes", type: "any" }],
    outputs: [
      { id: "text", label: "Extracted Text", type: "string" },
      { id: "blocks", label: "Blocks", type: "array" },
    ],
    config: [
      { id: "s3Bucket", label: "S3 Bucket", type: "text", placeholder: "my-bucket" },
      { id: "s3Key", label: "S3 Key", type: "text", placeholder: "documents/file.pdf" },
      { id: "featureTypes", label: "Features", type: "select", options: [
        { label: "Tables", value: "TABLES" },
        { label: "Forms", value: "FORMS" },
        { label: "Signatures", value: "SIGNATURES" },
      ] },
    ],
    iamRequired: ["textract:AnalyzeDocument"],
  },
  {
    id: "aws.polly.synthesizeSpeech",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "Polly Text to Speech",
    description: "Convert text to speech audio",
    icon: "Volume2",
    color: "#ff9900",
    inputs: [{ id: "text", label: "Text", type: "string", required: true }],
    outputs: [{ id: "audioStream", label: "Audio Stream", type: "any" }],
    config: [
      { id: "voiceId", label: "Voice", type: "select", options: [
        { label: "Joanna (US Female)", value: "Joanna" },
        { label: "Matthew (US Male)", value: "Matthew" },
        { label: "Amy (UK Female)", value: "Amy" },
        { label: "Brian (UK Male)", value: "Brian" },
      ], default: "Joanna" },
      { id: "outputFormat", label: "Output Format", type: "select", options: [
        { label: "MP3", value: "mp3" },
        { label: "OGG", value: "ogg_vorbis" },
        { label: "PCM", value: "pcm" },
      ], default: "mp3" },
    ],
    iamRequired: ["polly:SynthesizeSpeech"],
  },
  {
    id: "aws.transcribe.startJob",
    type: "action",
    provider: "aws",
    category: "aws-integration",
    label: "Transcribe Start Job",
    description: "Start a transcription job",
    icon: "Mic",
    color: "#ff9900",
    inputs: [],
    outputs: [{ id: "jobName", label: "Job Name", type: "string" }],
    config: [
      { id: "jobName", label: "Job Name", type: "text", required: true },
      { id: "mediaUri", label: "Media S3 URI", type: "text", placeholder: "s3://bucket/audio.mp3", required: true },
      { id: "languageCode", label: "Language", type: "select", options: [
        { label: "English (US)", value: "en-US" },
        { label: "English (UK)", value: "en-GB" },
        { label: "Spanish", value: "es-ES" },
        { label: "French", value: "fr-FR" },
      ], default: "en-US" },
      { id: "outputBucket", label: "Output Bucket", type: "text", required: true },
    ],
    iamRequired: ["transcribe:StartTranscriptionJob"],
  },
];

// ============================================
// GCP COMPUTE NODES
// ============================================

const gcpComputeNodes: CloudNodeDefinition[] = [
  {
    id: "gcp.compute.create",
    type: "action",
    provider: "gcp",
    category: "gcp-compute",
    label: "Create VM Instance",
    description: "Create a new Compute Engine VM instance",
    icon: "Server",
    color: "#4285f4",
    inputs: [{ id: "config", label: "Config", type: "object", required: false }],
    outputs: [
      { id: "instanceId", label: "Instance ID", type: "string" },
      { id: "externalIp", label: "External IP", type: "string" },
    ],
    config: [
      {
        id: "name",
        label: "Instance Name",
        type: "text",
        placeholder: "my-instance",
        required: true,
      },
      {
        id: "machineType",
        label: "Machine Type",
        type: "select",
        options: [
          { label: "e2-micro", value: "e2-micro" },
          { label: "e2-small", value: "e2-small" },
          { label: "e2-medium", value: "e2-medium" },
          { label: "n1-standard-1", value: "n1-standard-1" },
          { label: "n1-standard-2", value: "n1-standard-2" },
          { label: "n2-standard-2", value: "n2-standard-2" },
        ],
        required: true,
        default: "e2-micro",
      },
      {
        id: "zone",
        label: "Zone",
        type: "select",
        options: [
          { label: "us-central1-a", value: "us-central1-a" },
          { label: "us-east1-b", value: "us-east1-b" },
          { label: "europe-west1-b", value: "europe-west1-b" },
          { label: "asia-east1-a", value: "asia-east1-a" },
        ],
        required: true,
        default: "us-central1-a",
      },
      {
        id: "image",
        label: "Boot Image",
        type: "select",
        options: [
          { label: "Debian 11", value: "debian-cloud/debian-11" },
          { label: "Ubuntu 22.04", value: "ubuntu-os-cloud/ubuntu-2204-lts" },
          { label: "CentOS 7", value: "centos-cloud/centos-7" },
        ],
        default: "debian-cloud/debian-11",
      },
    ],
  },
  {
    id: "gcp.compute.start",
    type: "action",
    provider: "gcp",
    category: "gcp-compute",
    label: "Start VM Instance",
    description: "Start a stopped Compute Engine instance",
    icon: "Play",
    color: "#4285f4",
    inputs: [{ id: "instanceName", label: "Instance Name", type: "string", required: true }],
    outputs: [{ id: "status", label: "Status", type: "string" }],
    config: [
      {
        id: "instanceName",
        label: "Instance Name",
        type: "text",
        placeholder: "my-instance",
        required: true,
      },
      {
        id: "zone",
        label: "Zone",
        type: "text",
        placeholder: "us-central1-a",
        required: true,
      },
    ],
  },
  {
    id: "gcp.compute.stop",
    type: "action",
    provider: "gcp",
    category: "gcp-compute",
    label: "Stop VM Instance",
    description: "Stop a running Compute Engine instance",
    icon: "Square",
    color: "#4285f4",
    inputs: [{ id: "instanceName", label: "Instance Name", type: "string", required: true }],
    outputs: [{ id: "status", label: "Status", type: "string" }],
    config: [
      {
        id: "instanceName",
        label: "Instance Name",
        type: "text",
        placeholder: "my-instance",
        required: true,
      },
      {
        id: "zone",
        label: "Zone",
        type: "text",
        placeholder: "us-central1-a",
        required: true,
      },
    ],
  },
  {
    id: "gcp.functions.invoke",
    type: "action",
    provider: "gcp",
    category: "gcp-compute",
    label: "Invoke Cloud Function",
    description: "Invoke a Google Cloud Function",
    icon: "Zap",
    color: "#4285f4",
    inputs: [{ id: "payload", label: "Payload", type: "object" }],
    outputs: [
      { id: "response", label: "Response", type: "object" },
      { id: "statusCode", label: "Status Code", type: "number" },
    ],
    config: [
      {
        id: "functionName",
        label: "Function Name",
        type: "text",
        placeholder: "my-function",
        required: true,
      },
      {
        id: "region",
        label: "Region",
        type: "select",
        options: [
          { label: "us-central1", value: "us-central1" },
          { label: "us-east1", value: "us-east1" },
          { label: "europe-west1", value: "europe-west1" },
        ],
        default: "us-central1",
      },
    ],
  },
  {
    id: "gcp.run.deploy",
    type: "action",
    provider: "gcp",
    category: "gcp-compute",
    label: "Deploy Cloud Run",
    description: "Deploy a container to Cloud Run",
    icon: "Container",
    color: "#4285f4",
    inputs: [{ id: "config", label: "Config", type: "object" }],
    outputs: [
      { id: "serviceUrl", label: "Service URL", type: "string" },
      { id: "revision", label: "Revision", type: "string" },
    ],
    config: [
      {
        id: "serviceName",
        label: "Service Name",
        type: "text",
        placeholder: "my-service",
        required: true,
      },
      {
        id: "image",
        label: "Container Image",
        type: "text",
        placeholder: "gcr.io/project/image:tag",
        required: true,
      },
      {
        id: "region",
        label: "Region",
        type: "select",
        options: [
          { label: "us-central1", value: "us-central1" },
          { label: "us-east1", value: "us-east1" },
          { label: "europe-west1", value: "europe-west1" },
        ],
        default: "us-central1",
      },
      {
        id: "memory",
        label: "Memory",
        type: "select",
        options: [
          { label: "256Mi", value: "256Mi" },
          { label: "512Mi", value: "512Mi" },
          { label: "1Gi", value: "1Gi" },
          { label: "2Gi", value: "2Gi" },
        ],
        default: "256Mi",
      },
    ],
  },
];

// ============================================
// GCP STORAGE NODES
// ============================================

const gcpStorageNodes: CloudNodeDefinition[] = [
  {
    id: "gcp.storage.createBucket",
    type: "action",
    provider: "gcp",
    category: "gcp-storage",
    label: "Create Storage Bucket",
    description: "Create a new Cloud Storage bucket",
    icon: "FolderPlus",
    color: "#34a853",
    inputs: [],
    outputs: [{ id: "bucketName", label: "Bucket Name", type: "string" }],
    config: [
      {
        id: "bucketName",
        label: "Bucket Name",
        type: "text",
        placeholder: "my-bucket-name",
        required: true,
      },
      {
        id: "location",
        label: "Location",
        type: "select",
        options: [
          { label: "US (multi-region)", value: "US" },
          { label: "EU (multi-region)", value: "EU" },
          { label: "us-central1", value: "us-central1" },
          { label: "europe-west1", value: "europe-west1" },
        ],
        default: "US",
      },
      {
        id: "storageClass",
        label: "Storage Class",
        type: "select",
        options: [
          { label: "Standard", value: "STANDARD" },
          { label: "Nearline", value: "NEARLINE" },
          { label: "Coldline", value: "COLDLINE" },
          { label: "Archive", value: "ARCHIVE" },
        ],
        default: "STANDARD",
      },
    ],
  },
  {
    id: "gcp.storage.upload",
    type: "action",
    provider: "gcp",
    category: "gcp-storage",
    label: "Upload to Cloud Storage",
    description: "Upload a file or data to Cloud Storage",
    icon: "Upload",
    color: "#34a853",
    inputs: [{ id: "data", label: "Data", type: "any", required: true }],
    outputs: [
      { id: "url", label: "Object URL", type: "string" },
      { id: "name", label: "Object Name", type: "string" },
    ],
    config: [
      {
        id: "bucket",
        label: "Bucket",
        type: "text",
        placeholder: "my-bucket",
        required: true,
      },
      {
        id: "objectName",
        label: "Object Name",
        type: "text",
        placeholder: "path/to/file.txt",
        required: true,
      },
      {
        id: "contentType",
        label: "Content Type",
        type: "text",
        placeholder: "application/json",
      },
    ],
  },
  {
    id: "gcp.storage.download",
    type: "action",
    provider: "gcp",
    category: "gcp-storage",
    label: "Download from Cloud Storage",
    description: "Download a file from Cloud Storage",
    icon: "Download",
    color: "#34a853",
    inputs: [],
    outputs: [
      { id: "data", label: "Data", type: "any" },
      { id: "contentType", label: "Content Type", type: "string" },
    ],
    config: [
      {
        id: "bucket",
        label: "Bucket",
        type: "text",
        placeholder: "my-bucket",
        required: true,
      },
      {
        id: "objectName",
        label: "Object Name",
        type: "text",
        placeholder: "path/to/file.txt",
        required: true,
      },
    ],
  },
];

// ============================================
// GCP DATABASE NODES
// ============================================

const gcpDatabaseNodes: CloudNodeDefinition[] = [
  {
    id: "gcp.bigquery.query",
    type: "action",
    provider: "gcp",
    category: "gcp-database",
    label: "BigQuery Query",
    description: "Run a SQL query on BigQuery",
    icon: "Database",
    color: "#4285f4",
    inputs: [{ id: "params", label: "Parameters", type: "object" }],
    outputs: [
      { id: "rows", label: "Rows", type: "array" },
      { id: "totalRows", label: "Total Rows", type: "number" },
    ],
    config: [
      {
        id: "query",
        label: "SQL Query",
        type: "textarea",
        placeholder: "SELECT * FROM `project.dataset.table` LIMIT 100",
        required: true,
      },
      {
        id: "projectId",
        label: "Project ID",
        type: "text",
        placeholder: "my-project",
        required: true,
      },
    ],
  },
  {
    id: "gcp.firestore.set",
    type: "action",
    provider: "gcp",
    category: "gcp-database",
    label: "Firestore Set Document",
    description: "Create or update a Firestore document",
    icon: "Database",
    color: "#ffca28",
    inputs: [{ id: "data", label: "Data", type: "object", required: true }],
    outputs: [{ id: "documentId", label: "Document ID", type: "string" }],
    config: [
      {
        id: "collection",
        label: "Collection",
        type: "text",
        placeholder: "users",
        required: true,
      },
      {
        id: "documentId",
        label: "Document ID",
        type: "text",
        placeholder: "Leave empty for auto-generated ID",
      },
    ],
  },
  {
    id: "gcp.firestore.get",
    type: "action",
    provider: "gcp",
    category: "gcp-database",
    label: "Firestore Get Document",
    description: "Get a document from Firestore",
    icon: "Database",
    color: "#ffca28",
    inputs: [],
    outputs: [
      { id: "data", label: "Data", type: "object" },
      { id: "exists", label: "Exists", type: "boolean" },
    ],
    config: [
      {
        id: "collection",
        label: "Collection",
        type: "text",
        placeholder: "users",
        required: true,
      },
      {
        id: "documentId",
        label: "Document ID",
        type: "text",
        placeholder: "user123",
        required: true,
      },
    ],
  },
  {
    id: "gcp.sql.query",
    type: "action",
    provider: "gcp",
    category: "gcp-database",
    label: "Cloud SQL Query",
    description: "Execute a query on Cloud SQL",
    icon: "Database",
    color: "#4285f4",
    inputs: [{ id: "params", label: "Parameters", type: "array" }],
    outputs: [
      { id: "rows", label: "Rows", type: "array" },
      { id: "affectedRows", label: "Affected Rows", type: "number" },
    ],
    config: [
      {
        id: "instanceName",
        label: "Instance Name",
        type: "text",
        placeholder: "my-sql-instance",
        required: true,
      },
      {
        id: "database",
        label: "Database",
        type: "text",
        placeholder: "mydb",
        required: true,
      },
      {
        id: "query",
        label: "SQL Query",
        type: "textarea",
        placeholder: "SELECT * FROM users WHERE id = ?",
        required: true,
      },
    ],
  },
];

// ============================================
// GCP INTEGRATION NODES
// ============================================

const gcpIntegrationNodes: CloudNodeDefinition[] = [
  {
    id: "gcp.pubsub.publish",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Pub/Sub Publish",
    description: "Publish a message to a Pub/Sub topic",
    icon: "Bell",
    color: "#ea4335",
    inputs: [{ id: "message", label: "Message", type: "any" }],
    outputs: [{ id: "messageId", label: "Message ID", type: "string" }],
    config: [
      {
        id: "topicName",
        label: "Topic Name",
        type: "text",
        placeholder: "my-topic",
        required: true,
      },
      {
        id: "attributes",
        label: "Attributes",
        type: "json",
        placeholder: '{"key": "value"}',
      },
    ],
  },
  {
    id: "gcp.tasks.create",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Create Cloud Task",
    description: "Create a task in Cloud Tasks queue",
    icon: "Clock",
    color: "#ea4335",
    inputs: [{ id: "payload", label: "Payload", type: "object" }],
    outputs: [{ id: "taskName", label: "Task Name", type: "string" }],
    config: [
      {
        id: "queueName",
        label: "Queue Name",
        type: "text",
        placeholder: "my-queue",
        required: true,
      },
      {
        id: "targetUrl",
        label: "Target URL",
        type: "text",
        placeholder: "https://my-service.run.app/handler",
        required: true,
      },
      {
        id: "scheduleTime",
        label: "Schedule Time (seconds from now)",
        type: "number",
        default: 0,
      },
    ],
  },
  {
    id: "gcp.secretmanager.get",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Get Secret",
    description: "Retrieve a secret from Secret Manager",
    icon: "Key",
    color: "#ea4335",
    inputs: [],
    outputs: [{ id: "value", label: "Secret Value", type: "string" }],
    config: [
      { id: "secretName", label: "Secret Name", type: "text", placeholder: "my-secret", required: true },
      { id: "version", label: "Version", type: "text", placeholder: "latest", default: "latest" },
    ],
  },
  {
    id: "gcp.scheduler.createJob",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Create Scheduler Job",
    description: "Create a Cloud Scheduler job",
    icon: "Clock",
    color: "#ea4335",
    inputs: [],
    outputs: [{ id: "jobName", label: "Job Name", type: "string" }],
    config: [
      { id: "name", label: "Job Name", type: "text", required: true },
      { id: "schedule", label: "Schedule (cron)", type: "text", placeholder: "0 * * * *", required: true },
      { id: "targetType", label: "Target Type", type: "select", options: [
        { label: "HTTP", value: "http" },
        { label: "Pub/Sub", value: "pubsub" },
      ], default: "http" },
      { id: "targetUri", label: "Target URI", type: "text", placeholder: "https://...", required: true },
      { id: "timezone", label: "Timezone", type: "text", default: "UTC" },
    ],
  },
  {
    id: "gcp.logging.write",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Write Log Entry",
    description: "Write a log entry to Cloud Logging",
    icon: "FileText",
    color: "#ea4335",
    inputs: [{ id: "message", label: "Message", type: "string", required: true }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "logName", label: "Log Name", type: "text", placeholder: "my-log", required: true },
      { id: "severity", label: "Severity", type: "select", options: [
        { label: "DEBUG", value: "DEBUG" },
        { label: "INFO", value: "INFO" },
        { label: "WARNING", value: "WARNING" },
        { label: "ERROR", value: "ERROR" },
        { label: "CRITICAL", value: "CRITICAL" },
      ], default: "INFO" },
    ],
  },
  {
    id: "gcp.monitoring.createAlert",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Create Alert Policy",
    description: "Create a Cloud Monitoring alert policy",
    icon: "AlertTriangle",
    color: "#ea4335",
    inputs: [],
    outputs: [{ id: "policyName", label: "Policy Name", type: "string" }],
    config: [
      { id: "displayName", label: "Display Name", type: "text", required: true },
      { id: "metricType", label: "Metric Type", type: "text", placeholder: "compute.googleapis.com/instance/cpu/utilization", required: true },
      { id: "threshold", label: "Threshold", type: "number", required: true },
      { id: "comparison", label: "Comparison", type: "select", options: [
        { label: "Greater Than", value: "COMPARISON_GT" },
        { label: "Less Than", value: "COMPARISON_LT" },
      ], required: true },
      { id: "duration", label: "Duration (seconds)", type: "number", default: 60 },
    ],
  },
];

// ============================================
// GCP AI/ML NODES
// ============================================

const gcpAINodes: CloudNodeDefinition[] = [
  {
    id: "gcp.vertexai.predict",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Vertex AI Predict",
    description: "Get predictions from a Vertex AI model",
    icon: "Brain",
    color: "#4285f4",
    inputs: [{ id: "instances", label: "Instances", type: "array", required: true }],
    outputs: [{ id: "predictions", label: "Predictions", type: "array" }],
    config: [
      { id: "endpoint", label: "Endpoint ID", type: "text", required: true },
      { id: "project", label: "Project ID", type: "text", required: true },
      { id: "location", label: "Location", type: "text", default: "us-central1" },
    ],
  },
  {
    id: "gcp.vertexai.generateContent",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Gemini Generate Content",
    description: "Generate content using Gemini models",
    icon: "Brain",
    color: "#4285f4",
    inputs: [{ id: "prompt", label: "Prompt", type: "string", required: true }],
    outputs: [{ id: "response", label: "Response", type: "string" }],
    config: [
      { id: "model", label: "Model", type: "select", options: [
        { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
        { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
        { label: "Gemini 1.0 Pro", value: "gemini-1.0-pro" },
      ], default: "gemini-1.5-flash" },
      { id: "maxOutputTokens", label: "Max Tokens", type: "number", default: 1000 },
      { id: "temperature", label: "Temperature", type: "number", default: 0.7 },
    ],
  },
  {
    id: "gcp.vision.annotate",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Vision API Annotate",
    description: "Analyze images with Cloud Vision API",
    icon: "Eye",
    color: "#4285f4",
    inputs: [{ id: "imageBytes", label: "Image Bytes", type: "any" }],
    outputs: [{ id: "annotations", label: "Annotations", type: "object" }],
    config: [
      { id: "gcsUri", label: "GCS URI", type: "text", placeholder: "gs://bucket/image.jpg" },
      { id: "features", label: "Features", type: "select", options: [
        { label: "Label Detection", value: "LABEL_DETECTION" },
        { label: "Face Detection", value: "FACE_DETECTION" },
        { label: "Text Detection", value: "TEXT_DETECTION" },
        { label: "Object Localization", value: "OBJECT_LOCALIZATION" },
      ] },
    ],
  },
  {
    id: "gcp.speech.recognize",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Speech to Text",
    description: "Transcribe audio to text",
    icon: "Mic",
    color: "#4285f4",
    inputs: [{ id: "audioBytes", label: "Audio Bytes", type: "any" }],
    outputs: [{ id: "transcript", label: "Transcript", type: "string" }],
    config: [
      { id: "gcsUri", label: "GCS URI", type: "text", placeholder: "gs://bucket/audio.wav" },
      { id: "languageCode", label: "Language", type: "select", options: [
        { label: "English (US)", value: "en-US" },
        { label: "English (UK)", value: "en-GB" },
        { label: "Spanish", value: "es-ES" },
        { label: "French", value: "fr-FR" },
      ], default: "en-US" },
      { id: "encoding", label: "Encoding", type: "select", options: [
        { label: "LINEAR16", value: "LINEAR16" },
        { label: "FLAC", value: "FLAC" },
        { label: "MP3", value: "MP3" },
      ], default: "LINEAR16" },
    ],
  },
  {
    id: "gcp.texttospeech.synthesize",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Text to Speech",
    description: "Convert text to speech audio",
    icon: "Volume2",
    color: "#4285f4",
    inputs: [{ id: "text", label: "Text", type: "string", required: true }],
    outputs: [{ id: "audioContent", label: "Audio Content", type: "any" }],
    config: [
      { id: "languageCode", label: "Language", type: "text", default: "en-US" },
      { id: "voiceName", label: "Voice", type: "select", options: [
        { label: "en-US-Standard-A", value: "en-US-Standard-A" },
        { label: "en-US-Standard-B", value: "en-US-Standard-B" },
        { label: "en-US-Wavenet-A", value: "en-US-Wavenet-A" },
        { label: "en-US-Wavenet-B", value: "en-US-Wavenet-B" },
      ], default: "en-US-Standard-A" },
      { id: "audioEncoding", label: "Audio Format", type: "select", options: [
        { label: "MP3", value: "MP3" },
        { label: "LINEAR16", value: "LINEAR16" },
        { label: "OGG_OPUS", value: "OGG_OPUS" },
      ], default: "MP3" },
    ],
  },
  {
    id: "gcp.translate.text",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Translate Text",
    description: "Translate text between languages",
    icon: "Globe",
    color: "#4285f4",
    inputs: [{ id: "text", label: "Text", type: "string", required: true }],
    outputs: [{ id: "translatedText", label: "Translated Text", type: "string" }],
    config: [
      { id: "targetLanguage", label: "Target Language", type: "select", options: [
        { label: "English", value: "en" },
        { label: "Spanish", value: "es" },
        { label: "French", value: "fr" },
        { label: "German", value: "de" },
        { label: "Japanese", value: "ja" },
        { label: "Chinese", value: "zh" },
      ], required: true },
      { id: "sourceLanguage", label: "Source Language", type: "text", placeholder: "Auto-detect if empty" },
    ],
  },
  {
    id: "gcp.language.analyzeSentiment",
    type: "action",
    provider: "gcp",
    category: "gcp-integration",
    label: "Analyze Sentiment",
    description: "Analyze sentiment in text",
    icon: "MessageCircle",
    color: "#4285f4",
    inputs: [{ id: "text", label: "Text", type: "string", required: true }],
    outputs: [
      { id: "score", label: "Score", type: "number" },
      { id: "magnitude", label: "Magnitude", type: "number" },
    ],
    config: [
      { id: "language", label: "Language", type: "text", placeholder: "Auto-detect if empty" },
    ],
  },
];

// ============================================
// AZURE COMPUTE NODES
// ============================================

const azureComputeNodes: CloudNodeDefinition[] = [
  {
    id: "azure.vm.create",
    type: "action",
    provider: "azure",
    category: "azure-compute",
    label: "Create Virtual Machine",
    description: "Create a new Azure Virtual Machine",
    icon: "Server",
    color: "#0078d4",
    inputs: [{ id: "config", label: "Config", type: "object", required: false }],
    outputs: [
      { id: "vmId", label: "VM ID", type: "string" },
      { id: "publicIp", label: "Public IP", type: "string" },
    ],
    config: [
      {
        id: "name",
        label: "VM Name",
        type: "text",
        placeholder: "my-vm",
        required: true,
      },
      {
        id: "resourceGroup",
        label: "Resource Group",
        type: "text",
        placeholder: "my-resource-group",
        required: true,
      },
      {
        id: "size",
        label: "VM Size",
        type: "select",
        options: [
          { label: "Standard_B1s", value: "Standard_B1s" },
          { label: "Standard_B2s", value: "Standard_B2s" },
          { label: "Standard_D2s_v3", value: "Standard_D2s_v3" },
          { label: "Standard_D4s_v3", value: "Standard_D4s_v3" },
          { label: "Standard_E2s_v3", value: "Standard_E2s_v3" },
        ],
        required: true,
        default: "Standard_B1s",
      },
      {
        id: "location",
        label: "Location",
        type: "select",
        options: [
          { label: "East US", value: "eastus" },
          { label: "West US 2", value: "westus2" },
          { label: "West Europe", value: "westeurope" },
          { label: "UK South", value: "uksouth" },
          { label: "Southeast Asia", value: "southeastasia" },
        ],
        required: true,
        default: "eastus",
      },
      {
        id: "image",
        label: "OS Image",
        type: "select",
        options: [
          { label: "Ubuntu 22.04 LTS", value: "Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest" },
          { label: "Windows Server 2022", value: "MicrosoftWindowsServer:WindowsServer:2022-datacenter:latest" },
          { label: "Debian 11", value: "Debian:debian-11:11:latest" },
        ],
        default: "Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest",
      },
    ],
  },
  {
    id: "azure.vm.start",
    type: "action",
    provider: "azure",
    category: "azure-compute",
    label: "Start Virtual Machine",
    description: "Start a stopped Azure VM",
    icon: "Play",
    color: "#0078d4",
    inputs: [{ id: "vmName", label: "VM Name", type: "string", required: true }],
    outputs: [{ id: "status", label: "Status", type: "string" }],
    config: [
      {
        id: "vmName",
        label: "VM Name",
        type: "text",
        placeholder: "my-vm",
        required: true,
      },
      {
        id: "resourceGroup",
        label: "Resource Group",
        type: "text",
        placeholder: "my-resource-group",
        required: true,
      },
    ],
  },
  {
    id: "azure.vm.stop",
    type: "action",
    provider: "azure",
    category: "azure-compute",
    label: "Stop Virtual Machine",
    description: "Stop a running Azure VM",
    icon: "Square",
    color: "#0078d4",
    inputs: [{ id: "vmName", label: "VM Name", type: "string", required: true }],
    outputs: [{ id: "status", label: "Status", type: "string" }],
    config: [
      {
        id: "vmName",
        label: "VM Name",
        type: "text",
        placeholder: "my-vm",
        required: true,
      },
      {
        id: "resourceGroup",
        label: "Resource Group",
        type: "text",
        placeholder: "my-resource-group",
        required: true,
      },
    ],
  },
  {
    id: "azure.functions.invoke",
    type: "action",
    provider: "azure",
    category: "azure-compute",
    label: "Invoke Azure Function",
    description: "Invoke an Azure Function",
    icon: "Zap",
    color: "#0078d4",
    inputs: [{ id: "payload", label: "Payload", type: "object" }],
    outputs: [
      { id: "response", label: "Response", type: "object" },
      { id: "statusCode", label: "Status Code", type: "number" },
    ],
    config: [
      {
        id: "functionApp",
        label: "Function App Name",
        type: "text",
        placeholder: "my-function-app",
        required: true,
      },
      {
        id: "functionName",
        label: "Function Name",
        type: "text",
        placeholder: "my-function",
        required: true,
      },
      {
        id: "functionKey",
        label: "Function Key",
        type: "secret",
        placeholder: "Function access key",
      },
    ],
  },
  {
    id: "azure.containerApps.deploy",
    type: "action",
    provider: "azure",
    category: "azure-compute",
    label: "Deploy Container App",
    description: "Deploy a container to Azure Container Apps",
    icon: "Container",
    color: "#0078d4",
    inputs: [{ id: "config", label: "Config", type: "object" }],
    outputs: [
      { id: "appUrl", label: "App URL", type: "string" },
      { id: "revision", label: "Revision", type: "string" },
    ],
    config: [
      {
        id: "name",
        label: "Container App Name",
        type: "text",
        placeholder: "my-container-app",
        required: true,
      },
      {
        id: "resourceGroup",
        label: "Resource Group",
        type: "text",
        placeholder: "my-resource-group",
        required: true,
      },
      {
        id: "image",
        label: "Container Image",
        type: "text",
        placeholder: "myregistry.azurecr.io/myimage:tag",
        required: true,
      },
      {
        id: "cpu",
        label: "CPU",
        type: "select",
        options: [
          { label: "0.25", value: "0.25" },
          { label: "0.5", value: "0.5" },
          { label: "1.0", value: "1.0" },
          { label: "2.0", value: "2.0" },
        ],
        default: "0.5",
      },
      {
        id: "memory",
        label: "Memory",
        type: "select",
        options: [
          { label: "0.5Gi", value: "0.5Gi" },
          { label: "1Gi", value: "1Gi" },
          { label: "2Gi", value: "2Gi" },
          { label: "4Gi", value: "4Gi" },
        ],
        default: "1Gi",
      },
    ],
  },
];

// ============================================
// AZURE STORAGE NODES
// ============================================

const azureStorageNodes: CloudNodeDefinition[] = [
  {
    id: "azure.blob.createContainer",
    type: "action",
    provider: "azure",
    category: "azure-storage",
    label: "Create Blob Container",
    description: "Create a new Azure Blob Storage container",
    icon: "FolderPlus",
    color: "#0078d4",
    inputs: [],
    outputs: [{ id: "containerName", label: "Container Name", type: "string" }],
    config: [
      {
        id: "containerName",
        label: "Container Name",
        type: "text",
        placeholder: "my-container",
        required: true,
      },
      {
        id: "storageAccount",
        label: "Storage Account",
        type: "text",
        placeholder: "mystorageaccount",
        required: true,
      },
      {
        id: "accessLevel",
        label: "Access Level",
        type: "select",
        options: [
          { label: "Private", value: "private" },
          { label: "Blob", value: "blob" },
          { label: "Container", value: "container" },
        ],
        default: "private",
      },
    ],
  },
  {
    id: "azure.blob.upload",
    type: "action",
    provider: "azure",
    category: "azure-storage",
    label: "Upload to Blob Storage",
    description: "Upload a file or data to Azure Blob Storage",
    icon: "Upload",
    color: "#0078d4",
    inputs: [{ id: "data", label: "Data", type: "any", required: true }],
    outputs: [
      { id: "url", label: "Blob URL", type: "string" },
      { id: "blobName", label: "Blob Name", type: "string" },
    ],
    config: [
      {
        id: "storageAccount",
        label: "Storage Account",
        type: "text",
        placeholder: "mystorageaccount",
        required: true,
      },
      {
        id: "containerName",
        label: "Container Name",
        type: "text",
        placeholder: "my-container",
        required: true,
      },
      {
        id: "blobName",
        label: "Blob Name",
        type: "text",
        placeholder: "path/to/file.txt",
        required: true,
      },
      {
        id: "contentType",
        label: "Content Type",
        type: "text",
        placeholder: "application/json",
      },
    ],
  },
  {
    id: "azure.blob.download",
    type: "action",
    provider: "azure",
    category: "azure-storage",
    label: "Download from Blob Storage",
    description: "Download a blob from Azure Blob Storage",
    icon: "Download",
    color: "#0078d4",
    inputs: [],
    outputs: [
      { id: "data", label: "Data", type: "any" },
      { id: "contentType", label: "Content Type", type: "string" },
    ],
    config: [
      {
        id: "storageAccount",
        label: "Storage Account",
        type: "text",
        placeholder: "mystorageaccount",
        required: true,
      },
      {
        id: "containerName",
        label: "Container Name",
        type: "text",
        placeholder: "my-container",
        required: true,
      },
      {
        id: "blobName",
        label: "Blob Name",
        type: "text",
        placeholder: "path/to/file.txt",
        required: true,
      },
    ],
  },
];

// ============================================
// AZURE DATABASE NODES
// ============================================

const azureDatabaseNodes: CloudNodeDefinition[] = [
  {
    id: "azure.sql.query",
    type: "action",
    provider: "azure",
    category: "azure-database",
    label: "Azure SQL Query",
    description: "Execute a query on Azure SQL Database",
    icon: "Database",
    color: "#0078d4",
    inputs: [{ id: "params", label: "Parameters", type: "array" }],
    outputs: [
      { id: "rows", label: "Rows", type: "array" },
      { id: "affectedRows", label: "Affected Rows", type: "number" },
    ],
    config: [
      {
        id: "server",
        label: "Server Name",
        type: "text",
        placeholder: "myserver.database.windows.net",
        required: true,
      },
      {
        id: "database",
        label: "Database",
        type: "text",
        placeholder: "mydb",
        required: true,
      },
      {
        id: "query",
        label: "SQL Query",
        type: "textarea",
        placeholder: "SELECT * FROM users WHERE id = @id",
        required: true,
      },
    ],
  },
  {
    id: "azure.cosmosdb.upsert",
    type: "action",
    provider: "azure",
    category: "azure-database",
    label: "Cosmos DB Upsert",
    description: "Insert or update a document in Cosmos DB",
    icon: "Database",
    color: "#0078d4",
    inputs: [{ id: "document", label: "Document", type: "object", required: true }],
    outputs: [{ id: "id", label: "Document ID", type: "string" }],
    config: [
      {
        id: "account",
        label: "Cosmos DB Account",
        type: "text",
        placeholder: "mycosmosaccount",
        required: true,
      },
      {
        id: "database",
        label: "Database",
        type: "text",
        placeholder: "mydb",
        required: true,
      },
      {
        id: "container",
        label: "Container",
        type: "text",
        placeholder: "mycontainer",
        required: true,
      },
      {
        id: "partitionKey",
        label: "Partition Key Path",
        type: "text",
        placeholder: "/partitionKey",
        required: true,
      },
    ],
  },
  {
    id: "azure.cosmosdb.query",
    type: "action",
    provider: "azure",
    category: "azure-database",
    label: "Cosmos DB Query",
    description: "Query documents from Cosmos DB",
    icon: "Database",
    color: "#0078d4",
    inputs: [{ id: "params", label: "Parameters", type: "object" }],
    outputs: [
      { id: "documents", label: "Documents", type: "array" },
      { id: "count", label: "Count", type: "number" },
    ],
    config: [
      {
        id: "account",
        label: "Cosmos DB Account",
        type: "text",
        placeholder: "mycosmosaccount",
        required: true,
      },
      {
        id: "database",
        label: "Database",
        type: "text",
        placeholder: "mydb",
        required: true,
      },
      {
        id: "container",
        label: "Container",
        type: "text",
        placeholder: "mycontainer",
        required: true,
      },
      {
        id: "query",
        label: "SQL Query",
        type: "textarea",
        placeholder: "SELECT * FROM c WHERE c.status = @status",
        required: true,
      },
    ],
  },
];

// ============================================
// AZURE INTEGRATION NODES
// ============================================

const azureIntegrationNodes: CloudNodeDefinition[] = [
  {
    id: "azure.servicebus.send",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Service Bus Send",
    description: "Send a message to Azure Service Bus",
    icon: "MessageSquare",
    color: "#0078d4",
    inputs: [{ id: "message", label: "Message", type: "any" }],
    outputs: [{ id: "messageId", label: "Message ID", type: "string" }],
    config: [
      {
        id: "namespace",
        label: "Namespace",
        type: "text",
        placeholder: "my-namespace",
        required: true,
      },
      {
        id: "queueOrTopic",
        label: "Queue/Topic Name",
        type: "text",
        placeholder: "my-queue",
        required: true,
      },
      {
        id: "type",
        label: "Type",
        type: "select",
        options: [
          { label: "Queue", value: "queue" },
          { label: "Topic", value: "topic" },
        ],
        default: "queue",
      },
    ],
  },
  {
    id: "azure.eventgrid.publish",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Event Grid Publish",
    description: "Publish an event to Azure Event Grid",
    icon: "Bell",
    color: "#0078d4",
    inputs: [{ id: "event", label: "Event", type: "object" }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      {
        id: "topicEndpoint",
        label: "Topic Endpoint",
        type: "text",
        placeholder: "https://mytopic.region.eventgrid.azure.net/api/events",
        required: true,
      },
      {
        id: "eventType",
        label: "Event Type",
        type: "text",
        placeholder: "MyApp.Events.SomethingHappened",
        required: true,
      },
      {
        id: "subject",
        label: "Subject",
        type: "text",
        placeholder: "/myapp/events",
      },
    ],
  },
  {
    id: "azure.keyvault.getSecret",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Get Key Vault Secret",
    description: "Retrieve a secret from Azure Key Vault",
    icon: "Key",
    color: "#0078d4",
    inputs: [],
    outputs: [{ id: "value", label: "Secret Value", type: "string" }],
    config: [
      {
        id: "vaultName",
        label: "Vault Name",
        type: "text",
        placeholder: "my-keyvault",
        required: true,
      },
      {
        id: "secretName",
        label: "Secret Name",
        type: "text",
        placeholder: "my-secret",
        required: true,
      },
      {
        id: "version",
        label: "Version",
        type: "text",
        placeholder: "Leave empty for latest",
      },
    ],
  },
  {
    id: "azure.logicapps.trigger",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Trigger Logic App",
    description: "Trigger an Azure Logic App via HTTP",
    icon: "Workflow",
    color: "#0078d4",
    inputs: [{ id: "payload", label: "Payload", type: "object" }],
    outputs: [
      { id: "response", label: "Response", type: "object" },
      { id: "statusCode", label: "Status Code", type: "number" },
    ],
    config: [
      { id: "triggerUrl", label: "Trigger URL", type: "text", placeholder: "https://prod-xx.region.logic.azure.com/workflows/...", required: true },
    ],
  },
  {
    id: "azure.monitor.log",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Azure Monitor Log",
    description: "Send logs to Azure Monitor",
    icon: "FileText",
    color: "#0078d4",
    inputs: [{ id: "data", label: "Log Data", type: "object", required: true }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "workspaceId", label: "Workspace ID", type: "text", required: true },
      { id: "logType", label: "Log Type", type: "text", placeholder: "MyCustomLog", required: true },
    ],
  },
  {
    id: "azure.monitor.metric",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Azure Monitor Metric",
    description: "Send custom metrics to Azure Monitor",
    icon: "BarChart",
    color: "#0078d4",
    inputs: [{ id: "value", label: "Value", type: "number", required: true }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "resourceId", label: "Resource ID", type: "text", required: true },
      { id: "metricNamespace", label: "Namespace", type: "text", required: true },
      { id: "metricName", label: "Metric Name", type: "text", required: true },
    ],
  },
  {
    id: "azure.appinsights.trackEvent",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "App Insights Track Event",
    description: "Track a custom event in Application Insights",
    icon: "Activity",
    color: "#0078d4",
    inputs: [{ id: "properties", label: "Properties", type: "object" }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "instrumentationKey", label: "Instrumentation Key", type: "secret", required: true },
      { id: "eventName", label: "Event Name", type: "text", required: true },
    ],
  },
  {
    id: "azure.sendgrid.sendEmail",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "SendGrid Send Email",
    description: "Send email via Azure SendGrid",
    icon: "Mail",
    color: "#0078d4",
    inputs: [{ id: "body", label: "Email Body", type: "string" }],
    outputs: [{ id: "messageId", label: "Message ID", type: "string" }],
    config: [
      { id: "apiKey", label: "API Key", type: "secret", required: true },
      { id: "to", label: "To", type: "text", required: true },
      { id: "from", label: "From", type: "text", required: true },
      { id: "subject", label: "Subject", type: "text", required: true },
      { id: "isHtml", label: "HTML Email", type: "boolean", default: false },
    ],
  },
  {
    id: "azure.notification.send",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Notification Hub Send",
    description: "Send push notification via Notification Hubs",
    icon: "Bell",
    color: "#0078d4",
    inputs: [{ id: "message", label: "Message", type: "string", required: true }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "hubName", label: "Hub Name", type: "text", required: true },
      { id: "connectionString", label: "Connection String", type: "secret", required: true },
      { id: "platform", label: "Platform", type: "select", options: [
        { label: "All", value: "all" },
        { label: "iOS (APNS)", value: "apns" },
        { label: "Android (FCM)", value: "fcm" },
        { label: "Windows", value: "wns" },
      ], default: "all" },
    ],
  },
];

// ============================================
// AZURE AI/ML NODES
// ============================================

const azureAINodes: CloudNodeDefinition[] = [
  {
    id: "azure.openai.chat",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Azure OpenAI Chat",
    description: "Chat completion with Azure OpenAI",
    icon: "Brain",
    color: "#0078d4",
    inputs: [{ id: "messages", label: "Messages", type: "array", required: true }],
    outputs: [{ id: "response", label: "Response", type: "string" }],
    config: [
      { id: "endpoint", label: "Endpoint", type: "text", placeholder: "https://xxx.openai.azure.com", required: true },
      { id: "deploymentName", label: "Deployment Name", type: "text", required: true },
      { id: "apiVersion", label: "API Version", type: "text", default: "2024-02-15-preview" },
      { id: "maxTokens", label: "Max Tokens", type: "number", default: 1000 },
      { id: "temperature", label: "Temperature", type: "number", default: 0.7 },
    ],
  },
  {
    id: "azure.openai.embedding",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Azure OpenAI Embedding",
    description: "Generate embeddings with Azure OpenAI",
    icon: "Brain",
    color: "#0078d4",
    inputs: [{ id: "text", label: "Text", type: "string", required: true }],
    outputs: [{ id: "embedding", label: "Embedding", type: "array" }],
    config: [
      { id: "endpoint", label: "Endpoint", type: "text", required: true },
      { id: "deploymentName", label: "Deployment Name", type: "text", required: true },
    ],
  },
  {
    id: "azure.cognitiveservices.vision",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Computer Vision Analyze",
    description: "Analyze images with Computer Vision",
    icon: "Eye",
    color: "#0078d4",
    inputs: [{ id: "imageUrl", label: "Image URL", type: "string" }],
    outputs: [{ id: "analysis", label: "Analysis", type: "object" }],
    config: [
      { id: "endpoint", label: "Endpoint", type: "text", required: true },
      { id: "apiKey", label: "API Key", type: "secret", required: true },
      { id: "features", label: "Features", type: "select", options: [
        { label: "Tags", value: "Tags" },
        { label: "Description", value: "Description" },
        { label: "Objects", value: "Objects" },
        { label: "Faces", value: "Faces" },
        { label: "Read (OCR)", value: "Read" },
      ] },
    ],
  },
  {
    id: "azure.cognitiveservices.speech",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Speech to Text",
    description: "Transcribe audio with Speech Services",
    icon: "Mic",
    color: "#0078d4",
    inputs: [{ id: "audioData", label: "Audio Data", type: "any" }],
    outputs: [{ id: "transcript", label: "Transcript", type: "string" }],
    config: [
      { id: "endpoint", label: "Endpoint", type: "text", required: true },
      { id: "apiKey", label: "API Key", type: "secret", required: true },
      { id: "language", label: "Language", type: "select", options: [
        { label: "English (US)", value: "en-US" },
        { label: "English (UK)", value: "en-GB" },
        { label: "Spanish", value: "es-ES" },
        { label: "French", value: "fr-FR" },
        { label: "German", value: "de-DE" },
      ], default: "en-US" },
    ],
  },
  {
    id: "azure.cognitiveservices.tts",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Text to Speech",
    description: "Convert text to speech with Speech Services",
    icon: "Volume2",
    color: "#0078d4",
    inputs: [{ id: "text", label: "Text", type: "string", required: true }],
    outputs: [{ id: "audioData", label: "Audio Data", type: "any" }],
    config: [
      { id: "endpoint", label: "Endpoint", type: "text", required: true },
      { id: "apiKey", label: "API Key", type: "secret", required: true },
      { id: "voice", label: "Voice", type: "select", options: [
        { label: "en-US-JennyNeural", value: "en-US-JennyNeural" },
        { label: "en-US-GuyNeural", value: "en-US-GuyNeural" },
        { label: "en-GB-SoniaNeural", value: "en-GB-SoniaNeural" },
      ], default: "en-US-JennyNeural" },
      { id: "outputFormat", label: "Output Format", type: "select", options: [
        { label: "MP3", value: "audio-16khz-128kbitrate-mono-mp3" },
        { label: "WAV", value: "riff-16khz-16bit-mono-pcm" },
      ], default: "audio-16khz-128kbitrate-mono-mp3" },
    ],
  },
  {
    id: "azure.cognitiveservices.translator",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Translator",
    description: "Translate text with Translator service",
    icon: "Globe",
    color: "#0078d4",
    inputs: [{ id: "text", label: "Text", type: "string", required: true }],
    outputs: [{ id: "translatedText", label: "Translated Text", type: "string" }],
    config: [
      { id: "endpoint", label: "Endpoint", type: "text", required: true },
      { id: "apiKey", label: "API Key", type: "secret", required: true },
      { id: "to", label: "Target Language", type: "select", options: [
        { label: "English", value: "en" },
        { label: "Spanish", value: "es" },
        { label: "French", value: "fr" },
        { label: "German", value: "de" },
        { label: "Japanese", value: "ja" },
        { label: "Chinese", value: "zh-Hans" },
      ], required: true },
      { id: "from", label: "Source Language", type: "text", placeholder: "Auto-detect if empty" },
    ],
  },
  {
    id: "azure.cognitiveservices.textAnalytics",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Text Analytics",
    description: "Analyze text sentiment, entities, and more",
    icon: "MessageCircle",
    color: "#0078d4",
    inputs: [{ id: "text", label: "Text", type: "string", required: true }],
    outputs: [
      { id: "sentiment", label: "Sentiment", type: "string" },
      { id: "entities", label: "Entities", type: "array" },
      { id: "keyPhrases", label: "Key Phrases", type: "array" },
    ],
    config: [
      { id: "endpoint", label: "Endpoint", type: "text", required: true },
      { id: "apiKey", label: "API Key", type: "secret", required: true },
      { id: "features", label: "Features", type: "select", options: [
        { label: "Sentiment", value: "sentiment" },
        { label: "Entities", value: "entities" },
        { label: "Key Phrases", value: "keyPhrases" },
        { label: "All", value: "all" },
      ], default: "all" },
    ],
  },
  {
    id: "azure.formrecognizer.analyze",
    type: "action",
    provider: "azure",
    category: "azure-integration",
    label: "Form Recognizer",
    description: "Extract data from documents",
    icon: "FileText",
    color: "#0078d4",
    inputs: [{ id: "documentUrl", label: "Document URL", type: "string" }],
    outputs: [
      { id: "fields", label: "Fields", type: "object" },
      { id: "tables", label: "Tables", type: "array" },
    ],
    config: [
      { id: "endpoint", label: "Endpoint", type: "text", required: true },
      { id: "apiKey", label: "API Key", type: "secret", required: true },
      { id: "modelId", label: "Model", type: "select", options: [
        { label: "Prebuilt Invoice", value: "prebuilt-invoice" },
        { label: "Prebuilt Receipt", value: "prebuilt-receipt" },
        { label: "Prebuilt ID Document", value: "prebuilt-idDocument" },
        { label: "Prebuilt Layout", value: "prebuilt-layout" },
      ], default: "prebuilt-layout" },
    ],
  },
];

// ============================================
// ORACLE CLOUD COMPUTE NODES
// ============================================

const oracleComputeNodes: CloudNodeDefinition[] = [
  { id: "oracle.compute.create", type: "action", provider: "oracle", category: "oracle-compute", label: "VM Create Instance", description: "Create a VM instance", icon: "Server", color: "#c74634", inputs: [{ id: "config", label: "Config", type: "object" }], outputs: [{ id: "instanceId", label: "Instance ID", type: "string" }], config: [
    { id: "displayName", label: "Display Name", type: "text", required: true },
    { id: "shape", label: "Shape", type: "select", options: [{ label: "VM.Standard.E4.Flex", value: "VM.Standard.E4.Flex" }, { label: "VM.Standard.A1.Flex", value: "VM.Standard.A1.Flex" }, { label: "VM.Standard3.Flex", value: "VM.Standard3.Flex" }], required: true },
    { id: "compartmentId", label: "Compartment ID", type: "text", required: true },
  ]},
  { id: "oracle.compute.start", type: "action", provider: "oracle", category: "oracle-compute", label: "VM Start Instance", description: "Start a VM instance", icon: "Play", color: "#c74634", inputs: [], outputs: [{ id: "status", label: "Status", type: "string" }], config: [{ id: "instanceId", label: "Instance ID", type: "text", required: true }]},
  { id: "oracle.compute.stop", type: "action", provider: "oracle", category: "oracle-compute", label: "VM Stop Instance", description: "Stop a VM instance", icon: "Square", color: "#c74634", inputs: [], outputs: [{ id: "status", label: "Status", type: "string" }], config: [{ id: "instanceId", label: "Instance ID", type: "text", required: true }]},
  { id: "oracle.oke.createCluster", type: "action", provider: "oracle", category: "oracle-compute", label: "OKE Create Cluster", description: "Create Container Engine cluster", icon: "Box", color: "#c74634", inputs: [], outputs: [{ id: "clusterId", label: "Cluster ID", type: "string" }], config: [{ id: "clusterName", label: "Cluster Name", type: "text", required: true }, { id: "compartmentId", label: "Compartment ID", type: "text", required: true }]},
  { id: "oracle.functions.invoke", type: "action", provider: "oracle", category: "oracle-compute", label: "OCI Functions Invoke", description: "Invoke an OCI Function", icon: "Zap", color: "#c74634", inputs: [{ id: "payload", label: "Payload", type: "object" }], outputs: [{ id: "response", label: "Response", type: "any" }], config: [{ id: "functionId", label: "Function ID", type: "text", required: true }]},
];

// ============================================
// ORACLE CLOUD STORAGE NODES
// ============================================

const oracleStorageNodes: CloudNodeDefinition[] = [
  { id: "oracle.objectstorage.createBucket", type: "action", provider: "oracle", category: "oracle-storage", label: "Object Storage Create Bucket", description: "Create a bucket", icon: "FolderPlus", color: "#c74634", inputs: [], outputs: [{ id: "bucketName", label: "Bucket Name", type: "string" }], config: [{ id: "bucketName", label: "Bucket Name", type: "text", required: true }, { id: "namespace", label: "Namespace", type: "text", required: true }]},
  { id: "oracle.objectstorage.upload", type: "action", provider: "oracle", category: "oracle-storage", label: "Object Storage Upload", description: "Upload object", icon: "Upload", color: "#c74634", inputs: [{ id: "data", label: "Data", type: "any", required: true }], outputs: [{ id: "objectName", label: "Object Name", type: "string" }], config: [{ id: "bucketName", label: "Bucket", type: "text", required: true }, { id: "objectName", label: "Object Name", type: "text", required: true }]},
  { id: "oracle.objectstorage.download", type: "action", provider: "oracle", category: "oracle-storage", label: "Object Storage Download", description: "Download object", icon: "Download", color: "#c74634", inputs: [], outputs: [{ id: "data", label: "Data", type: "any" }], config: [{ id: "bucketName", label: "Bucket", type: "text", required: true }, { id: "objectName", label: "Object Name", type: "text", required: true }]},
  { id: "oracle.blockstorage.create", type: "action", provider: "oracle", category: "oracle-storage", label: "Block Volume Create", description: "Create block volume", icon: "HardDrive", color: "#c74634", inputs: [], outputs: [{ id: "volumeId", label: "Volume ID", type: "string" }], config: [{ id: "displayName", label: "Display Name", type: "text", required: true }, { id: "sizeInGBs", label: "Size (GB)", type: "number", required: true }]},
  { id: "oracle.filestorage.create", type: "action", provider: "oracle", category: "oracle-storage", label: "File Storage Create", description: "Create file system", icon: "Folder", color: "#c74634", inputs: [], outputs: [{ id: "fileSystemId", label: "File System ID", type: "string" }], config: [{ id: "displayName", label: "Display Name", type: "text", required: true }]},
];

// ============================================
// ORACLE CLOUD NETWORKING NODES
// ============================================

const oracleNetworkingNodes: CloudNodeDefinition[] = [
  { id: "oracle.vcn.create", type: "action", provider: "oracle", category: "oracle-networking", label: "VCN Create", description: "Create Virtual Cloud Network", icon: "Cloud", color: "#c74634", inputs: [], outputs: [{ id: "vcnId", label: "VCN ID", type: "string" }], config: [{ id: "displayName", label: "Display Name", type: "text", required: true }, { id: "cidrBlock", label: "CIDR Block", type: "text", placeholder: "10.0.0.0/16", required: true }]},
  { id: "oracle.dns.createRecord", type: "action", provider: "oracle", category: "oracle-networking", label: "DNS Create Record", description: "Create DNS record", icon: "Globe", color: "#c74634", inputs: [], outputs: [{ id: "recordId", label: "Record ID", type: "string" }], config: [{ id: "zoneName", label: "Zone Name", type: "text", required: true }, { id: "domain", label: "Domain", type: "text", required: true }, { id: "rtype", label: "Type", type: "select", options: [{ label: "A", value: "A" }, { label: "CNAME", value: "CNAME" }, { label: "TXT", value: "TXT" }], required: true }]},
  { id: "oracle.loadbalancer.create", type: "action", provider: "oracle", category: "oracle-networking", label: "Load Balancer Create", description: "Create a load balancer", icon: "Server", color: "#c74634", inputs: [], outputs: [{ id: "loadBalancerId", label: "Load Balancer ID", type: "string" }], config: [{ id: "displayName", label: "Display Name", type: "text", required: true }, { id: "shapeName", label: "Shape", type: "select", options: [{ label: "10Mbps", value: "10Mbps" }, { label: "100Mbps", value: "100Mbps" }, { label: "400Mbps", value: "400Mbps" }], required: true }]},
  { id: "oracle.waf.createPolicy", type: "action", provider: "oracle", category: "oracle-networking", label: "WAF Create Policy", description: "Create WAF policy", icon: "Shield", color: "#c74634", inputs: [], outputs: [{ id: "policyId", label: "Policy ID", type: "string" }], config: [{ id: "displayName", label: "Display Name", type: "text", required: true }]},
  { id: "oracle.apigateway.invoke", type: "action", provider: "oracle", category: "oracle-networking", label: "API Gateway Invoke", description: "Invoke API Gateway", icon: "Globe", color: "#c74634", inputs: [{ id: "body", label: "Body", type: "any" }], outputs: [{ id: "response", label: "Response", type: "any" }], config: [{ id: "deploymentId", label: "Deployment ID", type: "text", required: true }, { id: "path", label: "Path", type: "text", required: true }]},
];

// ============================================
// ORACLE CLOUD DATABASE NODES
// ============================================

const oracleDatabaseNodes: CloudNodeDefinition[] = [
  { id: "oracle.atp.query", type: "action", provider: "oracle", category: "oracle-database", label: "ATP Query", description: "Query Autonomous Transaction Processing", icon: "Database", color: "#c74634", inputs: [{ id: "params", label: "Parameters", type: "array" }], outputs: [{ id: "rows", label: "Rows", type: "array" }], config: [{ id: "dbName", label: "Database Name", type: "text", required: true }, { id: "query", label: "SQL Query", type: "textarea", required: true }]},
  { id: "oracle.adw.query", type: "action", provider: "oracle", category: "oracle-database", label: "ADW Query", description: "Query Autonomous Data Warehouse", icon: "Database", color: "#c74634", inputs: [{ id: "params", label: "Parameters", type: "array" }], outputs: [{ id: "rows", label: "Rows", type: "array" }], config: [{ id: "dbName", label: "Database Name", type: "text", required: true }, { id: "query", label: "SQL Query", type: "textarea", required: true }]},
  { id: "oracle.nosql.put", type: "action", provider: "oracle", category: "oracle-database", label: "NoSQL Put", description: "Put item in NoSQL Database", icon: "Database", color: "#c74634", inputs: [{ id: "value", label: "Value", type: "object", required: true }], outputs: [{ id: "version", label: "Version", type: "string" }], config: [{ id: "tableName", label: "Table Name", type: "text", required: true }]},
  { id: "oracle.nosql.get", type: "action", provider: "oracle", category: "oracle-database", label: "NoSQL Get", description: "Get item from NoSQL Database", icon: "Database", color: "#c74634", inputs: [], outputs: [{ id: "value", label: "Value", type: "object" }], config: [{ id: "tableName", label: "Table Name", type: "text", required: true }, { id: "key", label: "Key", type: "text", required: true }]},
];

// ============================================
// ORACLE CLOUD ANALYTICS NODES
// ============================================

const oracleAnalyticsNodes: CloudNodeDefinition[] = [
  { id: "oracle.bigdata.createCluster", type: "action", provider: "oracle", category: "oracle-analytics", label: "Big Data Create Cluster", description: "Create Big Data Service cluster", icon: "Cpu", color: "#c74634", inputs: [], outputs: [{ id: "clusterId", label: "Cluster ID", type: "string" }], config: [{ id: "displayName", label: "Display Name", type: "text", required: true }]},
  { id: "oracle.streaming.publish", type: "action", provider: "oracle", category: "oracle-analytics", label: "Streaming Publish", description: "Publish to Streaming service", icon: "Activity", color: "#c74634", inputs: [{ id: "messages", label: "Messages", type: "array", required: true }], outputs: [{ id: "entries", label: "Entries", type: "array" }], config: [{ id: "streamId", label: "Stream ID", type: "text", required: true }]},
  { id: "oracle.dataintegration.runTask", type: "action", provider: "oracle", category: "oracle-analytics", label: "Data Integration Run Task", description: "Run Data Integration task", icon: "Workflow", color: "#c74634", inputs: [], outputs: [{ id: "taskRunId", label: "Task Run ID", type: "string" }], config: [{ id: "workspaceId", label: "Workspace ID", type: "text", required: true }, { id: "taskKey", label: "Task Key", type: "text", required: true }]},
];

// ============================================
// ORACLE CLOUD ML NODES
// ============================================

const oracleMLNodes: CloudNodeDefinition[] = [
  { id: "oracle.datascience.invokeModel", type: "action", provider: "oracle", category: "oracle-ml", label: "Data Science Invoke Model", description: "Invoke ML model endpoint", icon: "Brain", color: "#c74634", inputs: [{ id: "data", label: "Data", type: "any", required: true }], outputs: [{ id: "prediction", label: "Prediction", type: "any" }], config: [{ id: "modelDeploymentId", label: "Model Deployment ID", type: "text", required: true }]},
  { id: "oracle.vision.analyzeImage", type: "action", provider: "oracle", category: "oracle-ml", label: "Vision Analyze Image", description: "Analyze image with AI Vision", icon: "Eye", color: "#c74634", inputs: [{ id: "imageData", label: "Image Data", type: "any" }], outputs: [{ id: "analysis", label: "Analysis", type: "object" }], config: [{ id: "features", label: "Features", type: "select", options: [{ label: "Object Detection", value: "OBJECT_DETECTION" }, { label: "Image Classification", value: "IMAGE_CLASSIFICATION" }, { label: "Text Detection", value: "TEXT_DETECTION" }] }]},
  { id: "oracle.speech.transcribe", type: "action", provider: "oracle", category: "oracle-ml", label: "Speech Transcribe", description: "Transcribe audio to text", icon: "Mic", color: "#c74634", inputs: [{ id: "audioData", label: "Audio Data", type: "any" }], outputs: [{ id: "transcript", label: "Transcript", type: "string" }], config: [{ id: "languageCode", label: "Language", type: "text", default: "en-US" }]},
  { id: "oracle.language.analyzeSentiment", type: "action", provider: "oracle", category: "oracle-ml", label: "Language Analyze Sentiment", description: "Analyze text sentiment", icon: "MessageCircle", color: "#c74634", inputs: [{ id: "text", label: "Text", type: "string", required: true }], outputs: [{ id: "sentiment", label: "Sentiment", type: "object" }], config: []},
];

// ============================================
// ORACLE CLOUD INTEGRATION NODES
// ============================================

const oracleIntegrationNodes: CloudNodeDefinition[] = [
  { id: "oracle.events.publish", type: "action", provider: "oracle", category: "oracle-integration", label: "Events Publish", description: "Publish to Events service", icon: "Radio", color: "#c74634", inputs: [{ id: "data", label: "Data", type: "object", required: true }], outputs: [{ id: "eventId", label: "Event ID", type: "string" }], config: [{ id: "topicId", label: "Topic ID", type: "text", required: true }]},
  { id: "oracle.queue.send", type: "action", provider: "oracle", category: "oracle-integration", label: "Queue Send Message", description: "Send message to Queue", icon: "MessageSquare", color: "#c74634", inputs: [{ id: "message", label: "Message", type: "any", required: true }], outputs: [{ id: "messageId", label: "Message ID", type: "string" }], config: [{ id: "queueId", label: "Queue ID", type: "text", required: true }]},
  { id: "oracle.notifications.publish", type: "action", provider: "oracle", category: "oracle-integration", label: "Notifications Publish", description: "Publish notification", icon: "Bell", color: "#c74634", inputs: [{ id: "message", label: "Message", type: "string", required: true }], outputs: [{ id: "messageId", label: "Message ID", type: "string" }], config: [{ id: "topicId", label: "Topic ID", type: "text", required: true }]},
  { id: "oracle.email.send", type: "action", provider: "oracle", category: "oracle-integration", label: "Email Delivery Send", description: "Send email via Email Delivery", icon: "Mail", color: "#c74634", inputs: [{ id: "body", label: "Body", type: "string" }], outputs: [{ id: "messageId", label: "Message ID", type: "string" }], config: [{ id: "to", label: "To", type: "text", required: true }, { id: "from", label: "From", type: "text", required: true }, { id: "subject", label: "Subject", type: "text", required: true }]},
];

// ============================================
// ORACLE CLOUD SECURITY NODES
// ============================================

const oracleSecurityNodes: CloudNodeDefinition[] = [
  { id: "oracle.iam.getUser", type: "action", provider: "oracle", category: "oracle-security", label: "IAM Get User", description: "Get IAM user details", icon: "User", color: "#c74634", inputs: [], outputs: [{ id: "user", label: "User", type: "object" }], config: [{ id: "userId", label: "User ID", type: "text", required: true }]},
  { id: "oracle.vault.getSecret", type: "action", provider: "oracle", category: "oracle-security", label: "Vault Get Secret", description: "Get secret from Vault", icon: "Key", color: "#c74634", inputs: [], outputs: [{ id: "secretValue", label: "Secret Value", type: "string" }], config: [{ id: "secretId", label: "Secret ID", type: "text", required: true }]},
  { id: "oracle.kms.encrypt", type: "action", provider: "oracle", category: "oracle-security", label: "KMS Encrypt", description: "Encrypt data with KMS", icon: "Lock", color: "#c74634", inputs: [{ id: "plaintext", label: "Plaintext", type: "string", required: true }], outputs: [{ id: "ciphertext", label: "Ciphertext", type: "string" }], config: [{ id: "keyId", label: "Key ID", type: "text", required: true }]},
];

// ============================================
// ORACLE CLOUD MANAGEMENT NODES
// ============================================

const oracleManagementNodes: CloudNodeDefinition[] = [
  { id: "oracle.monitoring.postMetric", type: "action", provider: "oracle", category: "oracle-management", label: "Monitoring Post Metric", description: "Post custom metric", icon: "BarChart", color: "#c74634", inputs: [{ id: "value", label: "Value", type: "number", required: true }], outputs: [{ id: "success", label: "Success", type: "boolean" }], config: [{ id: "namespace", label: "Namespace", type: "text", required: true }, { id: "metricName", label: "Metric Name", type: "text", required: true }]},
  { id: "oracle.logging.write", type: "action", provider: "oracle", category: "oracle-management", label: "Logging Write", description: "Write log entry", icon: "FileText", color: "#c74634", inputs: [{ id: "message", label: "Message", type: "string", required: true }], outputs: [{ id: "success", label: "Success", type: "boolean" }], config: [{ id: "logId", label: "Log ID", type: "text", required: true }]},
  { id: "oracle.resourcemanager.apply", type: "action", provider: "oracle", category: "oracle-management", label: "Resource Manager Apply", description: "Apply Terraform stack", icon: "Layers", color: "#c74634", inputs: [], outputs: [{ id: "jobId", label: "Job ID", type: "string" }], config: [{ id: "stackId", label: "Stack ID", type: "text", required: true }]},
];

// ============================================
// LOGIC NODES
// ============================================

const logicNodes: CloudNodeDefinition[] = [
  {
    id: "logic.if",
    type: "condition",
    provider: "generic",
    category: "logic",
    label: "If/Else",
    description: "Branch workflow based on a condition",
    icon: "GitBranch",
    color: "#eab308",
    inputs: [{ id: "value", label: "Value", type: "any", required: true }],
    outputs: [
      { id: "true", label: "True", type: "any" },
      { id: "false", label: "False", type: "any" },
    ],
    config: [
      {
        id: "condition",
        label: "Condition",
        type: "select",
        options: [
          { label: "Equals", value: "eq" },
          { label: "Not Equals", value: "neq" },
          { label: "Greater Than", value: "gt" },
          { label: "Less Than", value: "lt" },
          { label: "Contains", value: "contains" },
          { label: "Is Empty", value: "empty" },
          { label: "Is Not Empty", value: "notEmpty" },
        ],
        required: true,
      },
      {
        id: "compareValue",
        label: "Compare Value",
        type: "text",
        placeholder: "Value to compare against",
      },
    ],
  },
  {
    id: "logic.wait",
    type: "action",
    provider: "generic",
    category: "logic",
    label: "Wait",
    description: "Pause workflow execution",
    icon: "Clock",
    color: "#eab308",
    inputs: [{ id: "input", label: "Input", type: "any" }],
    outputs: [{ id: "output", label: "Output", type: "any" }],
    config: [
      {
        id: "duration",
        label: "Duration (seconds)",
        type: "number",
        required: true,
        default: 5,
      },
    ],
  },
  {
    id: "logic.transform",
    type: "action",
    provider: "generic",
    category: "logic",
    label: "Transform Data",
    description: "Transform data using JavaScript",
    icon: "Code",
    color: "#eab308",
    inputs: [{ id: "data", label: "Data", type: "any", required: true }],
    outputs: [{ id: "result", label: "Result", type: "any" }],
    config: [
      {
        id: "code",
        label: "JavaScript Code",
        type: "textarea",
        placeholder: "return data.map(item => item.name);",
        required: true,
        description: "Use 'data' variable to access input",
      },
    ],
  },
];

// ============================================
// LOCAL FILE NODES
// ============================================

const localFileNodes: CloudNodeDefinition[] = [
  {
    id: "local.file.read",
    type: "action",
    provider: "generic",
    category: "local",
    label: "Read File",
    description: "Read contents from a local file",
    icon: "FileText",
    color: "#8b5cf6",
    inputs: [],
    outputs: [
      { id: "content", label: "Content", type: "string" },
      { id: "size", label: "Size (bytes)", type: "number" },
    ],
    config: [
      { id: "path", label: "File Path", type: "text", placeholder: "/path/to/file.txt", required: true },
      { id: "encoding", label: "Encoding", type: "select", options: [
        { label: "UTF-8", value: "utf8" },
        { label: "ASCII", value: "ascii" },
        { label: "Base64", value: "base64" },
        { label: "Binary", value: "binary" },
      ], default: "utf8" },
    ],
  },
  {
    id: "local.file.write",
    type: "action",
    provider: "generic",
    category: "local",
    label: "Write File",
    description: "Write contents to a local file",
    icon: "FileOutput",
    color: "#8b5cf6",
    inputs: [{ id: "content", label: "Content", type: "string", required: true }],
    outputs: [
      { id: "path", label: "File Path", type: "string" },
      { id: "success", label: "Success", type: "boolean" },
    ],
    config: [
      { id: "path", label: "File Path", type: "text", placeholder: "/path/to/file.txt", required: true },
      { id: "mode", label: "Write Mode", type: "select", options: [
        { label: "Overwrite", value: "overwrite" },
        { label: "Append", value: "append" },
      ], default: "overwrite" },
      { id: "createDir", label: "Create Directory", type: "boolean", default: true, description: "Create parent directories if they don't exist" },
    ],
  },
  {
    id: "local.file.delete",
    type: "action",
    provider: "generic",
    category: "local",
    label: "Delete File",
    description: "Delete a local file",
    icon: "Trash2",
    color: "#8b5cf6",
    inputs: [],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "path", label: "File Path", type: "text", placeholder: "/path/to/file.txt", required: true },
    ],
  },
  {
    id: "local.file.copy",
    type: "action",
    provider: "generic",
    category: "local",
    label: "Copy File",
    description: "Copy a file to another location",
    icon: "Copy",
    color: "#8b5cf6",
    inputs: [],
    outputs: [
      { id: "destPath", label: "Destination Path", type: "string" },
      { id: "success", label: "Success", type: "boolean" },
    ],
    config: [
      { id: "sourcePath", label: "Source Path", type: "text", placeholder: "/path/to/source.txt", required: true },
      { id: "destPath", label: "Destination Path", type: "text", placeholder: "/path/to/dest.txt", required: true },
      { id: "overwrite", label: "Overwrite if exists", type: "boolean", default: false },
    ],
  },
  {
    id: "local.file.move",
    type: "action",
    provider: "generic",
    category: "local",
    label: "Move File",
    description: "Move/rename a file",
    icon: "FileSymlink",
    color: "#8b5cf6",
    inputs: [],
    outputs: [
      { id: "newPath", label: "New Path", type: "string" },
      { id: "success", label: "Success", type: "boolean" },
    ],
    config: [
      { id: "sourcePath", label: "Source Path", type: "text", placeholder: "/path/to/source.txt", required: true },
      { id: "destPath", label: "Destination Path", type: "text", placeholder: "/path/to/dest.txt", required: true },
    ],
  },
  {
    id: "local.file.exists",
    type: "action",
    provider: "generic",
    category: "local",
    label: "File Exists",
    description: "Check if a file exists",
    icon: "FileSearch",
    color: "#8b5cf6",
    inputs: [],
    outputs: [
      { id: "exists", label: "Exists", type: "boolean" },
      { id: "isFile", label: "Is File", type: "boolean" },
      { id: "isDirectory", label: "Is Directory", type: "boolean" },
    ],
    config: [
      { id: "path", label: "Path", type: "text", placeholder: "/path/to/file", required: true },
    ],
  },
  {
    id: "local.file.list",
    type: "action",
    provider: "generic",
    category: "local",
    label: "List Directory",
    description: "List files in a directory",
    icon: "FolderOpen",
    color: "#8b5cf6",
    inputs: [],
    outputs: [
      { id: "files", label: "Files", type: "array" },
      { id: "count", label: "Count", type: "number" },
    ],
    config: [
      { id: "path", label: "Directory Path", type: "text", placeholder: "/path/to/directory", required: true },
      { id: "pattern", label: "Filter Pattern", type: "text", placeholder: "*.txt", description: "Glob pattern to filter files" },
      { id: "recursive", label: "Recursive", type: "boolean", default: false },
    ],
  },
  {
    id: "local.file.readJson",
    type: "action",
    provider: "generic",
    category: "local",
    label: "Read JSON File",
    description: "Read and parse a JSON file",
    icon: "FileJson",
    color: "#8b5cf6",
    inputs: [],
    outputs: [{ id: "data", label: "Data", type: "object" }],
    config: [
      { id: "path", label: "File Path", type: "text", placeholder: "/path/to/file.json", required: true },
    ],
  },
  {
    id: "local.file.writeJson",
    type: "action",
    provider: "generic",
    category: "local",
    label: "Write JSON File",
    description: "Write data as JSON to a file",
    icon: "FileJson",
    color: "#8b5cf6",
    inputs: [{ id: "data", label: "Data", type: "object", required: true }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "path", label: "File Path", type: "text", placeholder: "/path/to/file.json", required: true },
      { id: "pretty", label: "Pretty Print", type: "boolean", default: true },
    ],
  },
  {
    id: "local.file.readCsv",
    type: "action",
    provider: "generic",
    category: "local",
    label: "Read CSV File",
    description: "Read and parse a CSV file",
    icon: "Table",
    color: "#8b5cf6",
    inputs: [],
    outputs: [
      { id: "rows", label: "Rows", type: "array" },
      { id: "headers", label: "Headers", type: "array" },
    ],
    config: [
      { id: "path", label: "File Path", type: "text", placeholder: "/path/to/file.csv", required: true },
      { id: "hasHeaders", label: "Has Headers", type: "boolean", default: true },
      { id: "delimiter", label: "Delimiter", type: "text", default: "," },
    ],
  },
  {
    id: "local.file.writeCsv",
    type: "action",
    provider: "generic",
    category: "local",
    label: "Write CSV File",
    description: "Write data as CSV to a file",
    icon: "Table",
    color: "#8b5cf6",
    inputs: [{ id: "rows", label: "Rows", type: "array", required: true }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      { id: "path", label: "File Path", type: "text", placeholder: "/path/to/file.csv", required: true },
      { id: "headers", label: "Headers", type: "text", placeholder: "name,email,age", description: "Comma-separated headers" },
    ],
  },
];

// ============================================
// GENERIC NODES
// ============================================

const genericNodes: CloudNodeDefinition[] = [
  {
    id: "generic.http",
    type: "action",
    provider: "generic",
    category: "generic",
    label: "HTTP Request",
    description: "Make an HTTP request",
    icon: "Globe",
    color: "#64748b",
    inputs: [{ id: "body", label: "Body", type: "any" }],
    outputs: [
      { id: "response", label: "Response", type: "any" },
      { id: "statusCode", label: "Status Code", type: "number" },
    ],
    config: [
      {
        id: "method",
        label: "Method",
        type: "select",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "DELETE", value: "DELETE" },
          { label: "PATCH", value: "PATCH" },
        ],
        required: true,
        default: "GET",
      },
      {
        id: "url",
        label: "URL",
        type: "text",
        placeholder: "https://api.example.com/endpoint",
        required: true,
      },
      {
        id: "headers",
        label: "Headers",
        type: "json",
        placeholder: '{"Content-Type": "application/json"}',
      },
    ],
  },
  {
    id: "generic.slack",
    type: "action",
    provider: "generic",
    category: "generic",
    label: "Slack Message",
    description: "Send a message to Slack",
    icon: "MessageSquare",
    color: "#64748b",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "success", label: "Success", type: "boolean" }],
    config: [
      {
        id: "webhookUrl",
        label: "Webhook URL",
        type: "secret",
        placeholder: "https://hooks.slack.com/services/...",
        required: true,
      },
      {
        id: "channel",
        label: "Channel",
        type: "text",
        placeholder: "#general",
      },
      {
        id: "username",
        label: "Bot Username",
        type: "text",
        placeholder: "CloudFlow Bot",
      },
    ],
  },
];

// ============================================
// NODE REGISTRY
// ============================================

export const nodeRegistry: CloudNodeDefinition[] = [
  ...triggerNodes,
  // AWS
  ...awsComputeNodes,
  ...awsStorageNodes,
  ...awsDatabaseNodes,
  ...awsIntegrationNodes,
  ...awsNetworkingNodes,
  ...awsMonitoringNodes,
  ...awsAINodes,
  // GCP
  ...gcpComputeNodes,
  ...gcpStorageNodes,
  ...gcpDatabaseNodes,
  ...gcpIntegrationNodes,
  ...gcpAINodes,
  // Azure
  ...azureComputeNodes,
  ...azureStorageNodes,
  ...azureDatabaseNodes,
  ...azureIntegrationNodes,
  ...azureAINodes,
  // Oracle
  ...oracleComputeNodes,
  ...oracleStorageNodes,
  ...oracleNetworkingNodes,
  ...oracleDatabaseNodes,
  ...oracleAnalyticsNodes,
  ...oracleMLNodes,
  ...oracleIntegrationNodes,
  ...oracleSecurityNodes,
  ...oracleManagementNodes,
  // Other
  ...localFileNodes,
  ...logicNodes,
  ...genericNodes,
  // AI
  ...aiNodes,
  // Output
  ...outputNodes,
];

// Helper to get node by ID
export function getNodeDefinition(id: string): CloudNodeDefinition | undefined {
  return nodeRegistry.find((node) => node.id === id);
}

// Helper to get nodes by category
export function getNodesByCategory(category: string): CloudNodeDefinition[] {
  return nodeRegistry.filter((node) => node.category === category);
}

// Helper to get nodes by provider
export function getNodesByProvider(provider: string): CloudNodeDefinition[] {
  return nodeRegistry.filter((node) => node.provider === provider);
}

// Generate a formatted list of all available nodes for LLM prompts
export function getNodeListForPrompt(): string {
  const grouped: Record<string, { id: string; label: string }[]> = {};
  
  for (const node of nodeRegistry) {
    const category = node.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({ id: node.id, label: node.label });
  }
  
  let result = "";
  for (const [category, nodes] of Object.entries(grouped)) {
    const categoryMeta = nodeCategories.find(c => c.id === category);
    const categoryLabel = categoryMeta?.label || category.toUpperCase();
    result += `\n${categoryLabel}:\n`;
    for (const node of nodes) {
      result += `- ${node.id} (${node.label})\n`;
    }
  }
  
  return result.trim();
}

// Category metadata for UI
export const nodeCategories = [
  { id: "trigger", label: "Triggers", icon: "Play", color: "#22c55e" },
  // AWS (Orange)
  { id: "aws-compute", label: "AWS Compute", icon: "Server", color: "#ff9900" },
  { id: "aws-storage", label: "AWS Storage", icon: "HardDrive", color: "#ff9900" },
  { id: "aws-database", label: "AWS Database", icon: "Database", color: "#ff9900" },
  { id: "aws-networking", label: "AWS Networking", icon: "Globe", color: "#ff9900" },
  { id: "aws-integration", label: "AWS Integration", icon: "Bell", color: "#ff9900" },
  // GCP (Google colors)
  { id: "gcp-compute", label: "GCP Compute", icon: "Server", color: "#4285f4" },
  { id: "gcp-storage", label: "GCP Storage", icon: "HardDrive", color: "#34a853" },
  { id: "gcp-database", label: "GCP Database", icon: "Database", color: "#4285f4" },
  { id: "gcp-integration", label: "GCP Integration", icon: "Bell", color: "#ea4335" },
  // Azure (Blue)
  { id: "azure-compute", label: "Azure Compute", icon: "Server", color: "#0078d4" },
  { id: "azure-storage", label: "Azure Storage", icon: "HardDrive", color: "#0078d4" },
  { id: "azure-database", label: "Azure Database", icon: "Database", color: "#0078d4" },
  { id: "azure-integration", label: "Azure Integration", icon: "Bell", color: "#0078d4" },
  // Oracle (Red)
  { id: "oracle-compute", label: "Oracle Compute", icon: "Server", color: "#c74634" },
  { id: "oracle-storage", label: "Oracle Storage", icon: "HardDrive", color: "#c74634" },
  { id: "oracle-networking", label: "Oracle Networking", icon: "Globe", color: "#c74634" },
  { id: "oracle-database", label: "Oracle Database", icon: "Database", color: "#c74634" },
  { id: "oracle-analytics", label: "Oracle Analytics", icon: "BarChart", color: "#c74634" },
  { id: "oracle-ml", label: "Oracle AI/ML", icon: "Brain", color: "#c74634" },
  { id: "oracle-integration", label: "Oracle Integration", icon: "Bell", color: "#c74634" },
  { id: "oracle-security", label: "Oracle Security", icon: "Shield", color: "#c74634" },
  { id: "oracle-management", label: "Oracle Management", icon: "Settings", color: "#c74634" },
  // AI
  { id: "ai", label: "AI / LLM", icon: "Brain", color: "#10b981" },
  // Other
  { id: "local", label: "Local Files", icon: "FileText", color: "#8b5cf6" },
  { id: "logic", label: "Logic", icon: "GitBranch", color: "#eab308" },
  { id: "generic", label: "Generic", icon: "Globe", color: "#64748b" },
  // Output
  { id: "output", label: "Outputs", icon: "Send", color: "#8b5cf6" },
];
