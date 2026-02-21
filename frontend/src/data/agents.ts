export interface Agent {
  id: string;
  name: string;
  character: string;
  movie: string;
  color: string;
  bgGradient: string;
  emoji: string;
  vibe: string;
  description: string;
}

export const agents: Agent[] = [
  {
    id: "commute",
    name: "The Commute Agent",
    character: "The Train Conductor",
    movie: "Spirited Away / Polar Express",
    color: "ghibli-sky",
    bgGradient: "from-ghibli-sky/20 via-ghibli-mist to-ghibli-sky/10",
    emoji: "🚂",
    vibe: "Punctual, rhythmic, and slightly obsessed with clocks",
    description: "A tall, lanky shadow figure with a glowing pocket watch. He knows every track, bus line, and shortcut in New Jersey.",
  },
  {
    id: "budget",
    name: "The Budget Fit Agent",
    character: "Lin (The Star-Steward)",
    movie: "Spirited Away",
    color: "ghibli-amber",
    bgGradient: "from-ghibli-amber/20 via-ghibli-parchment to-ghibli-amber/10",
    emoji: "💰",
    vibe: "Practical, no-nonsense, and protective of your gold",
    description: "The hardworking big sister figure who manages the tokens and ensures everyone gets fed. She's tough but looks out for you.",
  },
  {
    id: "market",
    name: "The Market Fairness Agent",
    character: "The Baron (Antique Shop Keeper)",
    movie: "Whisper of the Heart",
    color: "ghibli-forest",
    bgGradient: "from-ghibli-meadow/20 via-ghibli-mist to-ghibli-forest/10",
    emoji: "🎩",
    vibe: "Sophisticated, fair, and incredibly knowledgeable about true value",
    description: "An elegant, wise shop owner who can tell the difference between a masterpiece and a fake just by the smell of the wood.",
  },
  {
    id: "neighborhood",
    name: "The Neighborhood Agent",
    character: "Kiki (The Delivery Witch)",
    movie: "Kiki's Delivery Service",
    color: "ghibli-pink",
    bgGradient: "from-ghibli-pink/20 via-ghibli-parchment to-ghibli-pink/10",
    emoji: "🧹",
    vibe: "Observant, community-oriented, and breezy",
    description: "A character like Kiki on her broom, who flies over the streets and knows where the best bakery, the safest alleys, and the quietest parks are.",
  },
  {
    id: "hidden",
    name: "The Hidden Cost Agent",
    character: "Kamaji's Helper (Boiler Room Spider)",
    movie: "Spirited Away",
    color: "ghibli-soot",
    bgGradient: "from-ghibli-soot/10 via-ghibli-mist to-ghibli-amber/10",
    emoji: "🕷️",
    vibe: "Detail-oriented, grumbly, and investigative",
    description: "A multi-armed tinkerer who digs into the pipes and basements to find what's hidden. Nothing escapes their six eyes.",
  },
];

export const summaryAgent: Agent = {
  id: "summary",
  name: "The Grand Summary",
  character: "Kamaji",
  movie: "Spirited Away",
  color: "ghibli-meadow",
  bgGradient: "from-ghibli-meadow/20 via-ghibli-sky/10 to-ghibli-parchment",
  emoji: "🐙",
  vibe: "Grumpy but kind-hearted, efficient, and all-knowing",
  description: "The six-armed boiler man who runs the entire system. He knows where every train goes and manages the big picture.",
};

export const chatAgent: Agent = {
  id: "chat",
  name: "Ask Howl",
  character: "Howl",
  movie: "Howl's Moving Castle",
  color: "ghibli-sky",
  bgGradient: "from-ghibli-sky/20 via-ghibli-pink/10 to-ghibli-parchment",
  emoji: "✨",
  vibe: "Charming, brilliant, and occasionally dramatic",
  description: "The dashing wizard who can answer any question about your potential home with flair and insight.",
};
