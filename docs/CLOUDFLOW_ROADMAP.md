# CloudFlow - Cloud Orchestration Engine

> n8n-style workflow builder for cloud infrastructure

## 🎯 Vision

CloudFlow is a visual cloud orchestration engine that combines:
- **Workflow automation** (like n8n)
- **Infrastructure provisioning** (like Terraform)
- **Multi-cloud management** (AWS, GCP, Azure)
- **AI-powered flow generation**

**One UI to rule them all.**

---

## 📊 Current State

### Architecture Page (existing)
- ✅ React Flow canvas with drag-and-drop
- ✅ AWS resource nodes (EC2, S3, RDS, Lambda, etc.)
- ✅ Node connections/edges
- ✅ Resource palette sidebar
- ✅ Properties panel for selected nodes
- ✅ Save/Export functionality
- ❌ No execution engine
- ❌ No workflow triggers
- ❌ No multi-cloud support
- ❌ Static diagrams only

---

## 🚀 CloudFlow Roadmap

### Phase 1: Node System Foundation
**Goal:** Create the core node type system

- [ ] Define CloudNode interface
  ```typescript
  interface CloudNode {
    id: string                    // "aws.ec2.create"
    type: "trigger" | "action" | "condition" | "resource"
    provider: "aws" | "gcp" | "azure" | "generic"
    category: string              // "compute", "storage", etc.
    label: string                 // "Create EC2 Instance"
    icon: string                  // Lucide icon name
    color: string                 // Category color
    inputs: NodeInput[]           // Input ports
    outputs: NodeOutput[]         // Output ports
    config: NodeConfig            // UI schema for properties
    handler: NodeHandler          // Execution function
    iamRequired?: string[]        // Required IAM permissions
  }
  ```

- [ ] Create node registry system
- [ ] Build node categories:
  - AWS Compute (EC2, Lambda, ECS, Fargate)
  - AWS Storage (S3, EBS, EFS)
  - AWS Database (RDS, DynamoDB, ElastiCache)
  - AWS Networking (VPC, ALB, CloudFront, Route53)
  - AWS Security (IAM, SG, WAF, KMS)
  - AWS Integration (SNS, SQS, EventBridge)
  - Triggers (Cron, Webhook, Event, Manual)
  - Logic (If/Else, Switch, Loop, Wait)
  - Generic (HTTP, Code, Transform)

### Phase 2: Visual Canvas
**Goal:** Build the n8n-style workflow canvas

- [ ] Dual-mode canvas toggle:
  - **Architecture Mode** - Design infrastructure topology
  - **Workflow Mode** - Build automation flows
- [ ] Enhanced node components:
  - Input/output handles
  - Status indicators (idle, running, success, error)
  - Execution count badges
  - Inline config preview
- [ ] Smart edge routing
- [ ] Node grouping/containers (VPC, Subnet)
- [ ] Zoom to fit, minimap, grid snap
- [ ] Undo/redo history
- [ ] Copy/paste nodes

### Phase 3: Execution Engine
**Goal:** Actually run the workflows

- [ ] Topological sort for execution order
- [ ] Node executor with:
  - Credential injection
  - Input/output mapping
  - Error handling
  - Retry logic
  - Timeout management
- [ ] Execution states:
  - Pending → Running → Success/Failed
- [ ] Real-time execution visualization
- [ ] Execution history/logs
- [ ] Parallel execution for independent branches

### Phase 4: Triggers & Scheduling
**Goal:** Automate workflow execution

- [ ] Trigger types:
  - **Cron** - Schedule-based (every hour, daily, etc.)
  - **Webhook** - HTTP endpoint trigger
  - **Event** - AWS EventBridge, S3 events, etc.
  - **Manual** - One-click run
- [ ] Trigger configuration UI
- [ ] Webhook URL generation
- [ ] Event subscription management

### Phase 5: Multi-Cloud Support
**Goal:** Extend beyond AWS

- [ ] GCP nodes:
  - Compute Engine, Cloud Run, Cloud Functions
  - Cloud Storage, BigQuery
  - Pub/Sub, Cloud Tasks
- [ ] Azure nodes:
  - VMs, Functions, Container Apps
  - Blob Storage, Cosmos DB
  - Service Bus, Event Grid
- [ ] Cross-cloud workflows
- [ ] Credential management per provider

### Phase 6: AI Integration
**Goal:** Let AI build flows

- [ ] Natural language to workflow:
  ```
  "Back up my EC2 to S3 every night and notify Slack"
  → AI generates complete workflow
  ```
- [ ] Flow validation & suggestions
- [ ] Missing permission detection
- [ ] Cost estimation
- [ ] Optimization recommendations
- [ ] Error diagnosis

### Phase 7: Templates & Marketplace
**Goal:** Reusable workflows

- [ ] Pre-built templates:
  - Daily database backup
  - Auto-scaling triggers
  - Cost alerts
  - Security scanning
  - CI/CD pipelines
- [ ] Save as template
- [ ] Share workflows
- [ ] Community marketplace

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUDFLOW UI                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Canvas    │  │  Node       │  │ Properties  │         │
│  │  (React     │  │  Palette    │  │   Panel     │         │
│  │   Flow)     │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    FLOW ENGINE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Parser    │  │  Executor   │  │  Scheduler  │         │
│  │  (validate  │  │  (run       │  │  (cron,     │         │
│  │   graph)    │  │   nodes)    │  │   events)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   NODE HANDLERS                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │   AWS   │  │   GCP   │  │  Azure  │  │ Generic │        │
│  │   SDK   │  │   SDK   │  │   SDK   │  │  HTTP   │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Postgres   │  │   Neo4j     │  │   Redis     │         │
│  │  (flows,    │  │  (graph     │  │  (queue,    │         │
│  │   history)  │  │   state)    │  │   cache)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
src/
├── app/
│   └── cloudflow/
│       ├── page.tsx              # Main CloudFlow canvas
│       ├── [flowId]/
│       │   └── page.tsx          # Edit specific flow
│       └── templates/
│           └── page.tsx          # Template gallery
├── lib/
│   └── cloudflow/
│       ├── nodes/
│       │   ├── registry.ts       # Node type registry
│       │   ├── types.ts          # Node interfaces
│       │   ├── aws/
│       │   │   ├── ec2.ts
│       │   │   ├── s3.ts
│       │   │   ├── lambda.ts
│       │   │   └── ...
│       │   ├── triggers/
│       │   │   ├── cron.ts
│       │   │   ├── webhook.ts
│       │   │   └── event.ts
│       │   └── logic/
│       │       ├── condition.ts
│       │       ├── loop.ts
│       │       └── transform.ts
│       ├── engine/
│       │   ├── executor.ts       # Run workflows
│       │   ├── scheduler.ts      # Cron/event triggers
│       │   └── validator.ts      # Flow validation
│       └── store/
│           └── flow-store.ts     # Zustand state
└── components/
    └── cloudflow/
        ├── canvas.tsx            # React Flow wrapper
        ├── node-palette.tsx      # Draggable node list
        ├── node-types/
        │   ├── action-node.tsx
        │   ├── trigger-node.tsx
        │   └── condition-node.tsx
        ├── properties-panel.tsx  # Node config editor
        └── execution-log.tsx     # Run history
```

---

## 🎨 Node Design

```
┌──────────────────────────────────┐
│  ⚡ Create EC2 Instance          │  ← Header with icon + label
├──────────────────────────────────┤
│  ○ config                        │  ← Input handle
│                                  │
│  Instance: t3.medium             │  ← Config preview
│  AMI: ami-0123...                │
│                                  │
│                     instanceId ○ │  ← Output handle
├──────────────────────────────────┤
│  ✓ 24 runs  •  Last: 2h ago     │  ← Status footer
└──────────────────────────────────┘
```

---

## 🔥 Why This Wins

| Competitor | What They Do | What They Don't |
|------------|--------------|-----------------|
| **Terraform** | IaC provisioning | Visual UI, workflows |
| **n8n** | Workflow automation | Cloud provisioning |
| **AWS Console** | Everything | Usability, multi-cloud |
| **Pulumi** | IaC with code | Visual, workflows |
| **CloudFlow** | **ALL OF IT** | Nothing 🚀 |

---

## 📅 Implementation Priority

1. **Week 1-2:** Node system + basic canvas
2. **Week 3-4:** AWS node handlers + execution engine
3. **Week 5-6:** Triggers + scheduling
4. **Week 7-8:** AI integration + templates
5. **Week 9+:** Multi-cloud + marketplace

---

## 💀 The Moat

> "Use the same nodes to build architectures AND workflows"

This makes CloudFabric the **master control plane** for any cloud account:
- Provisioning + Orchestration in one UI
- AI builds flows automatically
- Multi-cloud from day one
- Visual everything

**This is acquisition territory.**
