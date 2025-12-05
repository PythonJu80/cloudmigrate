"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CloudProvider = "aws" | "gcp" | "azure" | "oracle";

interface ProviderInfo {
  id: CloudProvider;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  storage: string;
}

export const providers: ProviderInfo[] = [
  { 
    id: "aws", 
    name: "Amazon Web Services", 
    shortName: "AWS",
    color: "#ff9900", 
    bgColor: "rgba(255, 153, 0, 0.15)",
    storage: "S3",
  },
  { 
    id: "gcp", 
    name: "Google Cloud Platform", 
    shortName: "GCP",
    color: "#4285f4", 
    bgColor: "rgba(66, 133, 244, 0.15)",
    storage: "Cloud Storage",
  },
  { 
    id: "azure", 
    name: "Microsoft Azure", 
    shortName: "Azure",
    color: "#0078d4", 
    bgColor: "rgba(0, 120, 212, 0.15)",
    storage: "Blob Storage",
  },
  { 
    id: "oracle", 
    name: "Oracle Cloud", 
    shortName: "Oracle",
    color: "#c74634", 
    bgColor: "rgba(199, 70, 52, 0.15)",
    storage: "Object Storage",
  },
];

interface ProviderPickerProps {
  value: CloudProvider;
  onChange: (provider: CloudProvider) => void;
  className?: string;
  showStorageName?: boolean;
}

export function ProviderPicker({ value, onChange, className, showStorageName = false }: ProviderPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = providers.find(p => p.id === value) || providers[0];

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
      >
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: selected.color }}
        />
        <span className="text-sm font-medium text-foreground">
          {selected.shortName}
          {showStorageName && <span className="text-muted-foreground ml-1">({selected.storage})</span>}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  onChange(provider.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors",
                  value === provider.id && "bg-accent"
                )}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: provider.color }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{provider.shortName}</div>
                  <div className="text-xs text-muted-foreground">{provider.storage}</div>
                </div>
                {value === provider.id && (
                  <Check className="w-4 h-4 text-terminal-green" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Compact version for headers
export function ProviderBadge({ provider }: { provider: CloudProvider }) {
  const info = providers.find(p => p.id === provider) || providers[0];
  
  return (
    <div 
      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: info.bgColor, color: info.color }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
      {info.shortName}
    </div>
  );
}
