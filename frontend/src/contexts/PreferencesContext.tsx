import React, { createContext, useContext, useState, ReactNode } from "react";

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

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [aiPayload, setAiPayload] = useState<any | null>(null);

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
