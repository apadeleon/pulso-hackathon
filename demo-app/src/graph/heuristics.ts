import type { GraphNode, GraphEdge, EdgeStrength } from './types.js';

interface CuratedEdge {
  from: number;
  to: number;
  strength: EdgeStrength;
  weight: number;
  reason: string;
  detail: string;
}

const STRONG = 0.85;
const MEDIUM = 0.55;
const WEAK   = 0.25;

const CURATED_EDGES: CuratedEdge[] = [
  // ── Strong edges ──────────────────────────────────────────────────────────
  {
    from: 129, to: 222, strength: 'strong', weight: STRONG,
    reason: 'record viewership peaks Twitch too',
    detail: 'When the World Cup sets broadcast viewership records, Twitch mirrors the surge in real time. The platform\'s peak concurrent viewers during major football matches track global broadcast numbers directly — the same moments that pull 1.5 billion people to a screen funnel millions to Twitch co-streams, watch parties, and creator reactions. In 2022, Twitch broke its own records during the Qatar final. A record-viewership 2026 tournament makes a Twitch peak near-certain.',
  },
  {
    from: 129, to: 248, strength: 'strong', weight: STRONG,
    reason: 'more viewers means fuller stadiums',
    detail: 'Stadium attendance and broadcast viewership are two readings of the same cultural gravity. The more globally engaged the tournament, the more people convert passive fandom into physical attendance — especially at Mexico-hosted matches, which benefit from short-haul travel from both North and South America. Record viewership signals a tournament generating extraordinary cultural pull, and that pull moves people off their couches and onto flights to Guadalajara and Azteca.',
  },
  {
    from: 129, to: 249, strength: 'strong', weight: STRONG,
    reason: 'bigger audience means more VAR scrutiny',
    detail: 'Larger audiences raise the stakes of every decision, and higher stakes increase the frequency and visibility of VAR interventions. In matches watched by hundreds of millions, the pressure to get decisions right leads to more reviews, not fewer. Qatar 2022 produced 25 VAR overturns across 64 matches. With 104 matches in 2026 and a record-chasing global audience amplifying the consequence of every call, the baseline expectation for overturns rises proportionally.',
  },
  {
    from: 129, to: 92, strength: 'strong', weight: STRONG,
    reason: 'high stakes matches produce more cards',
    detail: 'Elimination pressure generates physical football. The correlation between match importance and disciplinary volume is well-documented: when the cost of losing peaks in the knockout stages, tackling intensity, confrontations, and referee interventions all increase. The 2026 format — the largest knockout stage in World Cup history — creates more high-stakes elimination matches than any previous tournament, directly driving card volume across the competition.',
  },
  {
    from: 129, to: 244, strength: 'strong', weight: STRONG,
    reason: 'legends define the tournament story',
    detail: 'Record global viewership for the 2026 World Cup is built partly on the legend-chasing narrative — Messi at 38, potentially Ronaldo, Lewandowski, and other players approaching or passing 35 at what may be their final World Cup. Veteran goal milestones are what a significant portion of that audience came specifically to witness. The viewership and the veteran goals market share a driver: the once-in-a-generation convergence of elite players at the end of their international careers.',
  },
  {
    from: 129, to: 247, strength: 'strong', weight: STRONG,
    reason: 'home tournament drives CONCACAF stakes',
    detail: 'The 2026 World Cup is the first hosted in North America, and CONCACAF advancement is the primary driver of North American broadcast numbers. If the USA and Mexico advance into the round of 16, US network ratings could rival or exceed the Super Bowl. Record viewership projections are built partly on this expectation — and conversely, CONCACAF advancement validates and sustains the audience numbers that make 2026 the biggest sports media event in history.',
  },
  {
    from: 129, to: 246, strength: 'strong', weight: STRONG,
    reason: 'big tournament raises South American pull',
    detail: 'South American clubs and national teams carry the deepest global football fandom. When Argentina and Brazil advance deep into a World Cup, the aggregate viewership across South America, Europe, and Asia peaks simultaneously. CONMEBOL presence in the quarterfinals is one of the structural guarantees of a record-viewership tournament — it activates the Messi and Neymar fan bases at the same time, compounding the engagement of an already-record event.',
  },
  {
    from: 244, to: 93, strength: 'strong', weight: STRONG,
    reason: 'Messi goals count in both markets',
    detail: 'Messi is effectively the market within the veteran goals market. Of the expected six goals scored by players aged 35 or older, Messi — at 38 — is likely responsible for three to four of them if Argentina advances deep into the tournament. Every Messi World Cup goal resolves simultaneously in both markets: it increments the veteran goals counter while directly advancing his individual milestone chase. These two markets are measuring the same set of events from different angles.',
  },
  {
    from: 92, to: 249, strength: 'strong', weight: STRONG,
    reason: 'yellow cards trigger more VAR checks',
    detail: 'VAR was introduced specifically to catch high-stakes refereeing errors, and the most common triggers are disputed red cards, penalties, and the physical confrontations that produce them. More cards in a tournament means more on-field incidents that invite VAR review. The correlation between disciplinary volume and VAR intervention rate is structural: high VAR overturn numbers cannot exist without the underlying contested physical play that generates the disputed decisions in the first place.',
  },
  {
    from: 222, to: 225, strength: 'strong', weight: STRONG,
    reason: 'Kai surges when Twitch peaks',
    detail: 'Kai Cenat is Twitch\'s highest-peak creator by concurrent viewership. When the platform as a whole reaches record concurrent numbers during a cultural event, Kai\'s individual stream typically captures a disproportionate share of that surge — he is the platform\'s center of gravity. If a World Cup moment drives a platform-wide peak, Kai is the single most likely individual creator to be the destination, whether through a live reaction, a co-stream, or simply being where audiences navigate during peak moments.',
  },
  {
    from: 222, to: 231, strength: 'strong', weight: STRONG,
    reason: 'same moment, rival platforms compete',
    detail: 'Twitch and Kick are locked in a direct viewer attention race. When Twitch peaks during a cultural moment, Kick responds competitively — top Kick creators schedule reaction content, exclusives, or counterprogramming to intercept the audience. The platforms are not independent; they compete for the same pool of concurrent viewers. A Twitch record during the World Cup almost always comes alongside a Kick surge, as both platforms activate simultaneously for the same moment.',
  },
  {
    from: 248, to: 73, strength: 'strong', weight: STRONG,
    reason: 'full stadiums mean more Mexico travel',
    detail: 'Stadium attendance at Mexico-hosted matches and Mexico flight demand are measuring the same physical movement of people. When Azteca and Jalisco are full, it means international visitors traveled to Mexico — those visitors arrived on the same flights the market is pricing. The relationship is near-tautological: high stadium attendance requires high travel volume. The only variable is the origin mix of travelers — nearby North American fans drive different flight demand than long-haul South American ones.',
  },

  // ── Medium edges ──────────────────────────────────────────────────────────
  {
    from: 129, to: 231, strength: 'medium', weight: MEDIUM,
    reason: 'big World Cup moments spill to Kick',
    detail: 'When a global broadcast audience breaks records, creator platforms across the spectrum benefit. Kick\'s growth trajectory means it now captures a meaningful fraction of the overflow audience co-streaming World Cup football — particularly in markets where top Kick creators have strong regional followings. The signal is weaker than the Twitch relationship because Kick\'s aggregate scale is smaller, but the directional link is consistent: tournament-scale moments lift all major creator platforms simultaneously.',
  },
  {
    from: 129, to: 227, strength: 'medium', weight: MEDIUM,
    reason: 'tournament moments flood short-form video',
    detail: 'Short-form video is where World Cup moments reach audiences who are not watching live. The bigger the broadcast viewership, the more source material — goals, controversies, celebrations, referee meltdowns — gets clipped and distributed on Reels within minutes. Qatar 2022 Reels view counts were unprecedented for a sports event; 2026 with a larger broadcast audience creates more viral origin events per match. Broadcast viewership and Reels milestone counts are measuring the same cultural energy from different vantage points.',
  },
  {
    from: 129, to: 245, strength: 'medium', weight: MEDIUM,
    reason: 'young stars rewrite the tournament story',
    detail: 'The 2026 World Cup is being marketed partly as a generational transition — the last chapter for the legends and the emergence of the next wave. Players like Lamine Yamal, Alejandro Garnacho, and Pedri are the storylines that attract younger global viewers who have grown up watching a different era of football. When the tournament attracts record viewership, it is partly because the U21 narrative is compelling — and more competitive young teams advancing deep means more knockout-stage minutes for young players.',
  },
  {
    from: 93, to: 34, strength: 'medium', weight: MEDIUM,
    reason: 'Messi and Ronaldo share the same stage',
    detail: 'Messi and Ronaldo have co-defined elite football for two decades. Their shared global fanbase — hundreds of millions of followers who engage with both — means that when Messi is scoring World Cup goals, the wider legend narrative is amplified, and Ronaldo\'s market relevance rises with it. If Messi has a great tournament, sentiment around all-time legends at the World Cup peaks broadly, which pulls attention directly to Ronaldo\'s own milestone pursuit. Their markets are linked by a shared audience and a shared story.',
  },
  {
    from: 93, to: 227, strength: 'medium', weight: MEDIUM,
    reason: 'Messi goal clips go viral instantly',
    detail: 'Messi goal clips are the single most viral content category in football. When Messi scores in a World Cup knockout match, the clip of that goal reaches more views faster than any other type of sports content on the platform. A Messi goal in a semifinal could generate the highest-viewed Reel of the tournament window. His goal frequency in this market is not merely correlated with Reels milestones — it is one of the primary causal drivers, producing multiple milestone-qualifying clip events from a single match.',
  },
  {
    from: 247, to: 73, strength: 'medium', weight: MEDIUM,
    reason: 'CONCACAF deep runs fill Mexico flights',
    detail: 'When Mexico and the USA advance past the group stage, fan bases that had been watching remotely make the decision to travel. The dynamic is predictable and well-documented from previous tournaments: ticket demand is held back until fans have confidence their team will still be playing. CONCACAF advancement through the group stage is the trigger that converts speculative flight searches into purchased tickets. Deep runs by North American sides consistently produce late-surge demand spikes in Mexico flight prices.',
  },
  {
    from: 246, to: 73, strength: 'medium', weight: MEDIUM,
    reason: 'South American runs drive fan travel',
    detail: 'Argentina, Brazil, Colombia, and Uruguay have enormous fan bases that travel internationally to follow their national teams. The 2026 World Cup is geographically far more accessible for South American fans than Qatar was — Mexico is reachable by direct flights from Buenos Aires, São Paulo, Bogotá, and Montevideo. When CONMEBOL teams advance to the quarterfinals, the secondary market for flights from South America to Mexico surges, as fans who had been hedging on travel now commit to attending the knockout matches in person.',
  },
  {
    from: 244, to: 34, strength: 'medium', weight: MEDIUM,
    reason: 'both are chasing a final chapter',
    detail: 'The veteran goals market is dominated by the handful of elite players aged 35 or over who still reach the tournament. Ronaldo — at 41 if he qualifies — would be one of the most prolific potential scorers in this cohort alongside Messi. His presence is the single biggest variable in the veteran goals market beyond Messi himself. Both markets resolve around the same underlying question: can elite players near the end of their careers still perform at World Cup level when it matters most?',
  },
  {
    from: 225, to: 227, strength: 'medium', weight: MEDIUM,
    reason: 'creator peaks spill to Reels',
    detail: 'Creator peaks and Reels milestones share the same cultural moment. When Kai Cenat is streaming a record concurrent viewership session, the highlights from within that stream — the reactions, the viral clip moments — get redistributed on Reels within minutes. Kai\'s Reels footprint is substantial and his audience overlaps heavily with Instagram. A Kai Cenat record concurrent viewership event is simultaneously a Reels milestone event, as the in-stream moments circulate independently of the stream itself.',
  },
  {
    from: 231, to: 227, strength: 'medium', weight: MEDIUM,
    reason: 'Kick streams spill to Reels',
    detail: 'Kick streams generate Reels-worthy content through the same mechanism as Twitch. When top Kick creators reach peak concurrent viewership during a World Cup moment, the in-stream reactions, celebrations, and controversies spread immediately to Reels. The platform\'s growing creator roster — several of whom have exclusive deals — means that Kick now contributes meaningfully to the short-form video milestone cadence, producing clip material that reaches Reels audiences who have never opened Kick.',
  },
  {
    from: 249, to: 222, strength: 'medium', weight: MEDIUM,
    reason: 'VAR controversy drives reaction streams',
    detail: 'VAR controversy is the purest streaming content: a decision that is disputed, reviewed, and reversed generates immediate, sustained emotional reaction that people seek to process through live commentary. When a VAR overturn changes the outcome of a major match, Twitch concurrent viewers spike in real time as audiences open streams for debate and reaction. The 2022 Argentina–France final VAR moments drove measurable record co-stream numbers. More VAR drama across 104 matches means more of these spikes, increasing the probability of an all-time Twitch peak.',
  },
  {
    from: 92, to: 222, strength: 'medium', weight: MEDIUM,
    reason: 'card drama creates the most-clipped moments',
    detail: 'Red cards and penalty controversies are the events that push passive broadcast viewers to seek active streaming participation. When a contentious card is shown in a high-stakes knockout match, the immediate demand for creator commentary, analysis, and emotional reaction drives a Twitch viewership spike within minutes. Cards create the drama; drama creates the content demand; content demand creates the streaming surge. The causal chain from high-card-volume matches to streaming engagement is consistent and measurable across tournaments.',
  },

  // ── Weak edges (optional — improve composition without noise) ─────────────
  {
    from: 249, to: 227, strength: 'weak', weight: WEAK,
    reason: 'VAR clips spread via Reels',
    detail: 'VAR moments produce self-contained narrative arcs — the original decision, the review, the reversal, the crowd reaction — that compress naturally into short-form clips. When VAR overturns are frequent across a tournament, the supply of high-engagement clip material on Reels increases proportionally. The relationship is weaker than the direct broadcast-to-Reels connection because VAR clips compete with goal clips and celebration clips for Reels milestone volume, but the contribution is consistent and real.',
  },
  {
    from: 244, to: 222, strength: 'weak', weight: WEAK,
    reason: 'veteran goals lift streaming demand',
    detail: 'When a veteran player like Messi scores a World Cup goal in the knockout stage, Twitch concurrent viewership spikes immediately as audiences navigate to streams for live reaction and analysis. The veteran goals market and Twitch peak share this mechanism: extraordinary moments generate extraordinary demand for co-viewing. The relationship is weaker than the direct broadcast signal because veteran goals are a subset of all major match events that drive Twitch peaks — they are the most potent trigger, but not the only one.',
  },
  {
    from: 245, to: 247, strength: 'weak', weight: WEAK,
    reason: 'U21 minutes cluster in CONCACAF sides',
    detail: 'The USA and Canada — the two most competitive CONCACAF sides alongside Mexico — field some of the most prominent U21 talent in the 2026 tournament. The US squad in particular, anchored by young Premier League and Bundesliga players, would accumulate significant U21 knockout-stage minutes if they advance into the round of 16. CONCACAF advancement and U21 minutes are weakly correlated because the same nations that advance the furthest tend to be those with the strongest cohort of emerging players.',
  },
  {
    from: 245, to: 246, strength: 'weak', weight: WEAK,
    reason: 'U21 minutes cluster in CONMEBOL sides',
    detail: 'South American nations are fielding increasingly younger squads in 2026. Colombia, Uruguay, and Ecuador have significant U21 contributors who would accumulate knockout-stage minutes if their national sides advance to the quarterfinals. The weak correlation exists because the same CONMEBOL nations that advance deep tend to be those balancing veterans with strong emerging talent. Argentina is the exception — a more veteran-heavy squad — but the broader CONMEBOL picture pulls the U21 minutes and CONMEBOL advancement markets into loose alignment.',
  },
  {
    from: 93, to: 222, strength: 'weak', weight: WEAK,
    reason: 'Messi moments lift streaming demand',
    detail: 'Messi goal events are documented real-time triggers for Twitch viewership spikes. His goals in the 2022 World Cup produced measurable concurrent viewer increases within minutes as global audiences sought live commentary and emotional co-viewing. The signal is weaker than direct broadcast viewership because the causal chain runs through the match moment itself — Messi\'s goals are one of many spike triggers, not the exclusive driver. But in a tournament context, a Messi knockout-stage goal remains the single highest-probability catalyst for a Twitch viewership record.',
  },
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
      detail: e.detail,
    });
  }

  return edges;
}
