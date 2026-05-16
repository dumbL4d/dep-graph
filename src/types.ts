export interface ToolParameter {
  type?: string | string[];
  description?: string;
  title?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter | ToolParameter[];
  required?: string[];
  nullable?: boolean;
  format?: string;
  [key: string]: unknown;
}

export interface ToolParameters {
  type: "object";
  properties: Record<string, ToolParameter>;
  required?: string[];
  title?: string;
  description?: string;
}

export interface RawTool {
  slug: string;
  name: string;
  description?: string;
  inputParameters?: ToolParameters;
  outputParameters?: ToolParameters;
  toolkit?: {
    slug: string;
    name: string;
  };
  tags?: string[];
  isDeprecated?: boolean;
}

export interface DependencyEdge {
  from: string;
  to: string;
  paramMatch: string;
  confidence: number;
}

export interface GraphNode {
  id: string;
  label: string;
  toolkit: string;
  group: string;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: DependencyEdge[];
  toolMap: Map<string, RawTool>;
}

export interface MatchResult {
  toTool: string;
  fromTool: string;
  paramName: string;
  matchType: "exact" | "normalized" | "semantic";
  confidence: number;
}

export type ToolkitSlug = string;
