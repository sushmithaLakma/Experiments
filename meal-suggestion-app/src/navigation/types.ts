export type RootStackParamList = {
  Tabs: undefined;
  Home: undefined;
  PantryScanner: undefined;
  DietarySettings: undefined;
  MealSuggestions: undefined;
  RecipeDetail: { recipeId: string };
  Favorites: undefined;
  Profile: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  FavoritesTab: undefined;
  ScanTab: undefined;
  SuggestionsTab: undefined;
  ProfileTab: undefined;
};
