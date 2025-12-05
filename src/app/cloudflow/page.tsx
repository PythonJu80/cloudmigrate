"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GitBranch,
  Save,
  Download,
  Play,
  Trash2,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  Plus,
  Pause,
  Settings,
  Clock,
  Server,
  Database,
  HardDrive,
  Zap,
  Bell,
  Globe,
  Code,
  MessageSquare,
  Upload,
  FolderPlus,
  Square,
  Webhook,
  Container,
  Key,
  Workflow,
  // Additional icons for expanded nodes
  Radio,
  Mail,
  Activity,
  Cloud,
  BarChart,
  FileText,
  AlertTriangle,
  Brain,
  Eye,
  MessageCircle,
  Volume2,
  Mic,
  // More icons for full cloud coverage
  Box,
  Folder,
  Shield,
  Lock,
  Unlock,
  Layers,
  Cpu,
  Search,
  Camera,
  RefreshCw,
  List,
  User,
  Cog,
  // Local file icons
  FileOutput,
  FileSymlink,
  FileSearch,
  FolderOpen,
  FileJson,
  Table,
  Copy,
  Send,
  Bot,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { nodeRegistry, nodeCategories, getNodeDefinition } from "@/lib/cloudflow/nodes/registry";
import type { CloudNodeDefinition } from "@/lib/cloudflow/nodes/types";
import { WorkflowAgentChat } from "@/components/cloudflow/workflow-agent-chat";
import { EXAMPLE_WORKFLOWS, EXAMPLE_CATEGORIES, getExampleById } from "@/lib/cloudflow/examples";

// Icon mapping
const iconMap: Record<string, any> = {
  Play,
  Clock,
  Webhook,
  Server,
  Zap,
  Square,
  FolderPlus,
  Upload,
  Download,
  Database,
  Bell,
  MessageSquare,
  GitBranch,
  Code,
  Globe,
  HardDrive,
  Container,
  Key,
  Workflow,
  // Additional icons for expanded nodes
  Radio,
  Mail,
  Activity,
  Cloud,
  BarChart,
  FileText,
  AlertTriangle,
  Brain,
  Eye,
  MessageCircle,
  Volume2,
  Mic,
  // More icons for full cloud coverage
  Box,
  Folder,
  Shield,
  Lock,
  Unlock,
  Layers,
  Cpu,
  Search,
  Camera,
  RefreshCw,
  List,
  User,
  Cog,
  Settings,
  Trash2,
  // Local file icons
  FileOutput,
  FileSymlink,
  FileSearch,
  FolderOpen,
  FileJson,
  Table,
  Copy,
  Send,
};

// Custom node component for CloudFlow
function CloudFlowNode({ data, selected, id }: { data: any; selected: boolean; id: string }) {
  const Icon = iconMap[data.icon] || Server;
  const definition = getNodeDefinition(data.definitionId);
  
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Dispatch custom event to open node picker for this node
    window.dispatchEvent(new CustomEvent('openNodePicker', { detail: { nodeId: id } }));
  };
  
  return (
    <div
      className={cn(
        "min-w-[180px] rounded-lg border-2 bg-card shadow-lg transition-all relative",
        selected ? "border-amber-500 shadow-amber-500/20" : "border-border",
        data.status === "running" && "border-amber-500 animate-pulse",
        data.status === "success" && "border-green-500",
        data.status === "error" && "border-red-500"
      )}
    >
      {/* Input handle - always show for action nodes */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-zinc-600 !border !border-zinc-400"
      />

      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: `${data.color}15` }}
      >
        <div
          className="p-1.5 rounded"
          style={{ backgroundColor: `${data.color}30` }}
        >
          <Icon className="w-4 h-4" style={{ color: data.color }} />
        </div>
        <span className="text-sm font-medium text-foreground truncate">{data.label}</span>
      </div>

      {/* Config preview */}
      {data.configPreview && (
        <div className="px-3 py-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground truncate">{data.configPreview}</p>
        </div>
      )}

      {/* Status footer */}
      {(data.runCount || data.status) && (
        <div className="px-3 py-1.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          {data.runCount && <span>✓ {data.runCount} runs</span>}
          {data.status === "running" && <span className="text-amber-500">Running...</span>}
          {data.status === "success" && <span className="text-green-500">Success</span>}
          {data.status === "error" && <span className="text-red-500">Failed</span>}
        </div>
      )}

      {/* Output handle - hide if terminal node */}
      {!data.isTerminal && (
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          onClick={handleAddClick}
          className="!w-3 !h-3 !bg-amber-500 !border !border-amber-400 !cursor-pointer"
        />
      )}
    </div>
  );
}

// Trigger node with special styling
function TriggerNode({ data, selected, id }: { data: any; selected: boolean; id: string }) {
  const Icon = iconMap[data.icon] || Play;
  const definition = getNodeDefinition(data.definitionId);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('openNodePicker', { detail: { nodeId: id } }));
  };

  return (
    <div
      className={cn(
        "min-w-[160px] rounded-lg border-2 bg-card shadow-lg relative",
        selected ? "border-green-500 shadow-green-500/20" : "border-green-500/50"
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 bg-green-500/10">
        <div className="p-1.5 rounded bg-green-500/20">
          <Icon className="w-4 h-4 text-green-500" />
        </div>
        <span className="text-sm font-medium text-foreground">{data.label}</span>
      </div>

      {/* Config preview */}
      {data.configPreview && (
        <div className="px-3 py-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">{data.configPreview}</p>
        </div>
      )}

      {/* Output handle - triggers always have output */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        onClick={handleAddClick}
        className={cn(
          "!w-4 !h-4 !border !cursor-pointer !flex !items-center !justify-center",
          "!bg-green-500 !border-green-400"
        )}
      >
        <Plus className="w-2 h-2 pointer-events-none text-background" />
      </Handle>
    </div>
  );
}

const nodeTypes = {
  cloudflow: CloudFlowNode,
  trigger: TriggerNode,
};

// Flow list item type
interface FlowListItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  isShared: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  runCount: number;
  updatedAt: string;
  isOwner: boolean;
}

export default function CloudFlowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowIdParam = searchParams.get("id");
  
  // Always show editor (canvas) - flows are in sidebar
  const [viewMode, setViewMode] = useState<"editor">("editor");
  const [flowList, setFlowList] = useState<FlowListItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  
  // Current flow state
  const [flowId, setFlowId] = useState<string | null>(flowIdParam);
  const [flowName, setFlowName] = useState("Untitled Flow");
  const [flowDescription, setFlowDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("trigger");
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showAddNodeMenu, setShowAddNodeMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'node' | 'edge' | 'pane'; id: string } | null>(null);
  const [contextMenuExpanded, setContextMenuExpanded] = useState<string | null>(null);
  const [nodePickerForNode, setNodePickerForNode] = useState<string | null>(null);
  
  // Execution results for output display
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({});
  
  // Workflow Agent chat panel
  const [showAgentChat, setShowAgentChat] = useState(false);
  
  // Examples dropdown
  const [showExamples, setShowExamples] = useState(false);

  // Load example workflow to canvas (unsaved)
  const loadExample = useCallback((exampleId: string) => {
    const example = getExampleById(exampleId);
    if (!example) return;

    // Map nodes to proper format
    const mappedNodes = example.nodes.map((node: any) => {
      const definition = getNodeDefinition(node.definitionId);
      return {
        id: node.id,
        type: "cloudflow",
        position: node.position,
        data: {
          id: node.id,
          definitionId: node.definitionId,
          label: definition?.label || node.definitionId,
          description: definition?.description || "",
          icon: definition?.icon || "Zap",
          color: definition?.color || "#f59e0b",
          type: definition?.type || "action",
          config: node.data?.config || {},
        },
      };
    });

    const mappedEdges = example.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: "output",
      targetHandle: "input",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#f59e0b" },
    }));

    // Clear current flow and load example (unsaved state)
    setFlowId(null);
    setFlowName(example.name);
    setFlowDescription(example.description);
    setNodes(mappedNodes);
    setEdges(mappedEdges);
    setIsDirty(true);
    setShowExamples(false);
    
    toast({ title: "Example Loaded", description: `"${example.name}" loaded. Save to add to My Workflows.` });
  }, [setNodes, setEdges]);

  // Update node config helper
  const updateNodeConfig = useCallback((nodeId: string, fieldId: string, value: any) => {
    setNodes((nds: Node[]) =>
      nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                config: { ...n.data.config, [fieldId]: value },
              },
            }
          : n
      )
    );
    setIsDirty(true);
  }, [setNodes]);

  // Listen for openNodePicker events from node plus buttons
  useEffect(() => {
    const handleOpenNodePicker = (e: CustomEvent<{ nodeId: string }>) => {
      setNodePickerForNode(e.detail.nodeId);
      setContextMenuExpanded(null);
    };
    window.addEventListener('openNodePicker', handleOpenNodePicker as EventListener);
    return () => window.removeEventListener('openNodePicker', handleOpenNodePicker as EventListener);
  }, []);

  // Calculate next node position for auto-layout (horizontal row)
  const getNextNodePosition = useCallback(() => {
    if (nodes.length === 0) {
      return { x: 100, y: 200 };
    }
    const rightmostNode = nodes.reduce((prev: Node, curr: Node) => 
      (curr.position.x > prev.position.x) ? curr : prev
    );
    return {
      x: rightmostNode.position.x + 250,
      y: rightmostNode.position.y,
    };
  }, [nodes]);

  // Add node from sidebar (no auto-connect)
  const addNodeFromSidebar = useCallback((nodeDef: CloudNodeDefinition) => {
    const position = getNextNodePosition();
    // Determine React Flow node type - output uses cloudflow like other actions
    const rfNodeType = nodeDef.type === "trigger" ? "trigger" : "cloudflow";
    const newNode: Node = {
      id: `${nodeDef.id}-${Date.now()}`,
      type: rfNodeType,
      position,
      data: {
        definitionId: nodeDef.id,
        label: nodeDef.label,
        icon: nodeDef.icon,
        color: nodeDef.color,
        type: nodeDef.type,
        config: {},
      },
    };
    setNodes((nds: Node[]) => nds.concat(newNode));
    setSelectedNode(newNode);
  }, [getNextNodePosition, setNodes]);

  // Add node and auto-connect to source node (from plus button or selected node)
  const addNodeAndConnect = useCallback((nodeDef: CloudNodeDefinition) => {
    // Use nodePickerForNode if available, otherwise use selectedNode
    const sourceNodeId = nodePickerForNode || selectedNode?.id;
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    
    if (!sourceNode) return;
    
    const position = {
      x: sourceNode.position.x + 250,
      y: sourceNode.position.y,
    };
    
    // Determine React Flow node type - output uses cloudflow like other actions
    const rfNodeType = nodeDef.type === "trigger" ? "trigger" : "cloudflow";
    
    const newNode: Node = {
      id: `${nodeDef.id}-${Date.now()}`,
      type: rfNodeType,
      position,
      data: {
        definitionId: nodeDef.id,
        label: nodeDef.label,
        icon: nodeDef.icon,
        color: nodeDef.color,
        type: nodeDef.type,
        config: {},
      },
    };
    
    setNodes((nds: Node[]) => nds.concat(newNode));
    
    // Auto-connect - use standard handle IDs
    const newEdge: Edge = {
      id: `edge-${sourceNode.id}-${newNode.id}-${Date.now()}`,
      source: sourceNode.id,
      sourceHandle: "output",
      target: newNode.id,
      targetHandle: "input",
      animated: true,
      style: { stroke: "#f59e0b", strokeWidth: 2 },
    };
    
    setEdges((eds: Edge[]) => [...eds, newEdge]);
    
    setShowAddNodeMenu(false);
    setNodePickerForNode(null);
    setSelectedNode(newNode);
    setIsDirty(true);
  }, [nodePickerForNode, selectedNode, nodes, setNodes, setEdges]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#f59e0b", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setShowAddNodeMenu(false);
    setContextMenu(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowAddNodeMenu(false);
    setContextMenu(null);
    setContextMenuExpanded(null);
  }, []);

  // Right-click on canvas to add node
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'pane',
      id: '',
    });
  }, []);

  // Right-click handlers for context menu
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      id: node.id,
    });
  }, []);

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'edge',
      id: edge.id,
    });
  }, []);

  // Delete node by ID
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds: Node[]) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds: Edge[]) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
    setContextMenu(null);
  }, [setNodes, setEdges, selectedNode]);

  // Delete edge by ID
  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds: Edge[]) => eds.filter((e) => e.id !== edgeId));
    setContextMenu(null);
  }, [setEdges]);

  // Drag and drop handlers
  const onDragStart = (event: React.DragEvent, nodeDef: CloudNodeDefinition) => {
    event.dataTransfer.setData(
      "application/cloudflow",
      JSON.stringify({
        definitionId: nodeDef.id,
        label: nodeDef.label,
        icon: nodeDef.icon,
        color: nodeDef.color,
        type: nodeDef.type,
      })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = JSON.parse(event.dataTransfer.getData("application/cloudflow"));
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 90,
        y: event.clientY - reactFlowBounds.top - 30,
      };

      const newNode: Node = {
        id: `${data.definitionId}-${Date.now()}`,
        type: data.type === "trigger" ? "trigger" : "cloudflow",
        position,
        data: {
          ...data,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const deleteSelectedNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
      );
      setSelectedNode(null);
    }
  };

  const clearCanvas = () => {
    if (confirm("Clear all nodes from canvas?")) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  };

  // Delete flow from database
  const deleteFlow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger load
    if (!confirm("Delete this flow permanently?")) return;
    
    try {
      await fetch(`/api/cloudflow/${id}`, { method: "DELETE" });
      toast({ title: "Deleted", description: "Flow deleted successfully" });
      
      // If we deleted the current flow, clear canvas
      if (flowId === id) {
        setFlowId(null);
        setFlowName("Untitled Workflow");
        setFlowDescription("");
        setNodes([]);
        setEdges([]);
        setSelectedNode(null);
        window.history.pushState({}, "", "/cloudflow");
      }
      
      // Refresh list
      loadFlowList();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete flow", variant: "destructive" });
    }
  };

  // Load flow list
  const loadFlowList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch("/api/cloudflow");
      if (!res.ok) throw new Error("Failed to load flows");
      const data = await res.json();
      setFlowList(data.flows || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load flows", variant: "destructive" });
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Load single flow
  const loadFlow = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/cloudflow/${id}`);
      if (!res.ok) throw new Error("Failed to load flow");
      const data = await res.json();
      const flow = data.flow;
      
      setFlowId(flow.id);
      setFlowName(flow.name);
      setFlowDescription(flow.description || "");
      setIsShared(flow.isShared);
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
      setIsDirty(false);
      setViewMode("editor");
    } catch (error) {
      toast({ title: "Error", description: "Failed to load flow", variant: "destructive" });
    }
  }, [setNodes, setEdges]);

  // Load flow list on mount, and load specific flow if ID in URL
  useEffect(() => {
    loadFlowList();
    if (flowIdParam) {
      loadFlow(flowIdParam);
    }
  }, [flowIdParam, loadFlow, loadFlowList]);

  // Create new flow
  const createNewFlow = async () => {
    try {
      const res = await fetch("/api/cloudflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Flow", nodes: [], edges: [] }),
      });
      if (!res.ok) throw new Error("Failed to create flow");
      const data = await res.json();
      
      setFlowId(data.flow.id);
      setFlowName(data.flow.name);
      setFlowDescription("");
      setIsShared(false);
      setNodes([]);
      setEdges([]);
      setIsDirty(false);
      setViewMode("editor");
      
      // Update URL without reload
      window.history.pushState({}, "", `/cloudflow?id=${data.flow.id}`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create flow", variant: "destructive" });
    }
  };

  // Save flow
  const saveFlow = async () => {
    setIsSaving(true);
    try {
      if (flowId) {
        // Update existing flow
        const res = await fetch(`/api/cloudflow/${flowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: flowName,
            description: flowDescription,
            nodes,
            edges,
            isShared,
          }),
        });
        if (!res.ok) throw new Error("Failed to save flow");
        setIsDirty(false);
        toast({ title: "Saved", description: `Flow "${flowName}" saved successfully` });
      } else {
        // Create new flow
        const res = await fetch("/api/cloudflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: flowName,
            description: flowDescription,
            nodes,
            edges,
            isShared,
          }),
        });
        if (!res.ok) throw new Error("Failed to create flow");
        const data = await res.json();
        setFlowId(data.flow.id);
        setIsDirty(false);
        window.history.pushState({}, "", `/cloudflow?id=${data.flow.id}`);
        toast({ title: "Saved", description: `Flow "${flowName}" created successfully` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save flow", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save every 10 seconds - only for existing flows (already saved once)
  useEffect(() => {
    if (!flowId) return; // Only auto-save if flow already exists
    
    const autoSaveTimer = setInterval(async () => {
      if (isDirty && !isSaving) {
        try {
          await fetch(`/api/cloudflow/${flowId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: flowName,
              description: flowDescription,
              nodes,
              edges,
              isShared,
            }),
          });
          setIsDirty(false);
          toast({ title: "Auto-saved", description: "Changes saved automatically" });
        } catch (error) {
          // Silent fail for auto-save
        }
      }
    }, 10000);
    
    return () => clearInterval(autoSaveTimer);
  }, [flowId]); // Only re-create interval when flowId changes

  // Run flow via API
  const runFlow = async () => {
    if (nodes.length === 0) {
      toast({ title: "Error", description: "Add nodes to run the flow", variant: "destructive" });
      return;
    }

    // Save first if dirty
    if (isDirty || !flowId) {
      await saveFlow();
    }

    if (!flowId) {
      toast({ title: "Error", description: "Please save the flow first", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setExecutionResults({});
    
    // Set all nodes to pending
    setNodes((nds: Node[]) =>
      nds.map((n) => ({ ...n, data: { ...n.data, status: "idle" } }))
    );

    try {
      const res = await fetch(`/api/cloudflow/${flowId}/run`, {
        method: "POST",
      });
      const result = await res.json();

      if (result.success) {
        // Update nodes with results
        setNodes((nds: Node[]) =>
          nds.map((n) => {
            const nodeResult = result.nodeResults?.[n.id];
            return {
              ...n,
              data: {
                ...n.data,
                status: nodeResult?.status || "success",
                runCount: (n.data.runCount || 0) + 1,
                lastOutput: nodeResult?.outputs,
              },
            };
          })
        );
        setExecutionResults(result.nodeResults || {});
        toast({ title: "Success", description: `Flow executed in ${result.duration}ms` });
      } else {
        // Mark failed nodes
        setNodes((nds: Node[]) =>
          nds.map((n) => {
            const nodeResult = result.nodeResults?.[n.id];
            return {
              ...n,
              data: {
                ...n.data,
                status: nodeResult?.status || "error",
                error: nodeResult?.error,
              },
            };
          })
        );
        toast({ 
          title: "Execution Failed", 
          description: result.error || "Flow execution failed", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to execute flow", 
        variant: "destructive" 
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Back to list
  const backToList = () => {
    if (isDirty && !confirm("You have unsaved changes. Discard them?")) return;
    setViewMode("list");
    setFlowId(null);
    setNodes([]);
    setEdges([]);
    setFlowName("Untitled Flow");
    setIsDirty(false);
    window.history.pushState({}, "", "/cloudflow");
    loadFlowList();
  };

  const exportFlow = () => {
    const data = { name: flowName, nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${flowName.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group nodes by category
  const nodesByCategory = useMemo(() => {
    const grouped: Record<string, CloudNodeDefinition[]> = {};
    nodeCategories.forEach((cat) => {
      grouped[cat.id] = nodeRegistry.filter((n) => n.category === cat.id);
    });
    return grouped;
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
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
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <GitBranch className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <Input
                    value={flowName}
                    onChange={(e) => { setFlowName(e.target.value); setIsDirty(true); }}
                    className="text-lg font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {nodes.length} nodes • {edges.length} connections
                    {isDirty && <span className="text-amber-500 ml-2">• Unsaved changes</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={saveFlow} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={exportFlow}>
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

                {/* Examples Dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExamples(!showExamples)}
                    className="gap-2 border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Examples
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  
                  {showExamples && (
                    <div className="absolute top-full mt-2 right-0 w-80 bg-card border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                      <div className="p-2">
                        {EXAMPLE_CATEGORIES.map((category) => (
                          <div key={category} className="mb-2">
                            <p className="text-xs font-medium text-muted-foreground px-2 py-1">{category.toUpperCase()}</p>
                            {EXAMPLE_WORKFLOWS.filter(w => w.category === category).map((example) => (
                              <button
                                key={example.id}
                                onClick={() => loadExample(example.id)}
                                className="w-full text-left px-3 py-2 rounded hover:bg-accent/50 transition-colors"
                              >
                                <p className="text-sm font-medium">{example.name}</p>
                                <p className="text-xs text-muted-foreground">{example.description}</p>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAgentChat(true)}
                  className="gap-2 border-purple-500/50 text-purple-500 hover:bg-purple-500/10"
                >
                  <Bot className="w-4 h-4" />
                  Generate with AI
                </Button>

                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-black font-medium gap-2"
                  onClick={runFlow}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Flow
                    </>
                  )}
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Node Palette - Hierarchical: Provider → Category → Nodes */}
            <div className="w-72 border-r border-border/50 bg-card/30 overflow-y-auto">
              <div className="p-3">
                {/* Triggers Section - Always visible at top */}
                <div className="mb-4">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === "trigger" ? null : "trigger")}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Triggers</span>
                      <span className="text-xs text-muted-foreground">({nodesByCategory["trigger"]?.length || 0})</span>
                    </div>
                    {expandedCategory === "trigger" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedCategory === "trigger" && (
                    <div className="ml-4 mt-1 space-y-1">
                      {(nodesByCategory["trigger"] || []).map((nodeDef) => {
                        const NodeIcon = iconMap[nodeDef.icon] || Server;
                        return (
                          <div 
                            key={nodeDef.id} 
                            draggable 
                            onDragStart={(e) => onDragStart(e, nodeDef)}
                            onClick={() => addNodeFromSidebar(nodeDef)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/30 hover:bg-accent/50 cursor-pointer group"
                          >
                            <NodeIcon className="w-4 h-4" style={{ color: nodeDef.color }} />
                            <span className="text-sm truncate flex-1">{nodeDef.label}</span>
                            <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cloud Providers */}
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">CLOUD PROVIDERS</p>
                
                {/* AWS */}
                <div className="mb-2">
                  <button
                    onClick={() => setExpandedProvider(expandedProvider === "aws" ? null : "aws")}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4" style={{ color: "#ff9900" }} />
                      <span className="text-sm font-bold" style={{ color: "#ff9900" }}>AWS</span>
                    </div>
                    {expandedProvider === "aws" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedProvider === "aws" && (
                    <div className="ml-2 mt-1 space-y-1">
                      {[
                        { id: "aws-compute", label: "Compute", icon: "Server" },
                        { id: "aws-storage", label: "Storage", icon: "HardDrive" },
                        { id: "aws-database", label: "Database", icon: "Database" },
                        { id: "aws-networking", label: "Networking", icon: "Globe" },
                        { id: "aws-integration", label: "Integration", icon: "Bell" },
                      ].map((cat) => {
                        const CatIcon = iconMap[cat.icon] || Server;
                        const catNodes = nodesByCategory[cat.id] || [];
                        return (
                          <div key={cat.id}>
                            <button
                              onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/30 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <CatIcon className="w-3.5 h-3.5" style={{ color: "#ff9900" }} />
                                <span>{cat.label}</span>
                                <span className="text-xs text-muted-foreground">({catNodes.length})</span>
                              </div>
                              {expandedCategory === cat.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {expandedCategory === cat.id && (
                              <div className="ml-4 mt-1 space-y-1">
                                {catNodes.map((nodeDef) => {
                                  const NodeIcon = iconMap[nodeDef.icon] || Server;
                                  return (
                                    <div key={nodeDef.id} draggable onDragStart={(e) => onDragStart(e, nodeDef)} onClick={() => addNodeFromSidebar(nodeDef)} className="flex items-center gap-2 px-2 py-1.5 rounded bg-accent/20 hover:bg-accent/40 cursor-pointer text-xs group">
                                      <NodeIcon className="w-3.5 h-3.5" style={{ color: "#ff9900" }} />
                                      <span className="truncate">{nodeDef.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* GCP */}
                <div className="mb-2">
                  <button
                    onClick={() => setExpandedProvider(expandedProvider === "gcp" ? null : "gcp")}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4" style={{ color: "#4285f4" }} />
                      <span className="text-sm font-bold">
                        <span style={{ color: "#4285f4" }}>G</span>
                        <span style={{ color: "#ea4335" }}>o</span>
                        <span style={{ color: "#fbbc05" }}>o</span>
                        <span style={{ color: "#4285f4" }}>g</span>
                        <span style={{ color: "#34a853" }}>l</span>
                        <span style={{ color: "#ea4335" }}>e</span>
                        <span style={{ color: "#5f6368" }}> Cloud</span>
                      </span>
                    </div>
                    {expandedProvider === "gcp" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedProvider === "gcp" && (
                    <div className="ml-2 mt-1 space-y-1">
                      {[
                        { id: "gcp-compute", label: "Compute", icon: "Server" },
                        { id: "gcp-storage", label: "Storage", icon: "HardDrive" },
                        { id: "gcp-database", label: "Database", icon: "Database" },
                        { id: "gcp-integration", label: "Integration", icon: "Bell" },
                      ].map((cat) => {
                        const CatIcon = iconMap[cat.icon] || Server;
                        const catNodes = nodesByCategory[cat.id] || [];
                        return (
                          <div key={cat.id}>
                            <button
                              onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/30 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <CatIcon className="w-3.5 h-3.5" style={{ color: "#4285f4" }} />
                                <span>{cat.label}</span>
                                <span className="text-xs text-muted-foreground">({catNodes.length})</span>
                              </div>
                              {expandedCategory === cat.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {expandedCategory === cat.id && (
                              <div className="ml-4 mt-1 space-y-1">
                                {catNodes.map((nodeDef) => {
                                  const NodeIcon = iconMap[nodeDef.icon] || Server;
                                  return (
                                    <div key={nodeDef.id} draggable onDragStart={(e) => onDragStart(e, nodeDef)} onClick={() => addNodeFromSidebar(nodeDef)} className="flex items-center gap-2 px-2 py-1.5 rounded bg-accent/20 hover:bg-accent/40 cursor-pointer text-xs group">
                                      <NodeIcon className="w-3.5 h-3.5" style={{ color: "#4285f4" }} />
                                      <span className="truncate">{nodeDef.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Azure */}
                <div className="mb-2">
                  <button
                    onClick={() => setExpandedProvider(expandedProvider === "azure" ? null : "azure")}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4" style={{ color: "#0078d4" }} />
                      <span className="text-sm font-bold" style={{ color: "#0078d4" }}>Azure</span>
                    </div>
                    {expandedProvider === "azure" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedProvider === "azure" && (
                    <div className="ml-2 mt-1 space-y-1">
                      {[
                        { id: "azure-compute", label: "Compute", icon: "Server" },
                        { id: "azure-storage", label: "Storage", icon: "HardDrive" },
                        { id: "azure-database", label: "Database", icon: "Database" },
                        { id: "azure-integration", label: "Integration", icon: "Bell" },
                      ].map((cat) => {
                        const CatIcon = iconMap[cat.icon] || Server;
                        const catNodes = nodesByCategory[cat.id] || [];
                        return (
                          <div key={cat.id}>
                            <button
                              onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/30 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <CatIcon className="w-3.5 h-3.5" style={{ color: "#0078d4" }} />
                                <span>{cat.label}</span>
                                <span className="text-xs text-muted-foreground">({catNodes.length})</span>
                              </div>
                              {expandedCategory === cat.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {expandedCategory === cat.id && (
                              <div className="ml-4 mt-1 space-y-1">
                                {catNodes.map((nodeDef) => {
                                  const NodeIcon = iconMap[nodeDef.icon] || Server;
                                  return (
                                    <div key={nodeDef.id} draggable onDragStart={(e) => onDragStart(e, nodeDef)} onClick={() => addNodeFromSidebar(nodeDef)} className="flex items-center gap-2 px-2 py-1.5 rounded bg-accent/20 hover:bg-accent/40 cursor-pointer text-xs group">
                                      <NodeIcon className="w-3.5 h-3.5" style={{ color: "#0078d4" }} />
                                      <span className="truncate">{nodeDef.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Oracle */}
                <div className="mb-2">
                  <button
                    onClick={() => setExpandedProvider(expandedProvider === "oracle" ? null : "oracle")}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4" style={{ color: "#c74634" }} />
                      <span className="text-sm font-bold" style={{ color: "#c74634" }}>Oracle Cloud</span>
                    </div>
                    {expandedProvider === "oracle" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedProvider === "oracle" && (
                    <div className="ml-2 mt-1 space-y-1">
                      {[
                        { id: "oracle-compute", label: "Compute", icon: "Server" },
                        { id: "oracle-storage", label: "Storage", icon: "HardDrive" },
                        { id: "oracle-networking", label: "Networking", icon: "Globe" },
                        { id: "oracle-database", label: "Database", icon: "Database" },
                        { id: "oracle-analytics", label: "Analytics", icon: "BarChart" },
                        { id: "oracle-ml", label: "AI/ML", icon: "Brain" },
                        { id: "oracle-integration", label: "Integration", icon: "Bell" },
                        { id: "oracle-security", label: "Security", icon: "Shield" },
                        { id: "oracle-management", label: "Management", icon: "Settings" },
                      ].map((cat) => {
                        const CatIcon = iconMap[cat.icon] || Server;
                        const catNodes = nodesByCategory[cat.id] || [];
                        return (
                          <div key={cat.id}>
                            <button
                              onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/30 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <CatIcon className="w-3.5 h-3.5" style={{ color: "#c74634" }} />
                                <span>{cat.label}</span>
                                <span className="text-xs text-muted-foreground">({catNodes.length})</span>
                              </div>
                              {expandedCategory === cat.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {expandedCategory === cat.id && (
                              <div className="ml-4 mt-1 space-y-1">
                                {catNodes.map((nodeDef) => {
                                  const NodeIcon = iconMap[nodeDef.icon] || Server;
                                  return (
                                    <div key={nodeDef.id} draggable onDragStart={(e) => onDragStart(e, nodeDef)} onClick={() => addNodeFromSidebar(nodeDef)} className="flex items-center gap-2 px-2 py-1.5 rounded bg-accent/20 hover:bg-accent/40 cursor-pointer text-xs group">
                                      <NodeIcon className="w-3.5 h-3.5" style={{ color: "#c74634" }} />
                                      <span className="truncate">{nodeDef.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* AI / LLM */}
                <p className="text-xs font-medium text-muted-foreground mb-2 mt-4 px-2">AI / LLM</p>
                <div className="mb-2">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === "ai" ? null : "ai")}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium">AI / LLM</span>
                      <span className="text-xs text-muted-foreground">({nodesByCategory["ai"]?.length || 0})</span>
                    </div>
                    {expandedCategory === "ai" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedCategory === "ai" && (
                    <div className="ml-4 mt-1 space-y-1">
                      {(nodesByCategory["ai"] || []).map((nodeDef) => {
                        const NodeIcon = iconMap[nodeDef.icon] || Brain;
                        return (
                          <div 
                            key={nodeDef.id} 
                            draggable 
                            onDragStart={(e) => onDragStart(e, nodeDef)} 
                            onClick={() => addNodeFromSidebar(nodeDef)}
                            className="flex items-center gap-2 px-3 py-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 cursor-pointer group"
                          >
                            <NodeIcon className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm truncate flex-1">{nodeDef.label}</span>
                            <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Outputs */}
                <p className="text-xs font-medium text-muted-foreground mb-2 mt-4 px-2">OUTPUTS</p>
                <div className="mb-2">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === "output" ? null : "output")}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Outputs</span>
                      <span className="text-xs text-muted-foreground">({nodesByCategory["output"]?.length || 0})</span>
                    </div>
                    {expandedCategory === "output" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedCategory === "output" && (
                    <div className="ml-4 mt-1 space-y-1">
                      {(nodesByCategory["output"] || []).map((nodeDef) => {
                        const NodeIcon = iconMap[nodeDef.icon] || Send;
                        return (
                          <div 
                            key={nodeDef.id} 
                            draggable 
                            onDragStart={(e) => onDragStart(e, nodeDef)} 
                            onClick={() => addNodeFromSidebar(nodeDef)}
                            className="flex items-center gap-2 px-3 py-2 rounded bg-purple-500/20 hover:bg-purple-500/30 cursor-pointer group"
                          >
                            <NodeIcon className="w-4 h-4 text-purple-500" />
                            <span className="text-sm truncate flex-1">{nodeDef.label}</span>
                            <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Local Files, Logic & Generic */}
                <p className="text-xs font-medium text-muted-foreground mb-2 mt-4 px-2">UTILITIES</p>
                {[
                  { id: "local", label: "Local Files", icon: "FileText", color: "#8b5cf6" },
                  { id: "logic", label: "Logic", icon: "GitBranch", color: "#eab308" },
                  { id: "generic", label: "Generic", icon: "Globe", color: "#64748b" },
                ].map((cat) => {
                  const CatIcon = iconMap[cat.icon] || Server;
                  const catNodes = nodesByCategory[cat.id] || [];
                  return (
                    <div key={cat.id} className="mb-1">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                          <span className="text-sm font-medium">{cat.label}</span>
                          <span className="text-xs text-muted-foreground">({catNodes.length})</span>
                        </div>
                        {expandedCategory === cat.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {expandedCategory === cat.id && (
                        <div className="ml-4 mt-1 space-y-1">
                          {catNodes.map((nodeDef) => {
                            const NodeIcon = iconMap[nodeDef.icon] || Server;
                            return (
                              <div 
                                key={nodeDef.id} 
                                draggable 
                                onDragStart={(e) => onDragStart(e, nodeDef)} 
                                onClick={() => addNodeFromSidebar(nodeDef)}
                                className="flex items-center gap-2 px-3 py-2 rounded bg-accent/30 hover:bg-accent/50 cursor-pointer group"
                              >
                                <NodeIcon className="w-4 h-4" style={{ color: nodeDef.color }} />
                                <span className="text-sm truncate flex-1">{nodeDef.label}</span>
                                <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* My Workflows Section - At bottom */}
                <div className="border-t border-border/50 my-4" />
                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <p className="text-xs font-medium text-muted-foreground">MY WORKFLOWS</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={createNewFlow}
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-500" />
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {isLoadingList ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                      </div>
                    ) : flowList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No saved flows</p>
                    ) : (
                      flowList.map((flow) => (
                        <div
                          key={flow.id}
                          onClick={() => loadFlow(flow.id)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm group",
                            flowId === flow.id 
                              ? "bg-amber-500/20 border border-amber-500/50" 
                              : "hover:bg-accent/50"
                          )}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            flow.status === "active" ? "bg-green-500" :
                            flow.status === "paused" ? "bg-yellow-500" : "bg-gray-500"
                          )} />
                          <span className="truncate flex-1">{flow.name}</span>
                          <span className="text-[10px] text-muted-foreground" title="Run count">{flow.runCount} runs</span>
                          <button
                            onClick={(e) => deleteFlow(flow.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                            title="Delete flow"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
                  onNodeContextMenu={onNodeContextMenu}
                  onEdgeContextMenu={onEdgeContextMenu}
                  onPaneContextMenu={onPaneContextMenu}
                  nodeTypes={nodeTypes}
                  fitView
                  className="bg-background"
                  proOptions={{ hideAttribution: true }}
                >
                  <Controls />
                  <MiniMap
                    nodeColor={(node) => node.data?.color || "#666"}
                    maskColor="rgba(0, 0, 0, 0.8)"
                  />
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
                </ReactFlow>
              </div>

              {/* Empty state */}
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <GitBranch className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      Click or drag nodes from the left panel
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Start with a trigger, then add actions. Nodes auto-align in a row.
                    </p>
                  </div>
                </div>
              )}

              {/* Right-click Context Menu */}
              {contextMenu && (
                <div 
                  className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px] max-h-[400px] overflow-y-auto"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                  {contextMenu.type === 'node' ? (
                    <>
                      <button
                        onClick={() => {
                          const node = nodes.find(n => n.id === contextMenu.id);
                          if (node) setSelectedNode(node);
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 text-left"
                      >
                        <Settings className="w-4 h-4" />
                        Configure Node
                      </button>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={() => deleteNode(contextMenu.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/20 text-red-500 text-left"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Node
                      </button>
                    </>
                  ) : contextMenu.type === 'edge' ? (
                    <button
                      onClick={() => deleteEdge(contextMenu.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/20 text-red-500 text-left"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Connection
                    </button>
                  ) : (
                    <>
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                        ADD NODE
                      </div>
                      {/* Triggers - collapsible */}
                      <button
                        onClick={() => setContextMenuExpanded(contextMenuExpanded === "trigger" ? null : "trigger")}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-green-500 bg-green-500/10 hover:bg-green-500/20"
                      >
                        <span>Triggers ({(nodesByCategory["trigger"] || []).length})</span>
                        {contextMenuExpanded === "trigger" ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      {contextMenuExpanded === "trigger" && (nodesByCategory["trigger"] || []).map((nodeDef) => {
                        const NodeIcon = iconMap[nodeDef.icon] || Server;
                        return (
                          <button
                            key={nodeDef.id}
                            onClick={() => {
                              addNodeFromSidebar(nodeDef);
                              setContextMenu(null);
                              setContextMenuExpanded(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-accent/50 text-left"
                          >
                            <NodeIcon className="w-3.5 h-3.5" style={{ color: nodeDef.color }} />
                            <span className="truncate">{nodeDef.label}</span>
                          </button>
                        );
                      })}
                      {/* All categories - collapsible */}
                      {nodeCategories.filter(cat => cat.id !== "trigger").map((cat) => {
                        const catNodes = nodesByCategory[cat.id] || [];
                        if (catNodes.length === 0) return null;
                        return (
                          <div key={cat.id}>
                            <button
                              onClick={() => setContextMenuExpanded(contextMenuExpanded === cat.id ? null : cat.id)}
                              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium hover:opacity-80"
                              style={{ color: cat.color, backgroundColor: `${cat.color}15` }}
                            >
                              <span>{cat.label} ({catNodes.length})</span>
                              {contextMenuExpanded === cat.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {contextMenuExpanded === cat.id && catNodes.map((nodeDef) => {
                              const NodeIcon = iconMap[nodeDef.icon] || Server;
                              return (
                                <button
                                  key={nodeDef.id}
                                  onClick={() => {
                                    addNodeFromSidebar(nodeDef);
                                    setContextMenu(null);
                                    setContextMenuExpanded(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-accent/50 text-left"
                                >
                                  <NodeIcon className="w-3.5 h-3.5" style={{ color: nodeDef.color }} />
                                  <span className="truncate">{nodeDef.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* Node Picker Modal - triggered from plus button on nodes */}
              {nodePickerForNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNodePickerForNode(null)}>
                  <div 
                    className="bg-card border border-border rounded-lg shadow-xl w-80 max-h-[500px] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <span className="text-sm font-medium">Add Connected Node</span>
                      <button onClick={() => setNodePickerForNode(null)} className="p-1 hover:bg-accent rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-[400px]">
                      {/* All categories - collapsible */}
                      {nodeCategories.filter(cat => cat.id !== "trigger").map((cat) => {
                        const catNodes = nodesByCategory[cat.id] || [];
                        if (catNodes.length === 0) return null;
                        return (
                          <div key={cat.id}>
                            <button
                              onClick={() => setContextMenuExpanded(contextMenuExpanded === cat.id ? null : cat.id)}
                              className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium hover:bg-accent/30"
                              style={{ color: cat.color }}
                            >
                              <span>{cat.label} ({catNodes.length})</span>
                              {contextMenuExpanded === cat.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            {contextMenuExpanded === cat.id && (
                              <div className="bg-accent/10">
                                {catNodes.map((nodeDef) => {
                                  const NodeIcon = iconMap[nodeDef.icon] || Server;
                                  return (
                                    <button
                                      key={nodeDef.id}
                                      onClick={() => {
                                        addNodeAndConnect(nodeDef);
                                        setNodePickerForNode(null);
                                        setContextMenuExpanded(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-6 py-2 text-sm hover:bg-accent/50 text-left"
                                    >
                                      <NodeIcon className="w-4 h-4" style={{ color: nodeDef.color }} />
                                      <span className="truncate">{nodeDef.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Properties Panel */}
            {selectedNode && (
              <div className="w-80 border-l border-border/50 bg-card/30 overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-muted-foreground">NODE PROPERTIES</p>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {(() => {
                    const definition = getNodeDefinition(selectedNode.data.definitionId);
                    if (!definition) return null;

                    return (
                      <div className="space-y-4">
                        {/* Node info */}
                        <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                          {(() => {
                            const Icon = iconMap[definition.icon] || Server;
                            return (
                              <div
                                className="p-2 rounded"
                                style={{ backgroundColor: `${definition.color}20` }}
                              >
                                <Icon
                                  className="w-5 h-5"
                                  style={{ color: definition.color }}
                                />
                              </div>
                            );
                          })()}
                          <div>
                            <p className="font-medium">{definition.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {definition.description}
                            </p>
                          </div>
                        </div>

                        {/* Config fields */}
                        {definition.config.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              CONFIGURATION
                            </p>
                            {definition.config.map((field) => (
                              <div key={field.id}>
                                <label className="text-sm font-medium mb-1 block">
                                  {field.label}
                                  {field.required && (
                                    <span className="text-red-500 ml-1">*</span>
                                  )}
                                </label>
                                {field.type === "select" ? (
                                  <select
                                    className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm"
                                    value={selectedNode.data.config?.[field.id] ?? field.default ?? ""}
                                    onChange={(e) => updateNodeConfig(selectedNode.id, field.id, e.target.value)}
                                  >
                                    {field.options?.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : field.type === "textarea" ? (
                                  <textarea
                                    className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm min-h-[80px] font-mono"
                                    placeholder={field.placeholder}
                                    value={selectedNode.data.config?.[field.id] ?? ""}
                                    onChange={(e) => updateNodeConfig(selectedNode.id, field.id, e.target.value)}
                                  />
                                ) : (
                                  <Input
                                    type={field.type === "number" ? "number" : "text"}
                                    placeholder={field.placeholder}
                                    className="bg-accent border-border"
                                    value={selectedNode.data.config?.[field.id] ?? ""}
                                    onChange={(e) => updateNodeConfig(selectedNode.id, field.id, field.type === "number" ? Number(e.target.value) : e.target.value)}
                                  />
                                )}
                                {field.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {field.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* IAM permissions */}
                        {definition.iamRequired && definition.iamRequired.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              REQUIRED IAM PERMISSIONS
                            </p>
                            <div className="space-y-1">
                              {definition.iamRequired.map((perm) => (
                                <code
                                  key={perm}
                                  className="block text-xs bg-accent/50 px-2 py-1 rounded text-amber-500"
                                >
                                  {perm}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Last Execution Output */}
                        {executionResults[selectedNode.id] && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              LAST EXECUTION OUTPUT
                            </p>
                            <div className={cn(
                              "p-3 rounded-lg text-xs font-mono overflow-auto max-h-48",
                              executionResults[selectedNode.id].status === "success" 
                                ? "bg-green-500/10 border border-green-500/30" 
                                : "bg-red-500/10 border border-red-500/30"
                            )}>
                              {executionResults[selectedNode.id].status === "success" ? (
                                <pre className="text-green-400 whitespace-pre-wrap">
                                  {JSON.stringify(executionResults[selectedNode.id].outputs, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-red-400">
                                  Error: {executionResults[selectedNode.id].error || "Unknown error"}
                                </p>
                              )}
                              <p className="text-muted-foreground mt-2 text-[10px]">
                                Duration: {executionResults[selectedNode.id].duration}ms
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Terminal Node Toggle - only for output nodes */}
                        {selectedNode.data.type === "output" && (
                          <div className="flex items-center justify-between py-2 border-t border-border/50">
                            <div>
                              <p className="text-sm font-medium">Terminal Node</p>
                              <p className="text-xs text-muted-foreground">End of workflow (no output)</p>
                            </div>
                            <button
                              onClick={() => {
                                const newIsTerminal = !selectedNode.data.isTerminal;
                                setNodes((nds: Node[]) => nds.map((n) => 
                                  n.id === selectedNode.id 
                                    ? { ...n, data: { ...n.data, isTerminal: newIsTerminal } }
                                    : n
                                ));
                                setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, isTerminal: newIsTerminal } });
                                setIsDirty(true);
                              }}
                              className={cn(
                                "w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0",
                                selectedNode.data.isTerminal ? "bg-purple-500" : "bg-zinc-700"
                              )}
                            >
                              <span 
                                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200"
                                style={{ left: selectedNode.data.isTerminal ? '24px' : '4px' }}
                              />
                            </button>
                          </div>
                        )}

                        {/* Add Next Node button - hide if terminal */}
                        {!(selectedNode.data.type === "output" && selectedNode.data.isTerminal) && (
                        <div className="relative">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                            onClick={() => setShowAddNodeMenu(!showAddNodeMenu)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Next Node
                          </Button>
                          
                          {/* Node picker dropdown */}
                          {showAddNodeMenu && (
                            <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-card border border-border rounded-lg shadow-xl z-50">
                              <div className="p-2 border-b border-border">
                                <span className="text-xs font-medium text-muted-foreground">SELECT NODE TO ADD</span>
                              </div>
                              <div className="p-1">
                                {nodeRegistry.filter(n => n.type !== "trigger").map((nodeDef) => {
                                  const NodeIcon = iconMap[nodeDef.icon] || Server;
                                  return (
                                    <button
                                      key={nodeDef.id}
                                      onClick={() => addNodeAndConnect(nodeDef)}
                                      className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-accent/50 text-left text-sm"
                                    >
                                      <NodeIcon className="w-4 h-4" style={{ color: nodeDef.color }} />
                                      <span className="truncate">{nodeDef.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        )}

                        {/* Delete button */}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={deleteSelectedNode}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Node
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

        {/* Workflow Agent Chat Modal */}
        {showAgentChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-2xl mx-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-10 right-0 text-white hover:bg-white/10"
                onClick={() => setShowAgentChat(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              <WorkflowAgentChat
                onWorkflowGenerated={(flowId: string) => {
                  // Load the generated flow from database
                  setShowAgentChat(false);
                  loadFlow(flowId);
                  toast({ title: "Workflow Generated", description: "AI-generated workflow loaded" });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
