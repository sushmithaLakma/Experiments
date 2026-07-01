import React from 'react';
import { Image, TouchableOpacity, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/theme';
import { sampleRecipes } from '../data/mockData';
import { useAppContext } from '../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const { suggestions, favoriteRecipeIds, toggleFavorite } = useAppContext();
  const recipe =
    suggestions.find((r) => r.id === recipeId) ?? sampleRecipes.find((r) => r.id === recipeId);

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Recipe not found.</Text>
      </SafeAreaView>
    );
  }

  const isFavorite = favoriteRecipeIds.includes(recipe.id);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        <View style={styles.imageWrap}>
          <Image source={{ uri: recipe.image }} style={styles.image} accessibilityLabel={recipe.title} />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => toggleFavorite(recipe.id)}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            style={styles.favButton}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={colors.heart} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={typography.title}>{recipe.title}</Text>
          <Text style={styles.author}>{recipe.author}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{recipe.timeMinutes} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{recipe.servings} servings</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="speedometer-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{recipe.difficulty}</Text>
            </View>
          </View>

          <View style={styles.tagRow}>
            {recipe.dietTags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{tag}</Text>
              </View>
            ))}
            <View style={styles.matchPill}>
              <Text style={styles.matchPillText}>{recipe.matchPercent}% pantry match</Text>
            </View>
          </View>

          <Text style={typography.heading}>From your pantry</Text>
          {recipe.usedIngredients.map((ing) => (
            <View key={ing} style={styles.ingredientRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.ingredientText}>{ing}</Text>
            </View>
          ))}

          {recipe.missingIngredients.length > 0 && (
            <>
              <Text style={[typography.heading, styles.sectionGap]}>You'll also need</Text>
              {recipe.missingIngredients.map((ing) => (
                <View key={ing} style={styles.ingredientRow}>
                  <Ionicons name="add-circle-outline" size={16} color={colors.iconOrange} />
                  <Text style={styles.ingredientText}>{ing}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={[typography.heading, styles.sectionGap]}>Steps</Text>
          {recipe.steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  notFound: { padding: spacing.lg, textAlign: 'center', color: colors.textSecondary },
  imageWrap: { width: '100%', height: 280 },
  image: { width: '100%', height: '100%' },
  backButton: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    backgroundColor: colors.surface,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg },
  author: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.textSecondary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tagPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagPillText: { fontSize: 11, color: colors.textPrimary, fontWeight: '500' },
  matchPill: {
    backgroundColor: colors.accentLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  matchPillText: { fontSize: 11, color: colors.accent, fontWeight: '700' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  ingredientText: { fontSize: 14, color: colors.textPrimary },
  sectionGap: { marginTop: spacing.lg, marginBottom: spacing.sm },
  stepRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: colors.accent },
  stepText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
});
