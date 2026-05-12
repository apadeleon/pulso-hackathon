import type { GraphNode, GraphEdge, EdgeStrength } from './types.js';

interface CuratedEdge {
  from: number;
  to: number;
  strength: EdgeStrength;
  weight: number;
  reason: string;
}

const STRONG = 0.85;
const MEDIUM = 0.55;
const WEAK   = 0.25;

const CURATED_EDGES: CuratedEdge[] = [
  // ── Strong edges ──────────────────────────────────────────────────────────
  { from: 129, to: 222, strength: 'strong', weight: STRONG, reason: 'record viewership peaks Twitch too' },
  { from: 129, to: 248, strength: 'strong', weight: STRONG, reason: 'more viewers means fuller stadiums' },
  { from: 129, to: 249, strength: 'strong', weight: STRONG, reason: 'bigger audience means more VAR scrutiny' },
  { from: 129, to: 92,  strength: 'strong', weight: STRONG, reason: 'high stakes matches produce more cards' },
  { from: 129, to: 244, strength: 'strong', weight: STRONG, reason: 'legends define the tournament story' },
  { from: 129, to: 247, strength: 'strong', weight: STRONG, reason: 'home tournament drives CONCACAF stakes' },
  { from: 129, to: 246, strength: 'strong', weight: STRONG, reason: 'big tournament raises South American pull' },
  { from: 244, to: 93,  strength: 'strong', weight: STRONG, reason: 'Messi goals count in both markets' },
  { from: 92,  to: 249, strength: 'strong', weight: STRONG, reason: 'yellow cards trigger more VAR checks' },
  { from: 222, to: 225, strength: 'strong', weight: STRONG, reason: 'Kai surges when Twitch peaks' },
  { from: 222, to: 231, strength: 'strong', weight: STRONG, reason: 'same moment, rival platforms compete' },
  { from: 248, to: 73,  strength: 'strong', weight: STRONG, reason: 'full stadiums mean more Mexico travel' },
  // ── Medium edges ──────────────────────────────────────────────────────────
  { from: 129, to: 231, strength: 'medium', weight: MEDIUM, reason: 'big World Cup moments spill to Kick' },
  { from: 129, to: 227, strength: 'medium', weight: MEDIUM, reason: 'tournament moments flood short-form video' },
  { from: 129, to: 245, strength: 'medium', weight: MEDIUM, reason: 'young stars rewrite the tournament story' },
  { from: 93,  to: 34,  strength: 'medium', weight: MEDIUM, reason: 'Messi and Ronaldo share the same stage' },
  { from: 93,  to: 227, strength: 'medium', weight: MEDIUM, reason: 'Messi goal clips go viral instantly' },
  { from: 247, to: 73,  strength: 'medium', weight: MEDIUM, reason: 'CONCACAF deep runs fill Mexico flights' },
  { from: 246, to: 73,  strength: 'medium', weight: MEDIUM, reason: 'South American runs drive fan travel' },
  { from: 244, to: 34,  strength: 'medium', weight: MEDIUM, reason: 'both are chasing a final chapter' },
  { from: 225, to: 227, strength: 'medium', weight: MEDIUM, reason: 'creator peaks spill to Reels' },
  { from: 231, to: 227, strength: 'medium', weight: MEDIUM, reason: 'Kick streams spill to Reels' },
  { from: 249, to: 222, strength: 'medium', weight: MEDIUM, reason: 'VAR controversy drives reaction streams' },
  { from: 92,  to: 222, strength: 'medium', weight: MEDIUM, reason: 'card drama creates the most-clipped moments' },
  // ── Weak edges (optional — improve composition without noise) ─────────────
  { from: 249, to: 227, strength: 'weak', weight: WEAK, reason: 'VAR clips spread via Reels' },
  { from: 244, to: 222, strength: 'weak', weight: WEAK, reason: 'veteran goals lift streaming demand' },
  { from: 245, to: 247, strength: 'weak', weight: WEAK, reason: 'U21 minutes cluster in CONCACAF sides' },
  { from: 245, to: 246, strength: 'weak', weight: WEAK, reason: 'U21 minutes cluster in CONMEBOL sides' },
  { from: 93,  to: 222, strength: 'weak', weight: WEAK, reason: 'Messi moments lift streaming demand' },
];

export function buildEdges(nodes: GraphNode[]): GraphEdge[] {
  const nodeIds = new Set(nodes.map(n => String(n.marketId)));
  const edges: GraphEdge[] = [];

  for (const e of CURATED_EDGES) {
    const src = String(e.from);
    const tgt = String(e.to);
    if (!nodeIds.has(src) || !nodeIds.has(tgt)) continue;
    edges.push({
      source: src,
      target: tgt,
      strength: e.strength,
      weight: e.weight,
      reason: e.reason,
    });
  }

  return edges;
}
