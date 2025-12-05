"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Bell, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  resourceType?: string;
  operator: string;
  threshold: number;
  duration: number;
  channels: string;
  enabled: boolean;
  _count?: { incidents: number };
}

interface AlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const METRICS = [
  { value: "CPU", label: "CPU Usage (%)" },
  { value: "MEMORY", label: "Memory Usage (%)" },
  { value: "STORAGE", label: "Storage Usage (%)" },
  { value: "NETWORK_IN", label: "Network In (MB/s)" },
  { value: "NETWORK_OUT", label: "Network Out (MB/s)" },
  { value: "ERROR_RATE", label: "Error Rate (%)" },
  { value: "LATENCY", label: "Latency (ms)" },
  { value: "COST", label: "Daily Cost ($)" },
];

const OPERATORS = [
  { value: "GT", label: ">" },
  { value: "GTE", label: ">=" },
  { value: "LT", label: "<" },
  { value: "LTE", label: "<=" },
  { value: "EQ", label: "=" },
];

const RESOURCE_TYPES = [
  { value: "", label: "All Resources" },
  { value: "EC2", label: "EC2 Instances" },
  { value: "RDS", label: "RDS Databases" },
  { value: "LAMBDA", label: "Lambda Functions" },
  { value: "S3", label: "S3 Buckets" },
  { value: "ELB", label: "Load Balancers" },
];

export function AlertConfigModal({ isOpen, onClose }: AlertConfigModalProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("CPU");
  const [resourceType, setResourceType] = useState("");
  const [operator, setOperator] = useState("GT");
  const [threshold, setThreshold] = useState("80");
  const [duration, setDuration] = useState("300");
  const [emailNotify, setEmailNotify] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts/rules");
      const data = await res.json();
      if (res.ok) {
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setMetric("CPU");
    setResourceType("");
    setOperator("GT");
    setThreshold("80");
    setDuration("300");
    setEmailNotify(true);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          metric,
          resourceType: resourceType || null,
          operator,
          threshold: parseFloat(threshold),
          duration: parseInt(duration),
          channels: emailNotify ? ["email"] : [],
          channelConfig: {},
        }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Alert rule created" });
        resetForm();
        fetchRules();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create rule", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: AlertRule) => {
    try {
      const res = await fetch(`/api/alerts/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });

      if (res.ok) {
        setRules(rules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update rule", variant: "destructive" });
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Delete this alert rule?")) return;

    try {
      const res = await fetch(`/api/alerts/rules/${ruleId}`, { method: "DELETE" });
      if (res.ok) {
        setRules(rules.filter(r => r.id !== ruleId));
        toast({ title: "Deleted", description: "Alert rule removed" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete rule", variant: "destructive" });
    }
  };

  const getOperatorLabel = (op: string) => OPERATORS.find(o => o.value === op)?.label || op;
  const getMetricLabel = (m: string) => METRICS.find(x => x.value === m)?.label || m;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-400" />
            Alert Configuration
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Existing Rules */}
            {rules.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Active Rules</h3>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${rule.enabled ? "bg-green-500" : "bg-gray-500"}`} />
                      <div>
                        <p className="font-medium text-sm">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getMetricLabel(rule.metric)} {getOperatorLabel(rule.operator)} {rule.threshold}
                          {rule._count?.incidents ? ` • ${rule._count.incidents} incidents` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(rule)}
                      >
                        {rule.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create New Rule */}
            {!showForm ? (
              <Button
                onClick={() => setShowForm(true)}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Alert Rule
              </Button>
            ) : (
              <div className="space-y-4 p-4 bg-accent/20 rounded-lg border border-border">
                <h3 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  New Alert Rule
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="High CPU Alert"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Alert when CPU exceeds threshold"
                    />
                  </div>

                  <div>
                    <Label>Metric</Label>
                    <select
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-md"
                    >
                      {METRICS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Resource Type</Label>
                    <select
                      value={resourceType}
                      onChange={(e) => setResourceType(e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-md"
                    >
                      {RESOURCE_TYPES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Condition</Label>
                    <div className="flex gap-2">
                      <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="w-20 h-10 px-3 bg-background border border-border rounded-md"
                      >
                        {OPERATORS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        placeholder="80"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="300"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Condition must persist for this duration
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={emailNotify}
                        onChange={(e) => setEmailNotify(e.target.checked)}
                        className="rounded"
                      />
                      Send email notification
                    </Label>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={saving}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Rule"}
                  </Button>
                </div>
              </div>
            )}

            {rules.length === 0 && !showForm && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No alert rules configured. Create one to start monitoring.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
