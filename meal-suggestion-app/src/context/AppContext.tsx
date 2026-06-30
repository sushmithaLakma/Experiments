import React, { createContext, useContext, useMemo, useState } from 'react';
import { HouseholdProfile, PantryItem, Recipe } from '../types';
import { defaultProfiles } from '../data/mockData';

interface AppContextValue {
  profiles: HouseholdProfile[];
  activeProfileId: string;
  activeProfile: HouseholdProfile;
  setActiveProfileId: (id: string) => void;
  updateProfile: (profile: HouseholdProfile) => void;
  addProfile: (profile: HouseholdProfile) => void;
  pantryItems: PantryItem[];
  setPantryItems: (items: PantryItem[]) => void;
  favoriteRecipeIds: string[];
  toggleFavorite: (recipeId: string) => void;
  suggestions: Recipe[];
  setSuggestions: (recipes: Recipe[]) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<HouseholdProfile[]>(defaultProfiles);
  const [activeProfileId, setActiveProfileId] = useState(defaultProfiles[0].id);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? profiles[0],
    [profiles, activeProfileId]
  );

  function updateProfile(updated: HouseholdProfile) {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function addProfile(profile: HouseholdProfile) {
    setProfiles((prev) => [...prev, profile]);
  }

  function toggleFavorite(recipeId: string) {
    setFavoriteRecipeIds((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
    );
  }

  const value: AppContextValue = {
    profiles,
    activeProfileId,
    activeProfile,
    setActiveProfileId,
    updateProfile,
    addProfile,
    pantryItems,
    setPantryItems,
    favoriteRecipeIds,
    toggleFavorite,
    suggestions,
    setSuggestions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
