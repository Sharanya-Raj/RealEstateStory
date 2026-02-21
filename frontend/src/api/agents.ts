import { mockListings, generateNegotiationEmail, type Listing } from "@/data/mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SearchParams {
  university: string;
  budget: number;
  roommates: number;
  hasCar: boolean;
  amenities: string[];
  nearbyPreferences: string[];
  notes: string;
}

export async function fetchListings(params: SearchParams): Promise<Listing[]> {
  // In production, this would call: `${API_BASE_URL}/listings`
  await delay(1500);
  return mockListings.filter((l) => l.rent <= params.budget || params.budget >= 2000);
}

export async function getCommuteData(listingId: string) {
  await delay(800);
  const listing = mockListings.find((l) => l.id === listingId);
  return listing?.commute ?? null;
}

export async function getTrueCost(listingId: string) {
  await delay(800);
  const listing = mockListings.find((l) => l.id === listingId);
  return listing?.costBreakdown ?? null;
}

export async function getSafetyData(listingId: string) {
  await delay(800);
  const listing = mockListings.find((l) => l.id === listingId);
  return listing?.safety ?? null;
}

export async function getHistoricalAnalysis(listingId: string) {
  await delay(800);
  const listing = mockListings.find((l) => l.id === listingId);
  if (!listing) return null;
  return {
    prices: listing.historicalPrices,
    percentile: listing.percentile,
    insight: listing.historicalInsight,
    trend: listing.historicalTrend,
    percent: listing.historicalPercent,
  };
}

export async function generateEmail(listingId: string): Promise<string> {
  await delay(2000);
  const listing = mockListings.find((l) => l.id === listingId);
  if (!listing) return "Listing not found.";
  return generateNegotiationEmail(listing);
}

export async function getListingById(listingId: string): Promise<Listing | null> {
  await delay(300);
  return mockListings.find((l) => l.id === listingId) ?? null;
}
