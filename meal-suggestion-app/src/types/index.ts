export type DietTag =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'low-carb'
  | 'halal'
  | 'kosher'
  | 'pescatarian';

export interface HouseholdProfile {
  id: string;
  name: string;
  avatarColor: string;
  dietaryRestrictions: DietTag[];
  allergies: string[];
  dislikedIngredients: string[];
}

export interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  confidence: number;
  source: 'scan' | 'manual';
}

export interface Recipe {
  id: string;
  title: string;
  author: string;
  image: string;
  timeMinutes: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  dietTags: DietTag[];
  matchPercent: number;
  usedIngredients: string[];
  missingIngredients: string[];
  steps: string[];
  isFavorite?: boolean;
}

export type MealCategory =
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner'
  | 'Snack'
  | 'Cuisine'
  | 'Smoothies'
  | 'Dessert'
  | 'More';
