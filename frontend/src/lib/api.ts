/**
 * Centralized API client for The Spirited Oracle
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

const getMockMode = () => localStorage.getItem("spirited_oracle_mock_mode") === "true";

export const api = {
  /**
   * Fetch all listings with optional filters
   */
  getListings: async (params?: { college?: string; radius?: number; max_price?: number }) => {
    const url = new URL(`${API_BASE_URL}/api/listings`);
    if (params) {
      if (params.college) url.searchParams.set("college", params.college);
      if (params.radius) url.searchParams.set("radius", String(params.radius));
      if (params.max_price) url.searchParams.set("max_price", String(params.max_price));
    }
    if (getMockMode()) url.searchParams.set("mock", "true");
    const response = await fetch(url.toString());
    return handleResponse(response);
  },

  /**
   * Fetch a single listing by ID
   */
  getListing: async (id: string) => {
    const url = new URL(`${API_BASE_URL}/api/listings/${id}`);
    if (getMockMode()) url.searchParams.set("mock", "true");
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
      body: JSON.stringify({ ...data, mock: getMockMode() }),
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
      body: JSON.stringify({ ...data, mock: getMockMode() }),
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
      body: JSON.stringify({ ...data, mock: getMockMode() }),
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
