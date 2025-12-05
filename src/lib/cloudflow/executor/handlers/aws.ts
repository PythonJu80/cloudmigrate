// AWS Node Handlers
// Implementations for AWS CloudFlow nodes

import { ExecutionContext, NodeHandler } from "../../nodes/types";
import { AwsClients } from "../clients";

type AwsHandler = (
  clients: AwsClients,
  context: ExecutionContext,
  config: Record<string, any>
) => Promise<Record<string, any>>;

// ============================================
// EC2 HANDLERS
// ============================================

export const ec2Create: AwsHandler = async (clients, context, config) => {
  const { RunInstancesCommand } = await import("@aws-sdk/client-ec2");
  
  const params = {
    ImageId: config.ami,
    InstanceType: config.instanceType,
    MinCount: 1,
    MaxCount: 1,
    KeyName: config.keyName || undefined,
    SecurityGroupIds: config.securityGroupIds 
      ? config.securityGroupIds.split(",").map((s: string) => s.trim())
      : undefined,
  };

  context.logger(`Creating EC2 instance: ${config.instanceType}`);
  const response = await clients.ec2.send(new RunInstancesCommand(params));
  
  const instance = response.Instances?.[0];
  return {
    instanceId: instance?.InstanceId || "",
    publicIp: instance?.PublicIpAddress || "",
  };
};

export const ec2Start: AwsHandler = async (clients, context, config) => {
  const { StartInstancesCommand } = await import("@aws-sdk/client-ec2");
  
  const instanceId = config.instanceId || context.inputs.instanceId;
  context.logger(`Starting EC2 instance: ${instanceId}`);
  
  await clients.ec2.send(new StartInstancesCommand({
    InstanceIds: [instanceId],
  }));
  
  return { status: "starting" };
};

export const ec2Stop: AwsHandler = async (clients, context, config) => {
  const { StopInstancesCommand } = await import("@aws-sdk/client-ec2");
  
  const instanceId = config.instanceId || context.inputs.instanceId;
  context.logger(`Stopping EC2 instance: ${instanceId}`);
  
  await clients.ec2.send(new StopInstancesCommand({
    InstanceIds: [instanceId],
  }));
  
  return { status: "stopping" };
};

// ============================================
// LAMBDA HANDLERS
// ============================================

export const lambdaInvoke: AwsHandler = async (clients, context, config) => {
  const { InvokeCommand } = await import("@aws-sdk/client-lambda");
  
  const payload = context.inputs.payload || {};
  context.logger(`Invoking Lambda: ${config.functionName}`);
  
  const response = await clients.lambda.send(new InvokeCommand({
    FunctionName: config.functionName,
    InvocationType: config.invocationType || "RequestResponse",
    Payload: JSON.stringify(payload),
  }));
  
  let responsePayload = {};
  if (response.Payload) {
    const payloadStr = new TextDecoder().decode(response.Payload);
    try {
      responsePayload = JSON.parse(payloadStr);
    } catch {
      responsePayload = { raw: payloadStr };
    }
  }
  
  return {
    response: responsePayload,
    statusCode: response.StatusCode || 200,
  };
};

// ============================================
// S3 HANDLERS
// ============================================

export const s3CreateBucket: AwsHandler = async (clients, context, config) => {
  const { CreateBucketCommand } = await import("@aws-sdk/client-s3");
  
  context.logger(`Creating S3 bucket: ${config.bucketName}`);
  
  const params: any = {
    Bucket: config.bucketName,
  };
  
  // Only add LocationConstraint for non-us-east-1 regions
  if (clients.region !== "us-east-1") {
    params.CreateBucketConfiguration = {
      LocationConstraint: clients.region,
    };
  }
  
  await clients.s3.send(new CreateBucketCommand(params));
  
  return { bucketName: config.bucketName };
};

export const s3Upload: AwsHandler = async (clients, context, config) => {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  
  const data = context.inputs.data;
  const body = typeof data === "string" ? data : JSON.stringify(data);
  
  context.logger(`Uploading to S3: ${config.bucket}/${config.key}`);
  
  await clients.s3.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: config.key,
    Body: body,
    ContentType: config.contentType || "application/json",
  }));
  
  return {
    url: `https://${config.bucket}.s3.${clients.region}.amazonaws.com/${config.key}`,
    key: config.key,
  };
};

export const s3Download: AwsHandler = async (clients, context, config) => {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  
  context.logger(`Downloading from S3: ${config.bucket}/${config.key}`);
  
  const response = await clients.s3.send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: config.key,
  }));
  
  const body = await response.Body?.transformToString();
  let data: any = body;
  
  try {
    data = JSON.parse(body || "");
  } catch {
    // Keep as string
  }
  
  return {
    data,
    contentType: response.ContentType || "application/octet-stream",
  };
};

// ============================================
// SNS HANDLERS
// ============================================

export const snsPublish: AwsHandler = async (clients, context, config) => {
  const { PublishCommand } = await import("@aws-sdk/client-sns");
  
  const message = context.inputs.message || config.message || "";
  context.logger(`Publishing to SNS topic: ${config.topicArn}`);
  
  const response = await clients.sns.send(new PublishCommand({
    TopicArn: config.topicArn,
    Message: typeof message === "string" ? message : JSON.stringify(message),
    Subject: config.subject || undefined,
  }));
  
  return { messageId: response.MessageId || "" };
};

// ============================================
// SQS HANDLERS
// ============================================

export const sqsSend: AwsHandler = async (clients, context, config) => {
  const { SendMessageCommand } = await import("@aws-sdk/client-sqs");
  
  const message = context.inputs.message || "";
  context.logger(`Sending to SQS queue: ${config.queueUrl}`);
  
  const response = await clients.sqs.send(new SendMessageCommand({
    QueueUrl: config.queueUrl,
    MessageBody: typeof message === "string" ? message : JSON.stringify(message),
    DelaySeconds: config.delaySeconds || 0,
  }));
  
  return { messageId: response.MessageId || "" };
};

export const sqsReceive: AwsHandler = async (clients, context, config) => {
  const { ReceiveMessageCommand } = await import("@aws-sdk/client-sqs");
  
  context.logger(`Receiving from SQS queue: ${config.queueUrl}`);
  
  const response = await clients.sqs.send(new ReceiveMessageCommand({
    QueueUrl: config.queueUrl,
    MaxNumberOfMessages: config.maxMessages || 10,
    WaitTimeSeconds: config.waitTimeSeconds || 20,
  }));
  
  const messages = (response.Messages || []).map(m => ({
    id: m.MessageId,
    body: m.Body,
    receiptHandle: m.ReceiptHandle,
  }));
  
  return { messages };
};

// ============================================
// SECRETS MANAGER HANDLERS
// ============================================

export const secretsManagerGet: AwsHandler = async (clients, context, config) => {
  const { GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
  
  context.logger(`Getting secret: ${config.secretId}`);
  
  const response = await clients.secretsmanager.send(new GetSecretValueCommand({
    SecretId: config.secretId,
    VersionStage: config.versionStage || "AWSCURRENT",
  }));
  
  return { secretValue: response.SecretString || "" };
};

// ============================================
// HANDLER REGISTRY
// ============================================

export const awsHandlers: Record<string, AwsHandler> = {
  "aws.ec2.create": ec2Create,
  "aws.ec2.start": ec2Start,
  "aws.ec2.stop": ec2Stop,
  "aws.lambda.invoke": lambdaInvoke,
  "aws.s3.createBucket": s3CreateBucket,
  "aws.s3.upload": s3Upload,
  "aws.s3.download": s3Download,
  "aws.sns.publish": snsPublish,
  "aws.sqs.send": sqsSend,
  "aws.sqs.receive": sqsReceive,
  "aws.secretsmanager.getSecret": secretsManagerGet,
};
