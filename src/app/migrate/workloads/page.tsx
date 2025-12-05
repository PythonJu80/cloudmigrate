"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Server,
  Database,
  HardDrive,
  Globe,
  Network,
  Shield,
  Mail,
  GitBranch,
  Activity,
  Layers,
  Container,
  ArrowRight,
  Plus,
  Filter,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// THE 12 MIGRATION CATEGORIES THAT REALLY MATTER
const workloadTypes = [
  {
    id: "compute",
    name: "Compute",
    description: "VMs, physical servers",
    icon: Server,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    awsServices: ["EC2", "ECS", "Lambda"],
    count: 0,
    ready: 0,
  },
  {
    id: "databases",
    name: "Databases",
    description: "SQL Server, Oracle, MySQL, PostgreSQL",
    icon: Database,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    awsServices: ["RDS", "Aurora", "DynamoDB"],
    count: 0,
    ready: 0,
  },
  {
    id: "storage",
    name: "File Storage",
    description: "SMB shares, NAS, file servers",
    icon: HardDrive,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    awsServices: ["FSx", "EFS", "S3"],
    count: 0,
    ready: 0,
  },
  {
    id: "identity",
    name: "Identity",
    description: "Active Directory, LDAP",
    icon: Shield,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    awsServices: ["Managed AD", "IAM Identity Center"],
    count: 0,
    ready: 0,
  },
  {
    id: "networking",
    name: "Networks & VPN",
    description: "Firewalls, routers, VPN",
    icon: Network,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    awsServices: ["VPC", "VPN", "Direct Connect"],
    count: 0,
    ready: 0,
  },
  {
    id: "webapps",
    name: "Web Apps",
    description: "IIS, Apache, Nginx",
    icon: Globe,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    awsServices: ["EC2", "ECS", "Beanstalk", "Lambda"],
    count: 0,
    ready: 0,
  },
  {
    id: "backups",
    name: "Backups / DR",
    description: "Veeam, tapes, SAN snapshots",
    icon: HardDrive,
    color: "text-slate-400",
    bgColor: "bg-slate-400/10",
    awsServices: ["AWS Backup", "S3 Glacier"],
    count: 0,
    ready: 0,
  },
  {
    id: "monitoring",
    name: "Logging / Monitoring",
    description: "Nagios, Zabbix, ELK, Splunk",
    icon: Activity,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    awsServices: ["CloudWatch", "OpenSearch", "Grafana"],
    count: 0,
    ready: 0,
  },
  {
    id: "devops",
    name: "DevOps Pipelines",
    description: "Jenkins, GitLab, Bitbucket",
    icon: GitBranch,
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    awsServices: ["CodePipeline", "CodeBuild"],
    count: 0,
    ready: 0,
  },
  {
    id: "messaging",
    name: "Messaging & Queues",
    description: "RabbitMQ, Kafka, ActiveMQ",
    icon: Mail,
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    awsServices: ["SQS", "SNS", "MSK"],
    count: 0,
    ready: 0,
  },
  {
    id: "email",
    name: "Email / SMTP",
    description: "Exchange, SMTP relays",
    icon: Mail,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    awsServices: ["SES", "WorkMail"],
    count: 0,
    ready: 0,
  },
  {
    id: "batch",
    name: "Batch Jobs / Cron",
    description: "Cron servers, Task Scheduler",
    icon: Clock,
    color: "text-teal-400",
    bgColor: "bg-teal-400/10",
    awsServices: ["EventBridge", "Batch", "Step Functions"],
    count: 0,
    ready: 0,
  },
];

export default function WorkloadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const totalWorkloads = workloadTypes.reduce((acc, t) => acc + t.count, 0);
  const totalReady = workloadTypes.reduce((acc, t) => acc + t.ready, 0);

  const hasWorkloads = totalWorkloads > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Migration Workloads</h2>
          <p className="text-sm text-muted-foreground">
            Configure and manage workloads for migration to AWS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workloads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Workloads</p>
          <p className="text-2xl font-bold text-foreground">{totalWorkloads}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Ready to Migrate</p>
          <p className="text-2xl font-bold text-terminal-green">{totalReady}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Workload Types</p>
          <p className="text-2xl font-bold text-foreground">{workloadTypes.length}</p>
        </div>
      </div>

      {/* No Workloads State */}
      {!hasWorkloads && (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Workloads Configured
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Discover your infrastructure first, then configure migration settings 
            for each workload type.
          </p>
          <Link href="/migrate/discover">
            <Button className="bg-terminal-green hover:bg-terminal-green/90 text-background">
              Start Discovery
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Workload Types Grid */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Workload Categories</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {workloadTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                className={cn(
                  "group relative flex items-start gap-4 p-5 bg-card border rounded-xl transition-all",
                  type.count > 0 
                    ? "border-border hover:border-terminal-green/30 cursor-pointer" 
                    : "border-dashed border-border/50 opacity-60"
                )}
              >
                <div className={cn("p-3 rounded-lg", type.bgColor)}>
                  <Icon className={cn("w-6 h-6", type.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">
                      {type.name}
                    </h4>
                    {type.count > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-accent px-2 py-0.5 rounded-full text-muted-foreground">
                          {type.count} items
                        </span>
                        {type.ready > 0 && (
                          <span className="text-xs bg-terminal-green/20 text-terminal-green px-2 py-0.5 rounded-full">
                            {type.ready} ready
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not discovered
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {type.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {type.awsServices.map((service) => (
                      <span 
                        key={service}
                        className="text-xs bg-accent/50 text-muted-foreground px-2 py-0.5 rounded"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
                {type.count > 0 && (
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-terminal-green group-hover:translate-x-1 transition-all" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      {hasWorkloads && (
        <div className="flex items-center justify-between p-4 bg-terminal-green/10 border border-terminal-green/20 rounded-xl">
          <div>
            <h4 className="font-semibold text-foreground">Ready to migrate?</h4>
            <p className="text-sm text-muted-foreground">
              {totalReady} workloads are configured and ready for migration
            </p>
          </div>
          <Link href="/migrate/execute">
            <Button className="bg-terminal-green hover:bg-terminal-green/90 text-background">
              <Play className="w-4 h-4 mr-2" />
              Start Migration
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
