// src/types.ts

export type DeviceStatus = "green" | "yellow" | "red";

export type NodeType = "device" | "group";

export interface TreeNode {
  uid: string;
  name: string;
  type: NodeType;
  ParentUID: string | null;
  slug?: string;
  deviceIp?: string;
  status?: DeviceStatus;
}

export interface TopologyNode {
  id: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    ip: string;
    status: DeviceStatus;
    slug: string;
    depth: number;
    type: NodeType;
  };
}

export interface TopologyEdge {
  source: string;
  target: string;
}
