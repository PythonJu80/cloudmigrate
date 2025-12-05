// Pre-built example workflow templates
// These are read-only templates that users can load and customize

export interface ExampleWorkflow {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: any[];
  edges: any[];
}

export const EXAMPLE_WORKFLOWS: ExampleWorkflow[] = [
  {
    id: "daily-s3-backup",
    name: "Daily S3 Bucket Backup",
    description: "Scheduled backup of S3 bucket contents to another bucket",
    category: "Backup & Recovery",
    nodes: [
      { id: "node-1", definitionId: "trigger.schedule", position: { x: 100, y: 100 }, data: { config: { cron: "0 2 * * *", timezone: "UTC" } } },
      { id: "node-2", definitionId: "aws.s3.getObject", position: { x: 350, y: 100 }, data: { config: { bucket: "source-bucket", key: "*" } } },
      { id: "node-3", definitionId: "aws.s3.putObject", position: { x: 600, y: 100 }, data: { config: { bucket: "backup-bucket", key: "backups/{{date}}" } } },
      { id: "node-4", definitionId: "aws.sns.publish", position: { x: 850, y: 100 }, data: { config: { topicArn: "", message: "Backup completed successfully" } } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2" },
      { id: "edge-2", source: "node-2", target: "node-3" },
      { id: "edge-3", source: "node-3", target: "node-4" },
    ],
  },
  {
    id: "ec2-auto-scaling",
    name: "EC2 Auto-Scaling Alert",
    description: "Monitor EC2 metrics and send alerts when scaling events occur",
    category: "Monitoring",
    nodes: [
      { id: "node-1", definitionId: "trigger.webhook", position: { x: 100, y: 100 }, data: { config: { path: "/cloudwatch-alarm" } } },
      { id: "node-2", definitionId: "logic.condition", position: { x: 350, y: 100 }, data: { config: { condition: "{{trigger.body.AlarmName}} contains 'CPU'" } } },
      { id: "node-3", definitionId: "aws.sns.publish", position: { x: 600, y: 100 }, data: { config: { topicArn: "", message: "EC2 scaling alert: {{trigger.body.AlarmDescription}}" } } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2" },
      { id: "edge-2", source: "node-2", target: "node-3" },
    ],
  },
  {
    id: "lambda-error-alerting",
    name: "Lambda Error Alerting",
    description: "Capture Lambda errors and send notifications via SNS",
    category: "Monitoring",
    nodes: [
      { id: "node-1", definitionId: "trigger.webhook", position: { x: 100, y: 100 }, data: { config: { path: "/lambda-errors" } } },
      { id: "node-2", definitionId: "logic.transform", position: { x: 350, y: 100 }, data: { config: { template: "Lambda {{functionName}} failed: {{errorMessage}}" } } },
      { id: "node-3", definitionId: "aws.sns.publish", position: { x: 600, y: 100 }, data: { config: { topicArn: "", message: "{{transformed}}" } } },
      { id: "node-4", definitionId: "aws.dynamodb.putItem", position: { x: 850, y: 100 }, data: { config: { tableName: "error-logs", item: "{{trigger.body}}" } } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2" },
      { id: "edge-2", source: "node-2", target: "node-3" },
      { id: "edge-3", source: "node-3", target: "node-4" },
    ],
  },
  {
    id: "data-pipeline-etl",
    name: "Data Pipeline ETL",
    description: "Extract data from S3, transform with LLM, load to DynamoDB",
    category: "Data Processing",
    nodes: [
      { id: "node-1", definitionId: "trigger.schedule", position: { x: 100, y: 100 }, data: { config: { cron: "0 */6 * * *" } } },
      { id: "node-2", definitionId: "aws.s3.getObject", position: { x: 350, y: 100 }, data: { config: { bucket: "raw-data", key: "incoming/*.json" } } },
      { id: "node-3", definitionId: "ai.llm.completion", position: { x: 600, y: 100 }, data: { config: { model: "gpt-4.1", prompt: "Transform this data: {{input}}" } } },
      { id: "node-4", definitionId: "aws.dynamodb.putItem", position: { x: 850, y: 100 }, data: { config: { tableName: "processed-data" } } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2" },
      { id: "edge-2", source: "node-2", target: "node-3" },
      { id: "edge-3", source: "node-3", target: "node-4" },
    ],
  },
  {
    id: "webhook-to-slack",
    name: "Webhook to Slack Notification",
    description: "Receive webhook events and forward to Slack channel",
    category: "Notifications",
    nodes: [
      { id: "node-1", definitionId: "trigger.webhook", position: { x: 100, y: 100 }, data: { config: { path: "/events" } } },
      { id: "node-2", definitionId: "logic.transform", position: { x: 350, y: 100 }, data: { config: { template: "New event: {{trigger.body.type}} - {{trigger.body.message}}" } } },
      { id: "node-3", definitionId: "output.response", position: { x: 600, y: 100 }, data: { config: { statusCode: 200, body: "Event processed" } } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2" },
      { id: "edge-2", source: "node-2", target: "node-3" },
    ],
  },
  {
    id: "ai-content-processor",
    name: "AI Content Processor",
    description: "Process incoming content with AI and store results",
    category: "AI/ML",
    nodes: [
      { id: "node-1", definitionId: "trigger.webhook", position: { x: 100, y: 100 }, data: { config: { path: "/process-content" } } },
      { id: "node-2", definitionId: "ai.llm.chat", position: { x: 350, y: 100 }, data: { config: { model: "gpt-4.1", systemPrompt: "You are a content analyzer.", userPrompt: "Analyze: {{trigger.body.content}}" } } },
      { id: "node-3", definitionId: "aws.s3.putObject", position: { x: 600, y: 100 }, data: { config: { bucket: "processed-content", key: "{{trigger.body.id}}.json" } } },
      { id: "node-4", definitionId: "output.response", position: { x: 850, y: 100 }, data: { config: { statusCode: 200, body: "{{ai.response}}" } } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2" },
      { id: "edge-2", source: "node-2", target: "node-3" },
      { id: "edge-3", source: "node-3", target: "node-4" },
    ],
  },
  {
    id: "sqs-queue-processor",
    name: "SQS Queue Processor",
    description: "Process messages from SQS queue with Lambda",
    category: "Messaging",
    nodes: [
      { id: "node-1", definitionId: "trigger.manual", position: { x: 100, y: 100 }, data: { config: {} } },
      { id: "node-2", definitionId: "aws.lambda.invoke", position: { x: 350, y: 100 }, data: { config: { functionName: "queue-processor", payload: "{{input}}" } } },
      { id: "node-3", definitionId: "aws.sqs.sendMessage", position: { x: 600, y: 100 }, data: { config: { queueUrl: "", messageBody: "Processed: {{lambda.result}}" } } },
      { id: "node-4", definitionId: "output.log", position: { x: 850, y: 100 }, data: { config: { message: "Queue processing complete" } } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2" },
      { id: "edge-2", source: "node-2", target: "node-3" },
      { id: "edge-3", source: "node-3", target: "node-4" },
    ],
  },
  {
    id: "cost-optimization-report",
    name: "Cost Optimization Report",
    description: "Generate daily cost reports and send via email",
    category: "Cost Management",
    nodes: [
      { id: "node-1", definitionId: "trigger.schedule", position: { x: 100, y: 100 }, data: { config: { cron: "0 8 * * *", timezone: "UTC" } } },
      { id: "node-2", definitionId: "aws.lambda.invoke", position: { x: 350, y: 100 }, data: { config: { functionName: "cost-analyzer" } } },
      { id: "node-3", definitionId: "ai.llm.completion", position: { x: 600, y: 100 }, data: { config: { model: "gpt-4.1", prompt: "Summarize this cost data and provide optimization recommendations: {{lambda.result}}" } } },
      { id: "node-4", definitionId: "aws.sns.publish", position: { x: 850, y: 100 }, data: { config: { topicArn: "", message: "Daily Cost Report:\n{{ai.response}}" } } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2" },
      { id: "edge-2", source: "node-2", target: "node-3" },
      { id: "edge-3", source: "node-3", target: "node-4" },
    ],
  },
];

// Get unique categories
export const EXAMPLE_CATEGORIES = Array.from(new Set(EXAMPLE_WORKFLOWS.map(w => w.category)));

// Get examples by category
export function getExamplesByCategory(category: string): ExampleWorkflow[] {
  return EXAMPLE_WORKFLOWS.filter(w => w.category === category);
}

// Get example by ID
export function getExampleById(id: string): ExampleWorkflow | undefined {
  return EXAMPLE_WORKFLOWS.find(w => w.id === id);
}
