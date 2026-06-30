import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/theme';
import { useAppContext } from '../context/AppContext';
import { suggestMeals } from '../services/aiService';
import RecipeCard from '../components/RecipeCard';
import BottomNavBar from '../components/BottomNavBar';

type Props = NativeStackScreenProps<RootStackParamList, 'MealSuggestions'>;

export default function MealSuggestionsScreen({ navigation }: Props) {
  const { pantryItems, activeProfile, favoriteRecipeIds, toggleFavorite, suggestions, setSuggestions } =
    useAppContext();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const results = await suggestMeals({
        pantryItems,
        dietaryRestrictions: activeProfile.dietaryRestrictions,
        allergies: activeProfile.allergies,
        dislikedIngredients: activeProfile.dislikedIngredients,
      });
      if (!cancelled) {
        setSuggestions(results);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [pantryItems, activeProfile]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.heading}>Meal Suggestions</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>
        Tailored for {activeProfile.name}
        {activeProfile.dietaryRestrictions.length > 0
          ? ` · ${activeProfile.dietaryRestrictions.join(', ')}`
          : ''}
      </Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Finding recipes that match your pantry...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {suggestions.length === 0 ? (
            <Text style={styles.empty}>
              No matches yet. Scan your pantry or adjust your dietary settings.
            </Text>
          ) : (
            suggestions.map((recipe) => (
              <View key={recipe.id} style={styles.listItemWrap}>
                <RecipeCard
                  recipe={recipe}
                  isFavorite={favoriteRecipeIds.includes(recipe.id)}
                  onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                  onToggleFavorite={() => toggleFavorite(recipe.id)}
                  fullWidth
                />
              </View>
            ))
          )}
        </ScrollView>
      )}
      <BottomNavBar active="MealSuggestions" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  list: { padding: spacing.lg, paddingBottom: spacing.xl + 80, gap: spacing.md },
  listItemWrap: { marginBottom: spacing.md },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
