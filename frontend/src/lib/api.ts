/**
 * Centralized API client for The Spirited Oracle
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const COLLEGE_SCRAPER_NAMES: Record<string, string> = {
  "Rutgers University - New Brunswick": "Rutgers New Brunswick",
  "Rutgers University - Newark": "Rutgers Newark",
  "Rutgers University - Camden": "Rutgers Camden",
  "New Jersey Institute of Technology (NJIT)": "NJIT",
  "The College of New Jersey (TCNJ)": "The College of New Jersey",
};

export function getScraperName(college: string): string {
  return COLLEGE_SCRAPER_NAMES[college] || college;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const api = {
  /**
   * Fetch all listings with optional filters.
   * Always hits live scrapers first; backend falls back to CSV only if they fail.
   */
  getListings: async (params?: { college?: string; radius?: number; max_price?: number }) => {
    const url = new URL(`${API_BASE_URL}/api/listings`);
    if (params) {
      if (params.college) url.searchParams.set("college", params.college);
      if (params.radius) url.searchParams.set("radius", String(params.radius));
      if (params.max_price) url.searchParams.set("max_price", String(params.max_price));
    }
    const response = await fetch(url.toString());
    return handleResponse(response);
  },

  /**
   * Fetch a single listing by ID
   */
  getListing: async (id: string) => {
    const url = new URL(`${API_BASE_URL}/api/listings/${id}`);
    const response = await fetch(url.toString());
    return handleResponse(response);
  },

  /**
   * Perform market fairness analysis
   */
  checkFairness: async (data: { listing_id: string; listing_rent: number; zip_code: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/fairness`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Evaluate a listing through the Ghibli agent pipeline
   */
  evaluateListing: async (data: { 
    address: string; 
    budget: number; 
    mock_data?: any; 
    college?: string 
  }) => {
    const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Batch-evaluate multiple listings through the agent pipeline
   */
  evaluateBatch: async (data: {
    listings: any[];
    budget: number;
    college?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/api/evaluate-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Full pipeline: scrape listings → run agents → return combined results.
   * Listings are only returned after all agent analysis is complete.
   */
  runPipeline: async (data: {
    college: string;
    budget: number;
    roommates?: string;
    parking?: string;
    max_distance_miles?: number;
    mock?: boolean;
  }) => {
    const response = await fetch(`${API_BASE_URL}/api/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Chat with Howl about a listing
   */
  chat: async (data: { listing_id: string; question: string; listing_context?: any }) => {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Get the URL for the TTS endpoint
   */
  getVoiceUrl: (text: string, agentType: string = "default") => {
    return `${API_BASE_URL}/api/tts?text=${encodeURIComponent(text)}&agent=${encodeURIComponent(agentType)}`;
  },
};
