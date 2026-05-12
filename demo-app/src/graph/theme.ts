/**
 * Visual constants for the Pulso Graph canvas.
 * All colors are concrete hex/rgba strings — canvas draw calls cannot use CSS variables.
 */

// ─── Cluster palette — 3 macro-clusters ──────────────────────────────────────
// 0 = AI Arms Race     1 = Capital Stack     2 = New Frontier
export const CLUSTER_COLORS = [
  '#38bdf8', // 0 AI Arms Race    — sky blue
  '#facc15', // 1 Capital Stack   — electric gold
  '#34d399', // 2 New Frontier    — emerald
] as const;

export function clusterColor(group: number): string {
  return CLUSTER_COLORS[group % CLUSTER_COLORS.length];
}

// ─── Canvas background ────────────────────────────────────────────────────────
export const BG_COLOR = '#080b12';

// ─── Node states ─────────────────────────────────────────────────────────────
export const NODE = {
  radius: 6,
  radiusHover: 10,
  radiusPerDegree: 0.55,
  radiusDegreeMax: 7,

  alphaDefault: 0.92,
  alphaNeighbor: 1.0,
  alphaDimmed: 0.07,
  alphaHover: 1.0,

  glowRadiusDefault: 18,
  glowRadiusHover: 30,
  glowAlphaDefault: 0.35,
  glowAlphaHover: 0.65,

  ringWidth: 2.0,
  ringAlpha: 0.90,

  labelMaxChars: 28,
  /** Nodes with degree >= this always display their label */
  hubDegree: 3,
} as const;

// ─── Edge states ─────────────────────────────────────────────────────────────
export const EDGE = {
  colorStrong: 'rgba(255,255,255,0.68)',
  colorMedium: 'rgba(255,255,255,0.42)',
  colorWeak:   'rgba(255,255,255,0.22)',

  colorHighlighted: 'rgba(255,255,255,0.95)',
  colorDimmed:      'rgba(255,255,255,0.04)',

  widthStrong: 2.2,
  widthMedium: 1.4,
  widthWeak:   0.8,
  widthHighlighted: 3.2,
} as const;

// ─── Force layout (desktop-first, 15 nodes) ───────────────────────────────────
export const FORCE = {
  linkDistance:   50,    // more canvas space per node
  chargeStrength: -140,  // stronger repulsion → clearer cluster separation
  collideRadius:  11,
  centerStrength: 0.06,  // looser center pull — lets clusters spread naturally
  alphaDecay:     0.010, // slightly slower settle so layout fully converges
  velocityDecay:  0.30,
} as const;
