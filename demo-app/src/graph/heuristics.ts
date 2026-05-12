import type { GraphNode, GraphEdge, EdgeStrength } from './types.js';

const MAX_EDGES_PER_NODE = 14;

interface Score {
  source: string;
  target: string;
  score: number;
  reason: string;
}

function sharedCount(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter(x => setB.has(x)).length;
}

function keywordsFrom(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(t => t.length > 3);
}

function keywordOverlap(a: string, b: string): number {
  const kA = new Set(keywordsFrom(a));
  const kB = new Set(keywordsFrom(b));
  let count = 0;
  for (const k of kA) if (kB.has(k)) count++;
  return count;
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}

const ECOSYSTEM_GROUPS: ReadonlySet<string>[] = [
  new Set(['spacex', 'starlink', 'starship']),
];

const RATES_SCOPES = new Set(['Macro & Finance', 'Macroeconomics & Fiat']);
const EQUITY_SCOPES = new Set(['Equities & Indices', 'Macro & Finance', 'Macroeconomics & Fiat']);

function hasEcosystemWord(text: string, group: ReadonlySet<string>): boolean {
  return text.toLowerCase().split(/\W+/).some(w => group.has(w));
}

function strengthFromScore(score: number): EdgeStrength {
  if (score >= 3.5) return 'strong';
  if (score >= 1.8) return 'medium';
  return 'weak';
}

export function buildEdges(nodes: GraphNode[]): GraphEdge[] {
  const scores: Score[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];

      let score = 0;
      const reasons: string[] = [];

      // Primary: same scope → strongest intra-cluster bond
      if (a.scope === b.scope) {
        score += 3;
        reasons.push('same scope');
      }

      // Secondary: same macro-cluster, different scope (e.g. Soccer + Basketball)
      if (a.cluster === b.cluster && a.scope !== b.scope) {
        score += 1.5;
        reasons.push('related domain');
      }

      // Tertiary: shared categories
      const shared = sharedCount(a.categories, b.categories);
      if (shared > 0) {
        score += shared * 0.8;
        reasons.push(`${shared} shared ${shared === 1 ? 'category' : 'categories'}`);
      }

      // Tertiary: keyword overlap
      const kTitle = keywordOverlap(a.title, b.title);
      const kSubject = keywordOverlap(a.subjectNoun, b.subjectNoun);
      const kTotal = Math.min(kTitle + kSubject, 2);
      if (kTotal > 0) {
        score += kTotal * 0.4;
        reasons.push('similar topic');
      }

      // Tertiary: close resolution windows
      const days = daysBetween(a.resolvesAt, b.resolvesAt);
      if (days !== null && days <= 30) {
        score += 0.5;
        reasons.push('close resolution');
      }

      // Ecosystem boost: SpaceX/Starlink/Starship co-occurrence
      for (const group of ECOSYSTEM_GROUPS) {
        if (hasEcosystemWord(a.title, group) && hasEcosystemWord(b.title, group)) {
          score += 2.0;
          reasons.push('same ecosystem');
          break;
        }
      }

      // Macro-signal boost: cross-scope edges within the Capital Stack cluster
      if (
        a.cluster === 1 && b.cluster === 1 && a.scope !== b.scope &&
        (RATES_SCOPES.has(a.scope) || RATES_SCOPES.has(b.scope)) &&
        (EQUITY_SCOPES.has(a.scope) || EQUITY_SCOPES.has(b.scope))
      ) {
        score += 1.0;
        reasons.push('macro signal');
      }

      if (score > 0.3) {
        scores.push({ source: a.id, target: b.id, score, reason: reasons.join(', ') });
      }
    }
  }

  scores.sort((a, b) => b.score - a.score);
  const degree = new Map<string, number>();

  const edges: GraphEdge[] = [];
  for (const s of scores) {
    const da = degree.get(s.source) ?? 0;
    const db = degree.get(s.target) ?? 0;
    if (da >= MAX_EDGES_PER_NODE || db >= MAX_EDGES_PER_NODE) continue;
    degree.set(s.source, da + 1);
    degree.set(s.target, db + 1);

    const weight = Math.min(s.score / 6, 1);
    edges.push({
      source: s.source,
      target: s.target,
      strength: strengthFromScore(s.score),
      weight,
      reason: s.reason,
    });
  }

  return edges;
}
