export type EdgeStrength = 'strong' | 'medium' | 'weak';

export interface NormalizedMarket {
  marketId: number;
  title: string;
  categories: string[];
  scope: string;
  subjectNoun: string;
  resolvesAt: string | null;
}

export interface GraphNode {
  id: string;
  marketId: number;
  title: string;
  categories: string[];
  scope: string;
  subjectNoun: string;
  resolvesAt: string | null;
  /** Macro-cluster index (0–3) used for coloring */
  group: number;
  /** Same as group — kept as semantic alias */
  cluster: number;
  /** Number of edges connecting to this node */
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  strength: EdgeStrength;
  /** Normalised 0–1 score driving visual weight */
  weight: number;
  /** One-line reason shown on the graph edge label */
  reason: string;
  /** Longer editorial explanation shown in the rail connection detail view */
  detail: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
