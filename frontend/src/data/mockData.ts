export interface Listing {
  id: string;
  rank: number;
  name: string;
  address: string;
  rent: number;
  trueCost: number;
  matchScore: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  distanceToCampus: string;
  walkScore: number;
  hasGym: boolean;
  hasGrocery: boolean;
  petFriendly: boolean;
  amenities: string[];
  description: string;
  historicalInsight: string;
  historicalTrend: 'up' | 'down' | 'stable';
  historicalPercent: number;
  costBreakdown: {
    rent: number;
    utilities: number;
    transportation: number;
    groceries: number;
  };
  commute: {
    driving: string;
    transit: string;
    biking: string;
    walking: string;
  };
  safety: {
    score: number;
    nearestPolice: string;
    summary: string;
  };
  historicalPrices: { month: string; price: number }[];
  percentile: number;
  pros: string[];
  cons: string[];
  sophieSummary: string;
  images: string[];
}

export const mockListings: Listing[] = [
  {
    id: "1",
    rank: 1,
    name: "The Arbor at State Street",
    address: "425 S State St, Ann Arbor, MI 48104",
    rent: 1150,
    trueCost: 1485,
    matchScore: 94,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 850,
    distanceToCampus: "0.3 mi",
    walkScore: 92,
    hasGym: true,
    hasGrocery: true,
    petFriendly: false,
    amenities: ["In-unit Laundry", "Air Conditioning", "Dishwasher", "Balcony/Patio"],
    description: "A charming 2-bedroom apartment just steps from central campus. Features hardwood floors, large windows with natural light, and a cozy balcony overlooking a tree-lined street. Recently renovated kitchen with modern appliances.",
    historicalInsight: "12% below 2023 average",
    historicalTrend: "down",
    historicalPercent: 12,
    costBreakdown: { rent: 1150, utilities: 120, transportation: 15, groceries: 200 },
    commute: { driving: "3 min", transit: "8 min", biking: "2 min", walking: "6 min" },
    safety: { score: 8, nearestPolice: "0.4 mi", summary: "This area is generally safe with low reported incidents. Well-lit streets and active campus police presence." },
    historicalPrices: [
      { month: "Jan 2022", price: 1250 }, { month: "Apr 2022", price: 1270 },
      { month: "Jul 2022", price: 1300 }, { month: "Oct 2022", price: 1280 },
      { month: "Jan 2023", price: 1310 }, { month: "Apr 2023", price: 1320 },
      { month: "Jul 2023", price: 1350 }, { month: "Oct 2023", price: 1300 },
      { month: "Jan 2024", price: 1280 }, { month: "Apr 2024", price: 1200 },
      { month: "Jul 2024", price: 1180 }, { month: "Oct 2024", price: 1150 },
    ],
    percentile: 32,
    pros: ["Walking distance to campus", "Excellent walk score", "Below historical average rent", "In-unit laundry included"],
    cons: ["No pets allowed", "Street parking can be limited"],
    sophieSummary: "This is an excellent find, dear. The location is unbeatable for campus access, and the current rent is well below the historical average. The true monthly cost remains very manageable. I highly recommend this nest.",
    images: [],
  },
  {
    id: "2",
    rank: 2,
    name: "Forest Glen Apartments",
    address: "2100 Hubbard St, Ann Arbor, MI 48105",
    rent: 875,
    trueCost: 1290,
    matchScore: 87,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 620,
    distanceToCampus: "1.8 mi",
    walkScore: 68,
    hasGym: true,
    hasGrocery: true,
    petFriendly: true,
    amenities: ["Pet Friendly", "Parking", "Air Conditioning", "Pool"],
    description: "A peaceful 1-bedroom retreat nestled among mature trees. This apartment complex offers a resort-style pool, fitness center, and ample parking. Perfect for students who prefer a quieter environment away from the campus buzz.",
    historicalInsight: "3% below historical median",
    historicalTrend: "down",
    historicalPercent: 3,
    costBreakdown: { rent: 875, utilities: 100, transportation: 115, groceries: 200 },
    commute: { driving: "7 min", transit: "22 min", biking: "10 min", walking: "35 min" },
    safety: { score: 9, nearestPolice: "0.8 mi", summary: "Very safe residential neighborhood with minimal crime. Quiet streets and family-friendly atmosphere." },
    historicalPrices: [
      { month: "Jan 2022", price: 820 }, { month: "Apr 2022", price: 830 },
      { month: "Jul 2022", price: 860 }, { month: "Oct 2022", price: 850 },
      { month: "Jan 2023", price: 870 }, { month: "Apr 2023", price: 890 },
      { month: "Jul 2023", price: 920 }, { month: "Oct 2023", price: 900 },
      { month: "Jan 2024", price: 890 }, { month: "Apr 2024", price: 880 },
      { month: "Jul 2024", price: 885 }, { month: "Oct 2024", price: 875 },
    ],
    percentile: 28,
    pros: ["Pet friendly — bring your companion!", "Pool and fitness center", "Very safe neighborhood", "Affordable rent"],
    cons: ["Further from campus", "Higher transportation costs", "Limited nightlife nearby"],
    sophieSummary: "A wonderful option if you value peace and safety. The rent is quite affordable, though the commute adds to true cost. The pet-friendly policy is a lovely bonus. A solid nest for the budget-conscious student.",
    images: [],
  },
  {
    id: "3",
    rank: 3,
    name: "Liberty Lofts",
    address: "310 E Liberty St, Ann Arbor, MI 48104",
    rent: 1450,
    trueCost: 1720,
    matchScore: 82,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 980,
    distanceToCampus: "0.5 mi",
    walkScore: 95,
    hasGym: false,
    hasGrocery: true,
    petFriendly: true,
    amenities: ["In-unit Laundry", "Dishwasher", "Air Conditioning", "Furnished", "Balcony/Patio"],
    description: "Modern loft-style living in the heart of downtown Ann Arbor. Exposed brick, soaring ceilings, and floor-to-ceiling windows. Steps from restaurants, shops, and entertainment. Comes fully furnished — just bring your suitcase.",
    historicalInsight: "5% above historical median",
    historicalTrend: "up",
    historicalPercent: 5,
    costBreakdown: { rent: 1450, utilities: 140, transportation: 10, groceries: 120 },
    commute: { driving: "4 min", transit: "10 min", biking: "3 min", walking: "10 min" },
    safety: { score: 7, nearestPolice: "0.3 mi", summary: "Downtown area with moderate activity. Generally safe but expect some nightlife noise on weekends." },
    historicalPrices: [
      { month: "Jan 2022", price: 1300 }, { month: "Apr 2022", price: 1320 },
      { month: "Jul 2022", price: 1350 }, { month: "Oct 2022", price: 1340 },
      { month: "Jan 2023", price: 1370 }, { month: "Apr 2023", price: 1390 },
      { month: "Jul 2023", price: 1420 }, { month: "Oct 2023", price: 1400 },
      { month: "Jan 2024", price: 1410 }, { month: "Apr 2024", price: 1430 },
      { month: "Jul 2024", price: 1450 }, { month: "Oct 2024", price: 1450 },
    ],
    percentile: 72,
    pros: ["Fully furnished — very convenient", "Prime downtown location", "Highest walk score", "Pet friendly"],
    cons: ["Above historical median price", "No gym in building", "Weekend noise from downtown"],
    sophieSummary: "A premium choice for those who want the ultimate convenience. The furnished aspect saves significant upfront costs, and the location is stellar. However, you are paying a premium above historical averages. Best for those who prioritize lifestyle.",
    images: [],
  },
  {
    id: "4",
    rank: 4,
    name: "Packard Place",
    address: "1520 Packard St, Ann Arbor, MI 48104",
    rent: 950,
    trueCost: 1340,
    matchScore: 79,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 780,
    distanceToCampus: "1.1 mi",
    walkScore: 78,
    hasGym: false,
    hasGrocery: true,
    petFriendly: false,
    amenities: ["Parking", "Air Conditioning", "Dishwasher"],
    description: "A no-frills, well-maintained 2-bedroom apartment on Packard Street. Clean, functional, and close to several bus routes. Great for students who want a straightforward, affordable home base near campus.",
    historicalInsight: "At historical average",
    historicalTrend: "stable",
    historicalPercent: 0,
    costBreakdown: { rent: 950, utilities: 110, transportation: 80, groceries: 200 },
    commute: { driving: "5 min", transit: "15 min", biking: "6 min", walking: "20 min" },
    safety: { score: 7, nearestPolice: "0.6 mi", summary: "Mixed residential and commercial area. Average safety with standard precautions recommended at night." },
    historicalPrices: [
      { month: "Jan 2022", price: 920 }, { month: "Apr 2022", price: 930 },
      { month: "Jul 2022", price: 940 }, { month: "Oct 2022", price: 935 },
      { month: "Jan 2023", price: 945 }, { month: "Apr 2023", price: 950 },
      { month: "Jul 2023", price: 960 }, { month: "Oct 2023", price: 955 },
      { month: "Jan 2024", price: 950 }, { month: "Apr 2024", price: 948 },
      { month: "Jul 2024", price: 952 }, { month: "Oct 2024", price: 950 },
    ],
    percentile: 45,
    pros: ["Stable, predictable pricing", "Good bus route access", "Grocery store nearby", "Affordable 2-bedroom"],
    cons: ["No gym nearby", "No pets", "Basic amenities only"],
    sophieSummary: "A practical, dependable choice. The pricing has been remarkably stable, which suggests fair market value. No surprises here — just a solid, honest nest for a focused student.",
    images: [],
  },
  {
    id: "5",
    rank: 5,
    name: "Willow Creek Commons",
    address: "3200 Washtenaw Ave, Ann Arbor, MI 48104",
    rent: 725,
    trueCost: 1195,
    matchScore: 71,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 550,
    distanceToCampus: "3.2 mi",
    walkScore: 45,
    hasGym: true,
    hasGrocery: false,
    petFriendly: true,
    amenities: ["Pet Friendly", "Parking", "Pool", "Air Conditioning"],
    description: "Budget-friendly living in a suburban setting along Washtenaw Avenue. Features a community pool and small fitness room. Best suited for students with a car, as bus routes are limited in frequency.",
    historicalInsight: "8% below 2023 average",
    historicalTrend: "down",
    historicalPercent: 8,
    costBreakdown: { rent: 725, utilities: 95, transportation: 175, groceries: 200 },
    commute: { driving: "12 min", transit: "40 min", biking: "18 min", walking: "60+ min" },
    safety: { score: 8, nearestPolice: "1.2 mi", summary: "Safe suburban area with low crime rates. Well-maintained roads and good street lighting." },
    historicalPrices: [
      { month: "Jan 2022", price: 700 }, { month: "Apr 2022", price: 710 },
      { month: "Jul 2022", price: 740 }, { month: "Oct 2022", price: 730 },
      { month: "Jan 2023", price: 760 }, { month: "Apr 2023", price: 790 },
      { month: "Jul 2023", price: 800 }, { month: "Oct 2023", price: 780 },
      { month: "Jan 2024", price: 760 }, { month: "Apr 2024", price: 740 },
      { month: "Jul 2024", price: 730 }, { month: "Oct 2024", price: 725 },
    ],
    percentile: 15,
    pros: ["Lowest rent option", "Pet friendly", "Pool access", "Very safe area"],
    cons: ["Far from campus — car recommended", "No nearby grocery store", "Low walk score", "Higher transportation costs offset rent savings"],
    sophieSummary: "The most affordable nest on paper, but do consider the hidden transportation costs. Best if you have a car and don't mind the commute. The pool is a nice touch for unwinding after classes.",
    images: [],
  },
];

export interface AgentInfo {
  id: string;
  name: string;
  character: string;
  role: string;
  color: string;
  emoji: string;
  processingMessage: string;
  completedMessage: string;
}

export const agents: AgentInfo[] = [
  {
    id: "totoro",
    name: "Totoro",
    character: "The Gatherer",
    role: "Intake agent",
    color: "#5B8C5A",
    emoji: "🌳",
    processingMessage: "Hmm, let me understand what you need...",
    completedMessage: "I've gathered all your preferences!",
  },
  {
    id: "calcifer",
    name: "Calcifer",
    character: "The Finder",
    role: "Listing search",
    color: "#C2705B",
    emoji: "🔥",
    processingMessage: "I'm burning through listings for you!",
    completedMessage: "Found 47 listings near campus!",
  },
  {
    id: "kiki",
    name: "Kiki",
    character: "The Explorer",
    role: "Commute analysis",
    color: "#8B5CF6",
    emoji: "🧹",
    processingMessage: "Let me fly over and check the routes!",
    completedMessage: "All commute data mapped out!",
  },
  {
    id: "noface",
    name: "No-Face",
    character: "The Accountant",
    role: "Cost calculator",
    color: "#3B3028",
    emoji: "👤",
    processingMessage: "Ah... ah... calculating everything...",
    completedMessage: "Ah... I've calculated all costs.",
  },
  {
    id: "haku",
    name: "Haku",
    character: "The Guardian",
    role: "Safety analysis",
    color: "#2563EB",
    emoji: "🐉",
    processingMessage: "I'll protect you — scouting the area...",
    completedMessage: "Safety assessment complete.",
  },
  {
    id: "jiji",
    name: "Jiji",
    character: "The Historian",
    role: "Price analysis",
    color: "#1F2937",
    emoji: "🐱",
    processingMessage: "Hmph, let me check my records...",
    completedMessage: "Historical analysis done. Some interesting finds.",
  },
  {
    id: "sophie",
    name: "Sophie",
    character: "The Advisor",
    role: "Final ranking",
    color: "#D4A957",
    emoji: "👵",
    processingMessage: "Let me carefully rank these for you...",
    completedMessage: "Here are my recommendations, dear.",
  },
];

export const howlAgent: AgentInfo = {
  id: "howl",
  name: "Howl",
  character: "The Negotiator",
  role: "Email drafting",
  color: "#6366F1",
  emoji: "✨",
  processingMessage: "Crafting the perfect letter...",
  completedMessage: "They won't be able to resist this one ✨",
};

export const generateNegotiationEmail = (listing: Listing): string => {
  return `Dear Property Manager,

I am writing to express my strong interest in the ${listing.bedrooms}-bedroom apartment at ${listing.address}, currently listed at $${listing.rent}/month.

After conducting thorough market research, I've found that comparable units in the Ann Arbor area have averaged approximately $${Math.round(listing.rent * 0.9)}/month over the past 12 months. Additionally, this unit falls in the ${listing.percentile}th percentile for pricing in this neighborhood, suggesting there may be room for adjustment.

I am a responsible, quiet tenant with excellent references and would be prepared to sign a ${listing.rent > 1200 ? '12' : '14'}-month lease at a rate of $${Math.round(listing.rent * 0.92)}/month, which I believe reflects fair market value while still providing you with a reliable, long-term tenant.

I would love the opportunity to discuss this further. I'm available for a call or meeting at your earliest convenience.

Warm regards,
[Your Name]
[Your Phone]
[Your Email]`;
};
