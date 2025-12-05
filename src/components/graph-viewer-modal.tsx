"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Network, ZoomIn, ZoomOut, Maximize2, RefreshCw, Pause, Play, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GraphViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export function GraphViewerModal({ isOpen, onClose, tenantId }: GraphViewerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ nodes: number; relationships: number } | null>(null);
  const [neovisInstance, setNeovisInstance] = useState<any>(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(["File", "Folder", "Transfer", "User"]);

  useEffect(() => {
    if (!isOpen) return;

    const loadGraph = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch graph stats first
        const statsRes = await fetch("/api/graph");
        const statsData = await statsRes.json();
        
        if (statsData.stats) {
          setStats(statsData.stats);
        }

        // Dynamically import neovis.js
        const NeoVis = (await import("neovis.js")).default;

        if (!containerRef.current) return;

        // Configure NeoVis with tenant isolation
        const config = {
          containerId: containerRef.current.id,
          neo4j: {
            serverUrl: `bolt://${window.location.hostname}:6086`,
            serverUser: "neo4j",
            serverPassword: "cloudmigrate2025",
            driverConfig: {
              encrypted: false,
            },
          },
          labels: {
            File: {
              label: "name",
              size: "size",
              color: "#10b981", // emerald
            },
            Folder: {
              label: "name",
              color: "#6366f1", // indigo
            },
            Transfer: {
              label: "fileName",
              size: "fileSize",
              color: "#f59e0b", // amber
            },
            User: {
              label: "name",
              color: "#ec4899", // pink
            },
          },
          relationships: {
            CONTAINS: {
              color: "#64748b",
            },
            TRANSFERRED: {
              color: "#10b981",
              thickness: "fileSize",
            },
            CREATED_BY: {
              color: "#ec4899",
            },
          },
          // CRITICAL: Tenant isolation - only show this tenant's data
          initialCypher: `
            MATCH (n)
            WHERE n.tenantId = '${tenantId}'
            OPTIONAL MATCH (n)-[r]-(m)
            WHERE m.tenantId = '${tenantId}'
            RETURN n, r, m
            LIMIT 200
          `,
          visConfig: {
            nodes: {
              shape: "dot",
              font: {
                size: 12,
                color: "#ffffff",
              },
              borderWidth: 2,
              shadow: true,
            },
            edges: {
              arrows: {
                to: { enabled: true, scaleFactor: 0.5 },
              },
              smooth: {
                type: "continuous",
              },
            },
            physics: {
              enabled: true,
              solver: "forceAtlas2Based",
              forceAtlas2Based: {
                gravitationalConstant: -50,
                centralGravity: 0.01,
                springLength: 100,
                springConstant: 0.08,
              },
              stabilization: {
                iterations: 100,
              },
            },
            interaction: {
              hover: true,
              tooltipDelay: 200,
              zoomView: true,
              dragView: true,
            },
          },
        };

        const viz = new NeoVis(config);
        
        viz.registerOnEvent("completed", () => {
          setLoading(false);
        });

        viz.registerOnEvent("error", (e: any) => {
          console.error("NeoVis error:", e);
          setError("Failed to load graph visualization");
          setLoading(false);
        });

        viz.render();
        setNeovisInstance(viz);

      } catch (err) {
        console.error("Graph load error:", err);
        setError("Failed to initialize graph viewer");
        setLoading(false);
      }
    };

    loadGraph();

    return () => {
      if (neovisInstance) {
        neovisInstance.clearNetwork();
      }
    };
  }, [isOpen, tenantId]);

  const handleRefresh = () => {
    if (neovisInstance) {
      setLoading(true);
      neovisInstance.reload();
    }
  };

  const handleZoomIn = () => {
    if (neovisInstance) {
      const network = neovisInstance.network;
      const scale = network.getScale();
      network.moveTo({ scale: scale * 1.3 });
    }
  };

  const handleZoomOut = () => {
    if (neovisInstance) {
      const network = neovisInstance.network;
      const scale = network.getScale();
      network.moveTo({ scale: scale / 1.3 });
    }
  };

  const handleFit = () => {
    if (neovisInstance) {
      neovisInstance.network.fit();
    }
  };

  const handleTogglePhysics = () => {
    if (neovisInstance) {
      const newState = !physicsEnabled;
      setPhysicsEnabled(newState);
      neovisInstance.network.setOptions({
        physics: { enabled: newState }
      });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!neovisInstance || !query.trim()) return;
    
    // Find and focus on matching nodes
    const network = neovisInstance.network;
    const nodes = neovisInstance.nodes;
    
    if (nodes) {
      const matchingIds: string[] = [];
      nodes.forEach((node: any) => {
        const label = node.label || node.name || "";
        if (label.toLowerCase().includes(query.toLowerCase())) {
          matchingIds.push(node.id);
        }
      });
      
      if (matchingIds.length > 0) {
        network.selectNodes(matchingIds);
        network.focus(matchingIds[0], { scale: 1.5, animation: true });
      }
    }
  };

  const toggleFilter = (label: string) => {
    setActiveFilters((prev: string[]) => 
      prev.includes(label) 
        ? prev.filter((f: string) => f !== label)
        : [...prev, label]
    );
  };

  const runQuery = (queryType: string) => {
    if (!neovisInstance) return;
    setLoading(true);
    
    let cypher = "";
    switch (queryType) {
      case "all":
        cypher = `
          MATCH (n) WHERE n.tenantId = '${tenantId}'
          OPTIONAL MATCH (n)-[r]-(m) WHERE m.tenantId = '${tenantId}'
          RETURN n, r, m LIMIT 200
        `;
        break;
      case "recent":
        cypher = `
          MATCH (n) WHERE n.tenantId = '${tenantId}'
          OPTIONAL MATCH (n)-[r]-(m) WHERE m.tenantId = '${tenantId}'
          RETURN n, r, m ORDER BY n.createdAt DESC LIMIT 50
        `;
        break;
      case "transfers":
        cypher = `
          MATCH (t:Transfer) WHERE t.tenantId = '${tenantId}'
          OPTIONAL MATCH (t)-[r]-(m) WHERE m.tenantId = '${tenantId}'
          RETURN t, r, m LIMIT 100
        `;
        break;
      case "largest":
        cypher = `
          MATCH (f:File) WHERE f.tenantId = '${tenantId}'
          OPTIONAL MATCH (f)-[r]-(m) WHERE m.tenantId = '${tenantId}'
          RETURN f, r, m ORDER BY f.size DESC LIMIT 50
        `;
        break;
    }
    
    neovisInstance.renderWithCypher(cypher);
  };

  const nodeTypes = [
    { label: "File", color: "bg-emerald-500" },
    { label: "Folder", color: "bg-indigo-500" },
    { label: "Transfer", color: "bg-amber-500" },
    { label: "User", color: "bg-pink-500" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-[90vw] h-[85vh] max-w-6xl bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Network className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Knowledge Graph</h2>
              <p className="text-xs text-zinc-400">
                {stats ? `${stats.nodes} nodes, ${stats.relationships} relationships` : "Visualize your data connections"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-48 pl-9 h-8 bg-zinc-800 border-zinc-700 text-sm"
              />
            </div>
            
            <div className="w-px h-6 bg-zinc-700 mx-1" />
            
            {/* Zoom Controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="text-zinc-400 hover:text-white h-8 w-8"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="text-zinc-400 hover:text-white h-8 w-8"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFit}
              className="text-zinc-400 hover:text-white h-8 w-8"
              title="Fit to View"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-zinc-700 mx-1" />
            
            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-zinc-400 hover:text-white h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/30 text-xs">
          {/* Graph Queries */}
          <span className="text-zinc-500 mr-1">View:</span>
          <button
            onClick={() => runQuery("all")}
            className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            All
          </button>
          <button
            onClick={() => runQuery("recent")}
            className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            Recent
          </button>
          <button
            onClick={() => runQuery("transfers")}
            className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            Transfers
          </button>
          <button
            onClick={() => runQuery("largest")}
            className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            Largest Files
          </button>

          <div className="w-px h-4 bg-zinc-700 mx-1" />

          {/* Layout Toggle */}
          <button
            onClick={handleTogglePhysics}
            className={`px-2 py-1 rounded ${physicsEnabled ? "text-zinc-300" : "text-zinc-500"} hover:bg-zinc-800/50`}
          >
            {physicsEnabled ? "Layout: Auto" : "Layout: Manual"}
          </button>

          <div className="w-px h-4 bg-zinc-700 mx-1" />

          {/* Filters */}
          {nodeTypes.map((type) => (
            <button
              key={type.label}
              onClick={() => toggleFilter(type.label)}
              className={`px-2 py-1 rounded ${
                activeFilters.includes(type.label) ? "text-zinc-300" : "text-zinc-600"
              } hover:bg-zinc-800/50`}
            >
              {type.label}s
            </button>
          ))}

          <div className="flex-1" />

          {/* Right side actions */}
          <button
            onClick={handleFit}
            className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            Fit
          </button>
          <button
            onClick={handleRefresh}
            className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            Reload
          </button>
        </div>

        {/* Graph Container */}
        <div className="flex-1 relative bg-zinc-950">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-sm text-zinc-400">Loading graph...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-400 mb-2">{error}</p>
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!stats?.nodes && !loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <Network className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">No Graph Data Yet</h3>
                <p className="text-sm text-zinc-500">
                  Your knowledge graph will appear here as you upload files and create transfers.
                  The graph shows relationships between your files, folders, and transfers.
                </p>
              </div>
            </div>
          )}
          
          <div 
            id="graph-container"
            ref={containerRef}
            className="w-full h-full"
          />
        </div>

      </div>
    </div>
  );
}
