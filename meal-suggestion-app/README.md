# Pantry AI — Meal Suggestion App

A mobile-first (iOS/Android) home cooking assistant built with Expo + React Native + TypeScript. Users photograph their fridge/pantry, the app identifies inventory, filters recipes against household dietary preferences, and surfaces personalized meal suggestions.

## Features

- **Camera & photo upload** (`src/screens/PantryScannerScreen.tsx`) — capture or pick pantry/fridge photos via `expo-image-picker`.
- **Pantry scanner** — photos are sent through a pluggable AI layer (`src/services/aiService.ts`) that returns detected items; swap the mock implementation for a real vision model without touching any screen.
- **Dietary settings form** (`src/screens/DietarySettingsScreen.tsx`) — per-profile diet tags, allergies, and disliked ingredients.
- **Multiple household profiles** — managed in `src/context/AppContext.tsx`, switchable from Dietary Settings and the Profile tab.
- **Meal suggestions list & recipe cards** — recipes are filtered against the active profile's restrictions/allergies/dislikes and ranked by pantry match %.
- **Recipe detail** — ingredients you have vs. need, steps, diet tags.
- **Favorites** — heart any recipe card to save it.
- Accessible UI: every interactive element has `accessibilityRole`/`accessibilityLabel`, live region for scan errors, and `accessibilityState` for selection.

## Tech stack

- Expo SDK 56, React Native 0.85, TypeScript
- React Navigation (native-stack) for screen flow, plus a custom bottom tab bar matching the visual reference
- `expo-image-picker` / `expo-camera` for photo capture
- Mocked AI service layer, designed to be swapped for a real vision/recipe API

## Project structure

```
src/
  components/   RecipeCard, CategoryGrid, PantryItemRow, BottomNavBar
  context/      AppContext (profiles, pantry, favorites, suggestions)
  data/         mock household profiles, pantry items, recipes
  navigation/   RootNavigator + route types
  screens/      Home, PantryScanner, DietarySettings, MealSuggestions, RecipeDetail, Favorites, Profile
  services/     aiService.ts (scanPantryPhotos, suggestMeals)
  theme/        shared colors, spacing, typography
  types/        shared TypeScript types
```

## Running

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `a`/`i` for a simulator.

## Wiring up real AI

Replace the bodies of `scanPantryPhotos` and `suggestMeals` in `src/services/aiService.ts` with calls to:
- A vision model (e.g. image captioning/object detection) for pantry item recognition.
- A recipe-generation/recommendation endpoint that accepts pantry items + dietary constraints.

No other code needs to change — both functions already have the request/response shape the rest of the app expects.
