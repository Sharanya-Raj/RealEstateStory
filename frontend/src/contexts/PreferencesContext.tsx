import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

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
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const PREFS_KEY = "spirited_oracle_prefs";
const LISTING_ID_KEY = "spirited_oracle_listing_id";

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferencesState] = useState<UserPreferences | null>(() => {
    const saved = localStorage.getItem(PREFS_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [selectedListingId, setSelectedListingIdState] = useState<string | null>(() => {
    return localStorage.getItem(LISTING_ID_KEY);
  });

  const [aiPayload, setAiPayload] = useState<any | null>(null);

  const setPreferences = (prefs: UserPreferences) => {
    setPreferencesState(prefs);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  };

  const setSelectedListingId = (id: string | null) => {
    setSelectedListingIdState(id);
    if (id) localStorage.setItem(LISTING_ID_KEY, id);
    else localStorage.removeItem(LISTING_ID_KEY);
  };

  return (
    <PreferencesContext.Provider value={{ preferences, setPreferences, selectedListingId, setSelectedListingId, aiPayload, setAiPayload }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
};
