import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

export interface UserPreferences {
  college: string;
  collegeCity: string;
  wantRoommates: boolean;
  roommateCount: number;
  priceMin: number;
  priceMax: number;
  needsParking: boolean;
  amenities: string[];
  maxCommuteMiles: number;
}

interface PreferencesContextType {
  preferences: UserPreferences | null;
  setPreferences: (prefs: UserPreferences) => void;
  selectedListingId: string | null;
  setSelectedListingId: (id: string | null) => void;
  aiPayload: any | null;
  setAiPayload: (payload: any | null) => void;
  agentResults: Record<string, any>;
  setAgentResult: (listingId: string, data: any) => void;
  setBatchAgentResults: (results: any[]) => void;
  getAgentResult: (listingId: string) => any | null;
  cachedListings: Record<string, any[]>;
  setCachedListings: (college: string, listings: any[]) => void;
  getCachedListings: (college: string) => any[] | null;
  mockMode: boolean;
  setMockMode: (mode: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const PREFS_KEY = "spirited_oracle_prefs";
const LISTING_ID_KEY = "spirited_oracle_listing_id";
const MOCK_MODE_KEY = "spirited_oracle_mock_mode";

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferencesState] = useState<UserPreferences | null>(() => {
    const saved = localStorage.getItem(PREFS_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [selectedListingId, setSelectedListingIdState] = useState<string | null>(() => {
    return localStorage.getItem(LISTING_ID_KEY);
  });
  
  const [mockMode, setMockModeState] = useState<boolean>(() => {
    return localStorage.getItem(MOCK_MODE_KEY) === "true";
  });

  const [aiPayload, setAiPayload] = useState<any | null>(null);
  const [agentResults, setAgentResults] = useState<Record<string, any>>({});
  const [cachedListings, setCachedListingsState] = useState<Record<string, any[]>>({});

  const setAgentResult = useCallback((listingId: string, data: any) => {
    setAgentResults(prev => ({ ...prev, [listingId]: data }));
  }, []);

  const setBatchAgentResults = useCallback((results: any[]) => {
    const map: Record<string, any> = {};
    for (const r of results) {
      if (r?.id) map[r.id] = r;
    }
    setAgentResults(prev => ({ ...prev, ...map }));
  }, []);

  const getAgentResult = useCallback((listingId: string) => agentResults[listingId] ?? null, [agentResults]);

  const setCachedListings = useCallback((college: string, listings: any[]) => {
    setCachedListingsState(prev => ({ ...prev, [college]: listings }));
  }, []);

  const getCachedListings = useCallback((college: string) => cachedListings[college] ?? null, [cachedListings]);

  const setPreferences = (prefs: UserPreferences) => {
    setPreferencesState(prefs);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  };

  const setSelectedListingId = (id: string | null) => {
    setSelectedListingIdState(id);
    if (id) localStorage.setItem(LISTING_ID_KEY, id);
    else localStorage.removeItem(LISTING_ID_KEY);
  };

  const setMockMode = (mode: boolean) => {
    setMockModeState(mode);
    localStorage.setItem(MOCK_MODE_KEY, String(mode));
  };

  return (
    <PreferencesContext.Provider value={{ preferences, setPreferences, selectedListingId, setSelectedListingId, aiPayload, setAiPayload, agentResults, setAgentResult, setBatchAgentResults, getAgentResult, cachedListings, setCachedListings, getCachedListings, mockMode, setMockMode }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
};
