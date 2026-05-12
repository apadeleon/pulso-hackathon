export const CLUSTER_LABELS = [
  'World Cup Core',
  'Legacy / Star Power',
  'Attention / Creator',
  'Travel Spillover',
] as const;

export const CLUSTER_DESCRIPTIONS: string[] = [
  'The beating heart of the tournament — markets that define how the 2026 World Cup unfolds.',
  'The greatest players of a generation, potentially playing their last World Cup.',
  'Where the tournament moment meets the internet — streaming, social, and creator peaks.',
  'When teams advance, people travel. The real-world economic echo of tournament outcomes.',
];

export interface MarketEditorial {
  hoverExplanation: string;
  crowdSummary: string;
  whyItMatters: string;
  nowContext: string;
}

export const MARKET_EDITORIAL: Record<number, MarketEditorial> = {
  129: {
    hoverExplanation: 'The anchor signal — if the World Cup breaks viewership records, almost every market on this graph responds.',
    crowdSummary: 'The crowd is betting on whether 2026 breaks the all-time peak viewership record set in Qatar.',
    whyItMatters: 'Viewership sets the ceiling for every downstream market. Attendance, social, streaming, and the legend narrative all follow from how many people watch.',
    nowContext: 'The 2026 World Cup is hosted in North America for the first time, raising the stakes for a new audience record.',
  },
  248: {
    hoverExplanation: 'Mexico is hosting 13 matches. How full the stadiums are drives regional travel demand and buzz.',
    crowdSummary: 'The crowd is pricing average attendance across the 13 Mexico-hosted matches, anchored by Azteca and Jalisco.',
    whyItMatters: 'Mexico match attendance is the regional demand signal. It directly connects to Mexico flight prices and CONCACAF crowd energy.',
    nowContext: 'With Azteca and Jalisco confirmed as venues, ticket demand is already elevated for CONCACAF-group matches.',
  },
  249: {
    hoverExplanation: 'Every VAR reversal becomes a clip. More VAR drama means more streaming reactions and social video.',
    crowdSummary: 'The crowd expects around 40 VAR overturns across 104 matches — higher than Qatar, scaled for the larger tournament.',
    whyItMatters: 'VAR drama is where football becomes content. Each overturn triggers waves of streaming commentary and Reels.',
    nowContext: 'Qatar 2022 had 25 VAR overturns across 64 matches. The 2026 base expectation is roughly 40 across 104 matches.',
  },
  247: {
    hoverExplanation: 'If USA, Mexico, or Canada advance deep, the North American audience gets fully invested.',
    crowdSummary: 'The crowd sees 2 CONCACAF teams reaching the round of 16 as the base case, with USA and Mexico as the main candidates.',
    whyItMatters: 'CONCACAF advancement is the home-tournament storyline — it drives the regional audience that makes 2026 unique.',
    nowContext: 'USA and Mexico are both considered strong candidates to reach the last 16 on their home soil.',
  },
  246: {
    hoverExplanation: 'Argentina and Brazil running deep pulls South American attention and raises global stakes.',
    crowdSummary: 'The crowd leans toward 3 CONMEBOL teams reaching the quarterfinals, with Argentina and Brazil as near-certainties.',
    whyItMatters: 'CONMEBOL strength sets the prestige of the tournament. South American fans also drive substantial travel to the host cities.',
    nowContext: 'Argentina are defending champions. Brazil and Colombia are serious contenders for the quarterfinals.',
  },
  245: {
    hoverExplanation: "The new generation breaking through is the tournament's biggest emerging story.",
    crowdSummary: 'The crowd is betting on how much of the knockout stage will belong to players 21 and under.',
    whyItMatters: 'U21 minutes in the knockout stage signal a generational shift — it reshapes which national narratives dominate the tournament.',
    nowContext: "The 2026 knockout stage is the largest in World Cup history, giving more opportunity for young talent to accumulate minutes.",
  },
  244: {
    hoverExplanation: 'If veteran stars score, this market and the legacy narrative markets move together.',
    crowdSummary: 'The crowd expects around 6 goals from players 35 and older — driven almost entirely by elite veterans like Messi.',
    whyItMatters: 'Veteran-goal volume is the statistical proof of the legend-chasing story — the bridge between raw tournament data and the Messi narrative.',
    nowContext: "Messi at 38+ would be the headline. Any veteran goal in a high-stakes match amplifies the legacy market.",
  },
  92: {
    hoverExplanation: 'High-card matches produce the controversy clips that drive streaming reactions and commentary.',
    crowdSummary: 'The crowd is pricing total discipline incidents across the tournament.',
    whyItMatters: 'Discipline data connects directly to VAR controversy and the streaming reaction machine. Hot matches create the most-watched clips.',
    nowContext: 'Knockout stage pressure historically produces more cards. The 2026 format adds more elimination-game tension.',
  },
  93: {
    hoverExplanation: 'Messi scoring at the World Cup is the biggest individual event in this graph — it touches almost everything.',
    crowdSummary: "The crowd is betting on Messi's total career goal milestone — and whether a World Cup goal gets him there.",
    whyItMatters: 'Messi goal milestones are the highest-signal events in the graph. They drive streaming peaks, veteran-goal counts, and social media simultaneously.',
    nowContext: 'At 38, this may be his last World Cup. Every goal carries outsized narrative weight and global attention.',
  },
  34: {
    hoverExplanation: 'The second legacy arc in the graph — Ronaldo and Messi share a global audience that watches both.',
    crowdSummary: "The crowd is pricing this market knowing Ronaldo and Messi's combined following is unique in sports history.",
    whyItMatters: 'When Ronaldo and Messi compete in the same tournament, their combined audience reaches across every continent.',
    nowContext: 'Ronaldo at 41 would be historic. His presence keeps the legacy narrative alive alongside Messi.',
  },
  222: {
    hoverExplanation: 'Twitch peaks when viral moments hit — World Cup events consistently break streaming records.',
    crowdSummary: 'The crowd is betting on whether Twitch breaks its all-time peak concurrent viewership during a World Cup event.',
    whyItMatters: "Twitch viewership is the real-time audience signal for the creator economy. It spikes whenever big tournament moments happen.",
    nowContext: "The World Cup is the biggest recurring event for Twitch's global audience. 2026 viewer records are widely expected.",
  },
  225: {
    hoverExplanation: "Kai Cenat's viewer records track the same cultural wave as major sports and creator moments.",
    crowdSummary: 'The crowd is betting on whether Kai Cenat hits a new peak concurrent viewership milestone.',
    whyItMatters: "Kai Cenat is Twitch's current peak creator — his viewership marks moments when pop culture and sports intersect.",
    nowContext: 'Kai has broken concurrent viewer records multiple times. A World Cup-linked event or reaction stream could be the catalyst.',
  },
  231: {
    hoverExplanation: 'Kick competes with Twitch for the same creator wave — when one peaks, the other often follows.',
    crowdSummary: "The crowd is betting on Kick's peak concurrent viewership as it battles Twitch for creator market share.",
    whyItMatters: "Kick is Twitch's main rival. They compete for creators and audiences during the same viral moments.",
    nowContext: 'Several top creators have exclusive Kick deals. A major sports moment could shift the viewer balance toward Kick.',
  },
  227: {
    hoverExplanation: 'Short-form video is where World Cup moments reach the widest audience — and this market measures that reach.',
    crowdSummary: 'The crowd is betting on how many times major Reels content breaks view milestones during the tournament window.',
    whyItMatters: 'Reels plays are the viral amplification signal. They measure how far a tournament moment travels beyond the core football audience.',
    nowContext: 'VAR drama, veteran goal milestones, and creator reactions all feed directly into short-form video peaks.',
  },
  73: {
    hoverExplanation: 'Every deep CONCACAF or CONMEBOL run drives more flights to Mexico. Stadium attendance and travel prices move together.',
    crowdSummary: 'The crowd is pricing Mexico flight demand as a proxy for how many people travel to attend the World Cup.',
    whyItMatters: 'Mexico flight demand is the real-world travel market that connects tournament outcomes to economic activity.',
    nowContext: 'With Mexico hosting 13 matches, flights from South and North America are already seeing elevated demand.',
  },
};

export function getEditorial(marketId: number): MarketEditorial | undefined {
  return MARKET_EDITORIAL[marketId];
}
