"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
  MarkerType,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Boxes,
  Save,
  Upload,
  Download,
  Play,
  Trash2,
  Plus,
  Server,
  Database,
  HardDrive,
  Globe,
  Zap,
  Shield,
  Network,
  Layers,
  Cloud,
  FolderOpen,
  Settings,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  LayoutTemplate,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Copy,
  FileJson,
  Rocket,
  Activity,
  Bell,
  Key,
  Lock,
  Users,
  Workflow,
  ListOrdered,
  BarChart3,
  FileText,
  Split,
  Webhook,
  Box,
  Container,
  Table,
  Route,
  LayoutGrid,
  ArrowLeftRight,
  UserCheck,
  Info,
  Search,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  allResources,
  resourceCategories as resourceCats,
  getResourceDefinition,
  ResourceType,
  ResourceDefinition,
} from "@/lib/architecture/resources";
import {
  AWS_SERVICES,
  AWS_CATEGORIES,
  AWSService,
  getServiceById,
  getServicesByCategory,
} from "@/lib/architecture/aws-icons";
import Image from "next/image";
import {
  allTemplates,
  ArchitectureTemplate,
  getTemplateById,
} from "@/lib/architecture/templates";
import {
  estimateArchitectureCost,
  validateArchitecture,
} from "@/lib/architecture/cloudformation";
import { ArchitectureAgentChat } from "@/components/architecture/architecture-agent-chat";

// Icon mapping for resources
const iconMap: Record<string, any> = {
  Server, Database, HardDrive, Globe, Zap, Shield, Network, Layers, Cloud,
  FolderOpen, Boxes, Box, Container, Table, Split, Webhook, Activity,
  Bell, Key, Lock, Users, Workflow, ListOrdered, BarChart3, FileText,
  Route, LayoutGrid, ArrowLeftRight, UserCheck,
};

// AWS Official Color Palette
const awsColors = {
  // Container colors (matching official AWS diagrams)
  awsCloud: { bg: "#F7F7F7", border: "#232F3E", label: "#232F3E" },
  region: { bg: "#E8F4FD", border: "#147EBA", label: "#147EBA" },
  vpc: { bg: "#E9F3E8", border: "#3F8624", label: "#3F8624" },
  availabilityZone: { bg: "#FFF4E5", border: "#ED7100", label: "#ED7100" },
  publicSubnet: { bg: "#E8F5E8", border: "#7AA116", label: "#7AA116" },
  privateSubnet: { bg: "#E8F0FA", border: "#527FFF", label: "#527FFF" },
  securityGroup: { bg: "#FFEBEE", border: "#DD344C", label: "#DD344C" },
  // Service category colors
  compute: "#ED7100",
  storage: "#3F8624",
  database: "#3B48CC",
  networking: "#8C4FFF",
  security: "#DD344C",
  application: "#8C4FFF",
  integration: "#E7157B",
  management: "#E7157B",
};

// Handle visibility class - always functional, visible only when selected
const handleClass = (selected?: boolean) => cn(
  "!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-600 transition-opacity",
  selected ? "!opacity-100" : "!opacity-0"
);

// AWS-style Resource Node (individual services) - Now with real AWS SVG icons
function AWSResourceNode({ data, selected }: { data: any; selected?: boolean }) {
  const color = data.color || awsColors.compute;
  // Get the AWS service to find the real icon
  const service = data.serviceId ? getServiceById(data.serviceId) : null;
  const iconPath = service?.icon || data.icon;
  const isRealIcon = iconPath?.startsWith('/aws-icons/');
  
  // Fallback to Lucide icon if no real icon
  const iconName = data.icon || "Server";
  const FallbackIcon = iconMap[iconName] || Server;

  return (
    <div
      className={cn(
        "bg-white rounded-lg border shadow-sm transition-all flex flex-col items-center p-3 min-w-[100px] group",
        selected ? "border-cyan-500 ring-2 ring-cyan-500/30" : "border-gray-300"
      )}
    >
      {/* Handle for connections - input */}
      <Handle
        type="target"
        position={Position.Top}
        className={handleClass(selected)}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={handleClass(selected)}
      />
      
      {/* AWS Icon - Real SVG or Lucide fallback */}
      <div
        className="w-12 h-12 rounded flex items-center justify-center mb-2"
        style={{ backgroundColor: `${color}15` }}
      >
        {isRealIcon ? (
          <Image
            src={iconPath}
            alt={data.label || 'AWS Service'}
            width={32}
            height={32}
            className="object-contain"
          />
        ) : (
          <FallbackIcon className="w-8 h-8" style={{ color }} />
        )}
      </div>
      
      {/* Label */}
      <p className="text-xs font-medium text-gray-800 text-center leading-tight">{data.label}</p>
      {data.sublabel && (
        <p className="text-[10px] text-gray-500 text-center">{data.sublabel}</p>
      )}

      {/* Handle for connections - output */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={handleClass(selected)}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClass(selected)}
      />
    </div>
  );
}

// AWS Cloud Container (outermost - gray with AWS logo)
function AWSCloudNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 min-w-[800px] min-h-[500px] relative",
        selected ? "border-cyan-500" : "border-[#232F3E]"
      )}
      style={{ backgroundColor: "#F5F5F5" }}
    >
      {/* AWS Logo Label */}
      <div className="absolute top-0 left-0 flex items-center gap-2 bg-[#232F3E] px-3 py-1.5 rounded-br-lg rounded-tl-lg">
        <Cloud className="w-4 h-4 text-[#FF9900]" />
        <span className="text-white text-sm font-medium">AWS Cloud</span>
      </div>
      
      {/* Handles */}
      <Handle type="target" position={Position.Top} className={handleClass(selected)} />
      <Handle type="source" position={Position.Bottom} className={handleClass(selected)} />
    </div>
  );
}

// Region Container (blue dashed border)
function RegionNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className={cn(
        "rounded border-2 border-dashed min-w-[700px] min-h-[400px] relative",
        selected ? "border-cyan-500" : "border-[#147EBA]"
      )}
      style={{ backgroundColor: "rgba(20, 126, 186, 0.03)" }}
    >
      {/* Region Label */}
      <div className="absolute -top-3 left-4 flex items-center gap-1 bg-white px-2 py-0.5 border border-[#147EBA] rounded">
        <Globe className="w-3 h-3 text-[#147EBA]" />
        <span className="text-[#147EBA] text-xs font-medium">{data.label || "Region"}</span>
      </div>
      
      {/* Handles */}
      <Handle type="target" position={Position.Top} className={handleClass(selected)} />
      <Handle type="source" position={Position.Bottom} className={handleClass(selected)} />
    </div>
  );
}

// VPC Container - reads width/height from data
function VPCNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className={cn(
        "rounded border-2 border-dashed relative",
        selected ? "border-cyan-500" : "border-[#8C4FFF]"
      )}
      style={{ 
        backgroundColor: "rgba(140, 79, 255, 0.05)",
        width: data.width || 600,
        height: data.height || 350,
      }}
    >
      {/* VPC Label */}
      <div className="absolute -top-3 left-4 flex items-center gap-1 bg-white px-2 py-0.5 border border-[#8C4FFF] rounded">
        <Network className="w-3 h-3 text-[#8C4FFF]" />
        <span className="text-[#8C4FFF] text-xs font-medium">{data.label || "VPC"}</span>
        {data.sublabel && <span className="text-gray-500 text-[10px] ml-1">{data.sublabel}</span>}
      </div>
      
      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className={handleClass(selected)} />
      <Handle type="source" position={Position.Bottom} className={handleClass(selected)} />
    </div>
  );
}

// Availability Zone Container - reads width/height from data
function AZNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className={cn(
        "rounded border-2 border-dashed relative",
        selected ? "border-cyan-500" : "border-[#ED7100]"
      )}
      style={{ 
        backgroundColor: "rgba(237, 113, 0, 0.03)",
        width: data.width || 250,
        height: data.height || 300,
      }}
    >
      {/* AZ Label */}
      <div className="absolute -top-3 left-4 flex items-center gap-1 bg-white px-2 py-0.5 border border-[#ED7100] rounded">
        <LayoutGrid className="w-3 h-3 text-[#ED7100]" />
        <span className="text-[#ED7100] text-xs font-medium">{data.label || "Availability Zone"}</span>
      </div>
      
      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className={handleClass(selected)} />
      <Handle type="target" position={Position.Left} id="left" className={handleClass(selected)} />
      <Handle type="source" position={Position.Bottom} className={handleClass(selected)} />
      <Handle type="source" position={Position.Right} id="right" className={handleClass(selected)} />
    </div>
  );
}

// Subnet Container (Public/Private)
function SubnetNode({ data, selected }: { data: any; selected?: boolean }) {
  const isPublic = data.subnetType === "public";
  const color = isPublic ? "#7AA116" : "#527FFF";
  const bgColor = isPublic ? "#E8F5E8" : "#E8F0FA";
  
  return (
    <div
      className={cn(
        "rounded border relative",
        selected ? "border-cyan-500 border-2" : "border-gray-300"
      )}
      style={{ 
        backgroundColor: bgColor,
        width: data.width || 180,
        height: data.height || 120,
      }}
    >
      {/* Subnet Label */}
      <div 
        className="absolute top-0 left-0 right-0 px-2 py-1 rounded-t flex items-center gap-1"
        style={{ backgroundColor: color }}
      >
        <Layers className="w-3 h-3 text-white" />
        <span className="text-white text-xs font-medium">{data.label || (isPublic ? "Public subnet" : "Private subnet")}</span>
      </div>
      
      {/* Handles - only visible when selected */}
      <Handle type="target" position={Position.Top} className={handleClass(selected)} />
      <Handle type="target" position={Position.Left} id="left" className={handleClass(selected)} />
      <Handle type="source" position={Position.Bottom} className={handleClass(selected)} />
      <Handle type="source" position={Position.Right} id="right" className={handleClass(selected)} />
    </div>
  );
}

// Security Group Container
function SecurityGroupNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className={cn(
        "rounded border-2 border-dashed min-w-[150px] min-h-[100px] relative",
        selected ? "border-cyan-500" : "border-[#DD344C]"
      )}
      style={{ backgroundColor: "#FFEBEE20" }}
    >
      {/* SG Label */}
      <div className="absolute -top-3 left-4 flex items-center gap-1 bg-white px-2 py-0.5 border border-[#DD344C] rounded">
        <Shield className="w-3 h-3 text-[#DD344C]" />
        <span className="text-[#DD344C] text-[10px] font-medium">{data.label || "Security group"}</span>
      </div>
      
      <Handle type="target" position={Position.Left} className={handleClass(selected)} />
      <Handle type="source" position={Position.Right} className={handleClass(selected)} />
    </div>
  );
}

// Tier/Section Label Node (for Web Tier, App Tier, DB Tier columns)
function TierLabelNode({ data }: { data: any }) {
  const color = data.color || "#8C4FFF";
  
  return (
    <div 
      className="px-4 py-2 rounded-t-lg text-white text-sm font-medium text-center min-w-[150px]"
      style={{ backgroundColor: color }}
    >
      {data.label}
    </div>
  );
}

// Auto Scaling Group Node
function AutoScalingNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className={cn(
        "rounded border-2 border-dashed min-w-[120px] min-h-[80px] relative flex items-center justify-center",
        selected ? "border-cyan-500" : "border-[#ED7100]"
      )}
      style={{ backgroundColor: "#FFF4E520" }}
    >
      <div className="text-center">
        <Boxes className="w-6 h-6 text-[#ED7100] mx-auto mb-1" />
        <span className="text-[10px] text-gray-600 font-medium">{data.label || "Auto Scaling group"}</span>
      </div>
      
      <Handle type="target" position={Position.Top} className={handleClass(selected)} />
      <Handle type="source" position={Position.Bottom} className={handleClass(selected)} />
    </div>
  );
}

const nodeTypes = {
  awsResource: AWSResourceNode,
  awsCloud: AWSCloudNode,
  region: RegionNode,
  vpc: VPCNode,
  az: AZNode,
  subnet: SubnetNode,
  securityGroup: SecurityGroupNode,
  tierLabel: TierLabelNode,
  autoScaling: AutoScalingNode,
};

// Initial state
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export default function ArchitecturePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [architectureName, setArchitectureName] = useState("Untitled Architecture");
  const [architectureDescription, setArchitectureDescription] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("networking");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCostEstimate, setShowCostEstimate] = useState(false);
  const [deploymentOrder, setDeploymentOrder] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Architecture persistence state
  const [archId, setArchId] = useState<string | null>(null);
  const [archList, setArchList] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  
  // AI Agent state
  const [showAIAgent, setShowAIAgent] = useState(false);
  
  // AWS Sync state
  const [syncedServices, setSyncedServices] = useState<string[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Calculate cost estimate
  const costEstimate = useMemo(() => estimateArchitectureCost(nodes), [nodes]);
  
  // Validate architecture
  const validation = useMemo(() => validateArchitecture(nodes, edges), [nodes, edges]);

  // Fetch architecture list
  const fetchArchitectures = useCallback(async () => {
    try {
      setIsLoadingList(true);
      const res = await fetch("/api/architecture");
      if (res.ok) {
        const data = await res.json();
        setArchList(data.architectures || []);
      }
    } catch (error) {
      console.error("Failed to fetch architectures:", error);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Load architecture by ID
  const loadArchitecture = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/architecture/${id}`);
      if (res.ok) {
        const data = await res.json();
        const arch = data.architecture;
        setArchId(arch.id);
        setArchitectureName(arch.name);
        setArchitectureDescription(arch.description || "");
        setNodes(arch.nodes || []);
        setEdges(arch.edges || []);
        setIsDirty(false);
        toast({ title: "Loaded", description: `Architecture "${arch.name}" loaded` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load architecture", variant: "destructive" });
    }
  }, [setNodes, setEdges]);

  // Delete architecture
  const deleteArchitecture = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this architecture?")) return;
    
    try {
      const res = await fetch(`/api/architecture/${id}`, { method: "DELETE" });
      if (res.ok) {
        setArchList((prev) => prev.filter((a) => a.id !== id));
        if (archId === id) {
          setArchId(null);
          setArchitectureName("Untitled Architecture");
          setArchitectureDescription("");
          setNodes([]);
          setEdges([]);
        }
        toast({ title: "Deleted", description: "Architecture deleted" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }, [archId, setNodes, setEdges]);

  // Create new architecture
  const createNewArchitecture = useCallback(() => {
    setArchId(null);
    setArchitectureName("Untitled Architecture");
    setArchitectureDescription("");
    setNodes([]);
    setEdges([]);
    setIsDirty(false);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch architectures on mount
  useEffect(() => {
    if (session) {
      fetchArchitectures();
      fetchSyncedServices();
    }
  }, [session, fetchArchitectures]);

  // Fetch synced AWS services
  const fetchSyncedServices = async () => {
    try {
      const res = await fetch("/api/aws/sync");
      if (res.ok) {
        const data = await res.json();
        setSyncedServices(data.services || []);
        setServiceCounts(data.counts || {});
      }
    } catch (error) {
      console.error("Failed to fetch synced services:", error);
    }
  };

  // Sync AWS resources
  const syncAwsResources = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/aws/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSyncedServices(data.services?.map((s: any) => s.service) || []);
        setServiceCounts(
          data.services?.reduce((acc: any, s: any) => ({ ...acc, [s.service]: s.count }), {}) || {}
        );
        setLastSynced(new Date());
        toast({ 
          title: "AWS Synced", 
          description: `Found ${data.total} services with resources` 
        });
      } else {
        const error = await res.json();
        toast({ 
          title: "Sync Failed", 
          description: error.error || "Could not sync AWS resources",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({ 
        title: "Sync Failed", 
        description: "Could not connect to AWS",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Get services filtered by synced status
  const getSyncedAWSServices = () => {
    return AWS_SERVICES.filter(s => 
      syncedServices.includes(s.id.split('-')[0]) // Match service prefix like "ec2", "s3"
    );
  };

  // Get resource count for a category (sum of all services in that category)
  const getCategoryResourceCount = (categoryId: string) => {
    const categoryServices = AWS_SERVICES.filter(s => s.category === categoryId);
    return categoryServices.reduce((total, service) => {
      const serviceId = service.id.split('-')[0];
      return total + (serviceCounts[serviceId] || 0);
    }, 0);
  };

  // Check if a specific service has resources
  const getServiceResourceCount = (serviceId: string) => {
    const id = serviceId.split('-')[0];
    return serviceCounts[id] || 0;
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge({ 
      ...params, 
      type: 'smoothstep',
      animated: true, 
      style: { stroke: "#22d3ee", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' },
    }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Load a template
  const loadTemplate = useCallback((template: ArchitectureTemplate) => {
    setNodes(template.nodes);
    setEdges(template.edges);
    setArchitectureName(template.name);
    setDeploymentOrder(template.deploymentOrder);
    setShowTemplates(false);
    toast({ title: "Template Loaded", description: `Loaded "${template.name}" template` });
  }, [setNodes, setEdges]);

  // Drag and drop handlers - OLD (for legacy resources)
  const onDragStart = (event: React.DragEvent, resource: ResourceDefinition) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify({
      type: resource.type,
      label: resource.label,
      icon: resource.icon,
      color: resource.color,
      category: resource.category,
      config: {},
    }));
    event.dataTransfer.effectAllowed = "move";
  };

  // NEW: Drag handler for AWS services with real icons
  const onServiceDragStart = (event: React.DragEvent, service: AWSService) => {
    event.dataTransfer.setData("application/aws-service", JSON.stringify(service));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Get the position relative to the canvas
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 50,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      // Try new AWS service format first
      const awsServiceData = event.dataTransfer.getData("application/aws-service");
      if (awsServiceData) {
        const service: AWSService = JSON.parse(awsServiceData);
        const newNode: Node = {
          id: `${service.id}-${Date.now()}`,
          type: "awsResource",
          position,
          data: {
            serviceId: service.id,
            label: service.shortName,
            sublabel: service.description,
            icon: service.icon,
            color: service.color,
            type: service.id,
            category: service.category,
          },
          zIndex: 10,
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      // Fall back to old format
      const data = JSON.parse(event.dataTransfer.getData("application/reactflow"));
      
      // Map resource types to node types
      const nodeTypeMap: Record<string, string> = {
        "region": "region",
        "vpc": "vpc",
        "availability-zone": "az",
        "subnet": "subnet",
        "security-group": "securityGroup",
        "auto-scaling-group": "autoScaling",
      };

      const nodeType = nodeTypeMap[data.type] || "awsResource";
      const definition = getResourceDefinition(data.type);
      
      // Default sizes for container types
      const containerSizes: Record<string, { width: number; height: number }> = {
        "awsCloud": { width: 900, height: 600 },
        "region": { width: 800, height: 500 },
        "vpc": { width: 700, height: 450 },
        "az": { width: 300, height: 400 },
        "subnet": { width: 200, height: 150 },
        "securityGroup": { width: 180, height: 120 },
        "autoScaling": { width: 150, height: 100 },
      };

      const newNode: Node = {
        id: `${data.type}-${Date.now()}`,
        type: nodeType,
        position,
        data: {
          ...data,
          subnetType: data.type === "subnet" ? "private" : undefined,
          config: {},
        },
        style: containerSizes[nodeType],
        zIndex: nodeType === "awsResource" ? 10 : definition?.isContainer ? 1 : 5,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const deleteSelectedNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  };

  const clearCanvas = () => {
    if (confirm("Clear all resources from canvas?")) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  };

  const saveArchitecture = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: architectureName,
        description: architectureDescription,
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        estimatedCost: costEstimate.monthly,
        status: "draft",
      };

      let res;
      if (archId) {
        // Update existing
        res = await fetch(`/api/architecture/${archId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new
        res = await fetch("/api/architecture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (!archId && data.architecture?.id) {
          setArchId(data.architecture.id);
        }
        setIsDirty(false);
        fetchArchitectures(); // Refresh list
        toast({ title: "Saved", description: `Architecture "${architectureName}" saved successfully` });
      } else {
        throw new Error("Save failed");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save architecture", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const exportArchitecture = () => {
    const data = { name: architectureName, nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${architectureName.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Deploy architecture to AWS
  const handleDeploy = async () => {
    if (!archId) {
      // Save first if not saved
      toast({ title: "Save Required", description: "Please save your architecture before deploying", variant: "destructive" });
      return;
    }

    if (!validation.valid) {
      toast({ title: "Validation Failed", description: validation.errors.join(", "), variant: "destructive" });
      return;
    }

    if (!confirm(`Deploy "${architectureName}" to AWS?\n\nEstimated cost: $${costEstimate.monthly.toFixed(2)}/month\n\nThis will create real AWS resources and may incur charges.`)) {
      return;
    }

    setIsDeploying(true);
    try {
      const res = await fetch(`/api/architecture/${archId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        toast({ 
          title: "Deployment Started", 
          description: `Deployment ${data.deploymentId} is in progress. This may take several minutes.` 
        });
        
        // Poll for status
        pollDeploymentStatus(data.deploymentId);
      } else {
        throw new Error(data.error || "Deployment failed");
      }
    } catch (error: any) {
      toast({ title: "Deployment Failed", description: error.message, variant: "destructive" });
      setIsDeploying(false);
    }
  };

  // Poll deployment status
  const pollDeploymentStatus = async (deploymentId: string) => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/architecture/${archId}/deploy?deploymentId=${deploymentId}`);
        const data = await res.json();
        
        if (data.deployment?.status === "COMPLETED") {
          toast({ title: "Deployment Complete", description: "Your architecture has been deployed to AWS!" });
          setIsDeploying(false);
          fetchArchitectures(); // Refresh to show new status
        } else if (data.deployment?.status === "FAILED") {
          toast({ 
            title: "Deployment Failed", 
            description: data.deployment.error || "Unknown error", 
            variant: "destructive" 
          });
          setIsDeploying(false);
        } else {
          // Still in progress, check again in 5 seconds
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error("Failed to check deployment status:", error);
        setTimeout(checkStatus, 5000);
      }
    };
    
    checkStatus();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-terminal-cyan animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar onConfigClick={() => setIsConfigOpen(true)} />
        <div className="w-52 shrink-0" />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Header */}
          <header className="shrink-0 border-b border-border/50 bg-card/50">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Boxes className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <Input
                    value={architectureName}
                    onChange={(e) => setArchitectureName(e.target.value)}
                    className="text-lg font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {nodes.length} resources • {edges.length} connections
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Generate with AI Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAIAgent(true)}
                  className="gap-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </Button>

                {/* Templates Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTemplates(true)}
                  className="gap-2"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  Templates
                </Button>

                {/* Cost Estimate */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowCostEstimate(!showCostEstimate)}
                      className="gap-1"
                    >
                      <DollarSign className="w-4 h-4" />
                      ${costEstimate.monthly.toFixed(0)}/mo
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Estimated Monthly Cost</TooltipContent>
                </Tooltip>

                {/* Validation Status */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "p-2 rounded-lg",
                      validation.valid ? "bg-green-500/10" : "bg-amber-500/10"
                    )}>
                      {validation.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {validation.valid ? "Architecture Valid" : validation.errors.join(", ")}
                  </TooltipContent>
                </Tooltip>

                <div className="w-px h-6 bg-border" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={saveArchitecture} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={exportArchitecture}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export JSON</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={clearCanvas}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear Canvas</TooltipContent>
                </Tooltip>

                <Button 
                  className="bg-purple-500 hover:bg-purple-600 text-white gap-2"
                  disabled={!validation.valid || isDeploying || nodes.length === 0}
                  onClick={handleDeploy}
                >
                  {isDeploying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  Deploy to AWS
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* AWS Service Palette - New with real icons */}
            <div className="w-64 border-r border-border/50 bg-card/30 flex flex-col h-full">
              {/* Search */}
              <div className="p-3 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm bg-accent/50"
                  />
                </div>
              </div>

              {/* Service List */}
              <div className="flex-1 overflow-y-auto p-2">
                {searchQuery ? (
                  // Search results
                  <div className="space-y-1">
                    {(() => {
                      const filtered = AWS_SERVICES.filter(s => 
                        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.description.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      return (
                        <>
                          <p className="text-xs text-muted-foreground px-2 py-1">
                            {filtered.length} results
                          </p>
                          {filtered.map((service) => (
                            <div
                              key={service.id}
                              draggable
                              onDragStart={(e) => onServiceDragStart(e, service)}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent/30 hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors"
                            >
                              <div
                                className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${service.color}15` }}
                              >
                                <Image
                                  src={service.icon}
                                  alt={service.name}
                                  width={24}
                                  height={24}
                                  className="object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{service.shortName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{service.description}</p>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  // Category view with synced services first
                  <div className="space-y-1">
                    {/* Sync Button */}
                    <div className="px-2 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-2"
                        onClick={syncAwsResources}
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Syncing AWS...
                          </>
                        ) : (
                          <>
                            <Cloud className="w-3 h-3" />
                            {syncedServices.length > 0 ? "Refresh AWS" : "Sync AWS Resources"}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Categories - Only show if synced and has resources, or not synced yet */}
                    {syncedServices.length === 0 ? (
                      // Not synced yet - show message
                      <div className="px-2 py-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          Sync your AWS account to see your services
                        </p>
                      </div>
                    ) : (
                      // Synced - only show categories with resources
                      <>
                        <div className="px-2 py-1">
                          <span className="text-xs font-medium text-green-500">YOUR AWS SERVICES</span>
                        </div>
                        {AWS_CATEGORIES.map((category) => {
                          const resourceCount = getCategoryResourceCount(category.id);
                          
                          // Skip categories with no resources
                          if (resourceCount === 0) return null;
                          
                          const services = getServicesByCategory(category.id);
                          const servicesWithResources = services.filter(s => getServiceResourceCount(s.id) > 0);
                          const isExpanded = expandedCategory === category.id;

                          return (
                            <div key={category.id}>
                              <button
                                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                                className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-sm"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  <span className="text-sm font-medium">{category.name}</span>
                                  <span className="text-xs text-green-500 font-medium">
                                    ({resourceCount} resources)
                                  </span>
                                </div>
                                <ChevronDown
                                  className={cn(
                                    "w-4 h-4 text-muted-foreground transition-transform",
                                    isExpanded && "rotate-180"
                                  )}
                                />
                              </button>

                              {isExpanded && (
                                <div className="ml-2 mt-1 space-y-1">
                                  {servicesWithResources.map((service) => {
                                    const serviceResourceCount = getServiceResourceCount(service.id);
                                    
                                    return (
                                      <div
                                        key={service.id}
                                        draggable
                                        onDragStart={(e) => onServiceDragStart(e, service)}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 cursor-grab active:cursor-grabbing transition-colors"
                                      >
                                        <div
                                          className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                                          style={{ backgroundColor: `${service.color}15` }}
                                        >
                                          <Image
                                            src={service.icon}
                                            alt={service.name}
                                            width={24}
                                            height={24}
                                            className="object-contain"
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{service.shortName}</p>
                                          <p className="text-[10px] text-green-500 truncate">
                                            {serviceResourceCount} resources
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* My Architectures Section */}
              <div className="border-t border-border/50 p-2">
                <div className="flex items-center justify-between px-2 mb-2">
                  <p className="text-xs font-medium text-muted-foreground">MY ARCHITECTURES</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={createNewArchitecture}
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-500" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {isLoadingList ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                    </div>
                  ) : archList.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No saved architectures</p>
                  ) : (
                    archList.map((arch) => (
                      <div
                        key={arch.id}
                        onClick={() => loadArchitecture(arch.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm group",
                          archId === arch.id 
                            ? "bg-purple-500/20 border border-purple-500/50" 
                            : "hover:bg-accent/50"
                        )}
                      >
                        <Boxes className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate flex-1">{arch.name}</span>
                        <button
                          onClick={(e) => deleteArchitecture(arch.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground text-center">
                  {syncedServices.length > 0 
                    ? `${syncedServices.length} synced services (${Object.values(serviceCounts).reduce((a, b) => a + b, 0)} resources)`
                    : "Sync AWS to see your services"
                  }
                </p>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 h-full relative" onDragOver={onDragOver} onDrop={onDrop}>
              <div className="absolute inset-0">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  onPaneClick={onPaneClick}
                  nodeTypes={nodeTypes}
                  connectionMode={ConnectionMode.Loose}
                  defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#22d3ee', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' },
                  }}
                  fitView
                  className="bg-background"
                  proOptions={{ hideAttribution: true }}
                >
                  <Controls 
                    className="!bg-card !border-border !rounded-lg !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent"
                  />
                  <MiniMap
                    className="!bg-card !border-border !rounded-lg"
                    nodeColor={(node) => node.data?.color || "#666"}
                    maskColor="rgba(0, 0, 0, 0.8)"
                    style={{ backgroundColor: "hsl(var(--card))" }}
                  />
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
                </ReactFlow>
              </div>
            </div>

            {/* Properties Panel */}
            {selectedNode && (
              <div className="w-80 border-l border-border/50 bg-card/30 overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-muted-foreground">RESOURCE PROPERTIES</p>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {/* Resource Header */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                      {(() => {
                        const IconComp = iconMap[selectedNode.data.icon] || Server;
                        return <IconComp className="w-6 h-6" style={{ color: selectedNode.data.color }} />;
                      })()}
                      <div>
                        <p className="text-sm font-medium">{selectedNode.data.label}</p>
                        <p className="text-xs text-muted-foreground uppercase">{selectedNode.data.type}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Node ID</label>
                      <p className="text-xs font-mono text-muted-foreground bg-accent/30 p-2 rounded">{selectedNode.id}</p>
                    </div>

                    {/* Config Fields */}
                    {(() => {
                      const definition = getResourceDefinition(selectedNode.data.type);
                      if (!definition) return null;
                      
                      return (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">CONFIGURATION</p>
                          {definition.config.slice(0, 5).map((field) => (
                            <div key={field.id}>
                              <label className="text-xs text-muted-foreground mb-1 block">
                                {field.label}
                                {field.required && <span className="text-red-400 ml-1">*</span>}
                              </label>
                              {field.type === "select" ? (
                                <select className="w-full bg-accent border border-border rounded px-2 py-1.5 text-sm">
                                  {field.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              ) : field.type === "boolean" ? (
                                <input type="checkbox" defaultChecked={field.default} className="rounded" />
                              ) : (
                                <Input
                                  type={field.type === "number" ? "number" : "text"}
                                  placeholder={field.placeholder}
                                  defaultValue={field.default}
                                  className="bg-accent border-border text-sm"
                                />
                              )}
                              {field.description && (
                                <p className="text-[10px] text-muted-foreground mt-1">{field.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* IAM Permissions */}
                    {(() => {
                      const definition = getResourceDefinition(selectedNode.data.type);
                      if (!definition?.iamActions.length) return null;
                      
                      return (
                        <div className="pt-3 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">REQUIRED IAM PERMISSIONS</p>
                          <div className="space-y-1">
                            {definition.iamActions.slice(0, 3).map((action) => (
                              <p key={action} className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                                {action}
                              </p>
                            ))}
                            {definition.iamActions.length > 3 && (
                              <p className="text-[10px] text-muted-foreground">
                                +{definition.iamActions.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="pt-4 border-t border-border">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={deleteSelectedNode}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Resource
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Template Picker Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Architecture Templates</h2>
                  <p className="text-sm text-muted-foreground">Start with a proven architecture pattern</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="grid grid-cols-2 gap-4">
                  {allTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-border rounded-lg p-4 hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer transition-all group"
                      onClick={() => loadTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium group-hover:text-purple-400 transition-colors">
                            {template.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full",
                              template.complexity === "beginner" && "bg-green-500/20 text-green-400",
                              template.complexity === "intermediate" && "bg-amber-500/20 text-amber-400",
                              template.complexity === "advanced" && "bg-red-500/20 text-red-400"
                            )}>
                              {template.complexity}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                              {template.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-400">
                            ${template.estimatedCost.min}-${template.estimatedCost.max}
                          </p>
                          <p className="text-[10px] text-muted-foreground">/month</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{template.nodes.length} resources</span>
                        <span>{template.edges.length} connections</span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-1">USE CASES:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.useCases.slice(0, 3).map((useCase) => (
                            <span key={useCase} className="text-[10px] bg-accent px-2 py-0.5 rounded">
                              {useCase}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cost Breakdown Panel */}
        {showCostEstimate && costEstimate.breakdown.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-xl p-4 w-80 z-40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Cost Breakdown</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCostEstimate(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {costEstimate.breakdown.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate">{item.resource}</span>
                  <span className="text-foreground">${item.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between">
              <span className="font-medium">Total (estimated)</span>
              <span className="font-medium text-green-400">${costEstimate.monthly.toFixed(2)}/mo</span>
            </div>
          </div>
        )}

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

        {/* AI Agent Modal */}
        {showAIAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-2xl mx-4">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 text-white hover:bg-white/10"
                onClick={() => setShowAIAgent(false)}
              >
                <X className="w-4 h-4 mr-1" />
                Close
              </Button>
              <ArchitectureAgentChat
                onArchitectureGenerated={(archId) => {
                  setShowAIAgent(false);
                  loadArchitecture(archId);
                  fetchArchitectures();
                  toast({ title: "Architecture Generated", description: "AI-generated architecture loaded onto canvas" });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
