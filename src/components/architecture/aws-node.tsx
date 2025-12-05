"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AWSNodeData {
  serviceId: string;
  label: string;
  sublabel?: string;
  icon: string;
  color: string;
}

/**
 * AWS Service Node
 * 
 * Renders an AWS service with its official icon.
 * Used in the architecture diagram canvas.
 */
export const AWSServiceNode = memo(function AWSServiceNode({
  data,
  selected,
}: NodeProps & { data: AWSNodeData }) {
  const { label, sublabel, icon, color } = data;

  return (
    <div
      className={cn(
        "bg-white rounded-lg border-2 shadow-sm transition-all flex flex-col items-center p-3 min-w-[100px] group",
        selected ? "border-cyan-500 ring-2 ring-cyan-500/30" : "border-gray-200"
      )}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-600 transition-opacity",
          selected ? "!opacity-100" : "!opacity-0"
        )}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={cn(
          "!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-600 transition-opacity",
          selected ? "!opacity-100" : "!opacity-0"
        )}
      />

      {/* AWS Icon */}
      <div
        className="w-12 h-12 rounded flex items-center justify-center mb-2"
        style={{ backgroundColor: `${color}10` }}
      >
        <Image
          src={icon}
          alt={label}
          width={40}
          height={40}
          className="object-contain"
        />
      </div>

      {/* Labels */}
      <p className="text-xs font-medium text-gray-800 text-center leading-tight">
        {label}
      </p>
      {sublabel && (
        <p className="text-[10px] text-gray-500 text-center">{sublabel}</p>
      )}

      {/* Output handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-600 transition-opacity",
          selected ? "!opacity-100" : "!opacity-0"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={cn(
          "!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-600 transition-opacity",
          selected ? "!opacity-100" : "!opacity-0"
        )}
      />
    </div>
  );
});

/**
 * AWS Container Node (VPC, Subnet, AZ)
 */
interface ContainerNodeData {
  label: string;
  sublabel?: string;
  containerType: "vpc" | "az" | "subnet-public" | "subnet-private" | "region";
  width?: number;
  height?: number;
}

const containerStyles = {
  vpc: {
    borderColor: "#8C4FFF",
    bgColor: "rgba(140, 79, 255, 0.05)",
    icon: "/aws-icons/group-vpc.svg",
  },
  az: {
    borderColor: "#ED7100",
    bgColor: "rgba(237, 113, 0, 0.03)",
    icon: "/aws-icons/group-region.svg",
  },
  "subnet-public": {
    borderColor: "#7AA116",
    bgColor: "#E8F5E8",
    icon: "/aws-icons/group-public-subnet.svg",
  },
  "subnet-private": {
    borderColor: "#527FFF",
    bgColor: "#E8F0FA",
    icon: "/aws-icons/group-private-subnet.svg",
  },
  region: {
    borderColor: "#147EBA",
    bgColor: "rgba(20, 126, 186, 0.03)",
    icon: "/aws-icons/group-region.svg",
  },
};

export const AWSContainerNode = memo(function AWSContainerNode({
  data,
  selected,
}: NodeProps & { data: ContainerNodeData }) {
  const { label, sublabel, containerType, width = 300, height = 200 } = data;
  const style = containerStyles[containerType] || containerStyles.vpc;

  return (
    <div
      className={cn(
        "rounded border-2 border-dashed relative",
        selected && "!border-cyan-500"
      )}
      style={{
        borderColor: selected ? undefined : style.borderColor,
        backgroundColor: style.bgColor,
        width,
        height,
      }}
    >
      {/* Label */}
      <div
        className="absolute -top-3 left-4 flex items-center gap-1 bg-white px-2 py-0.5 rounded"
        style={{ border: `1px solid ${style.borderColor}` }}
      >
        <Image src={style.icon} alt="" width={14} height={14} />
        <span
          className="text-xs font-medium"
          style={{ color: style.borderColor }}
        >
          {label}
        </span>
        {sublabel && (
          <span className="text-gray-500 text-[10px] ml-1">{sublabel}</span>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-600 transition-opacity",
          selected ? "!opacity-100" : "!opacity-0"
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-600 transition-opacity",
          selected ? "!opacity-100" : "!opacity-0"
        )}
      />
    </div>
  );
});

// Node types export for ReactFlow
export const awsNodeTypes = {
  awsService: AWSServiceNode,
  awsContainer: AWSContainerNode,
};
