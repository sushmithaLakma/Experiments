import { DietTag, PantryItem, Recipe } from '../types';
import { sampleRecipes, samplePantryItems } from '../data/mockData';

/**
 * Pluggable AI layer. scanPantryPhotos and suggestMeals currently return
 * mocked, latency-simulated results so the UI is fully testable offline.
 * Swap the bodies for real calls to a vision model + recipe-generation
 * endpoint without touching any screen code.
 */

function delay<T>(value: T, ms = 1200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function scanPantryPhotos(photoUris: string[]): Promise<PantryItem[]> {
  if (photoUris.length === 0) return [];
  return delay(samplePantryItems);
}

export async function suggestMeals(params: {
  pantryItems: PantryItem[];
  dietaryRestrictions: DietTag[];
  allergies: string[];
  dislikedIngredients: string[];
}): Promise<Recipe[]> {
  const { dietaryRestrictions, allergies, dislikedIngredients } = params;

  const filtered = sampleRecipes.filter((recipe) => {
    const matchesDiet =
      dietaryRestrictions.length === 0 ||
      dietaryRestrictions.every((tag) => recipe.dietTags.includes(tag));
    const hasAllergen = [...recipe.usedIngredients, ...recipe.missingIngredients].some((ing) =>
      allergies.some((allergen) => ing.toLowerCase().includes(allergen.toLowerCase()))
    );
    const hasDisliked = [...recipe.usedIngredients, ...recipe.missingIngredients].some((ing) =>
      dislikedIngredients.some((d) => ing.toLowerCase().includes(d.toLowerCase()))
    );
    return matchesDiet && !hasAllergen && !hasDisliked;
  });

  return delay(filtered.length > 0 ? filtered : sampleRecipes, 900);
}
