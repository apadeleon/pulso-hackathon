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
  /** Human-readable reason for the connection */
  reason: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
