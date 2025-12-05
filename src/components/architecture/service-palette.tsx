"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  AWS_SERVICES,
  AWS_CATEGORIES,
  AWSService,
  AWSCategory,
  searchServices,
  getServicesByCategory,
} from "@/lib/architecture/aws-icons";
import Image from "next/image";

interface ServicePaletteProps {
  onDragStart: (service: AWSService) => void;
}

/**
 * AWS Service Palette
 * 
 * Displays all available AWS services organized by category.
 * Services can be dragged onto the canvas.
 */
export function ServicePalette({ onDragStart }: ServicePaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<AWSCategory | null>("compute");

  const filteredServices = searchQuery
    ? searchServices(searchQuery)
    : null;

  const handleDragStart = (e: React.DragEvent, service: AWSService) => {
    e.dataTransfer.setData(
      "application/aws-service",
      JSON.stringify(service)
    );
    e.dataTransfer.effectAllowed = "move";
    onDragStart(service);
  };

  return (
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
        {filteredServices ? (
          // Search results
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">
              {filteredServices.length} results
            </p>
            {filteredServices.map((service) => (
              <ServiceItem
                key={service.id}
                service={service}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        ) : (
          // Category view
          <div className="space-y-1">
            {AWS_CATEGORIES.map((category) => {
              const services = getServicesByCategory(category.id);
              const isExpanded = expandedCategory === category.id;

              return (
                <div key={category.id}>
                  <button
                    onClick={() =>
                      setExpandedCategory(isExpanded ? null : category.id)
                    }
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({services.length})
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
                      {services.map((service) => (
                        <ServiceItem
                          key={service.id}
                          service={service}
                          onDragStart={handleDragStart}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground text-center">
          {AWS_SERVICES.length} AWS services available
        </p>
      </div>
    </div>
  );
}

/**
 * Individual service item in the palette
 */
function ServiceItem({
  service,
  onDragStart,
}: {
  service: AWSService;
  onDragStart: (e: React.DragEvent, service: AWSService) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, service)}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent/30 hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors group"
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
        <p className="text-[10px] text-muted-foreground truncate">
          {service.description}
        </p>
      </div>
    </div>
  );
}
