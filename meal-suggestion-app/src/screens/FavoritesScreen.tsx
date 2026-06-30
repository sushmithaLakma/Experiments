import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme/theme';
import { useAppContext } from '../context/AppContext';
import { sampleRecipes } from '../data/mockData';
import RecipeCard from '../components/RecipeCard';
import BottomNavBar from '../components/BottomNavBar';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export default function FavoritesScreen({ navigation }: Props) {
  const { favoriteRecipeIds, toggleFavorite, suggestions } = useAppContext();
  const pool = [...sampleRecipes, ...suggestions];
  const favorites = pool.filter(
    (r, idx, arr) => favoriteRecipeIds.includes(r.id) && arr.findIndex((x) => x.id === r.id) === idx
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={typography.title}>Favorites</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {favorites.length === 0 ? (
          <Text style={styles.empty}>Tap the heart on a recipe to save it here.</Text>
        ) : (
          favorites.map((recipe) => (
            <View key={recipe.id} style={styles.itemWrap}>
              <RecipeCard
                recipe={recipe}
                isFavorite
                onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                onToggleFavorite={() => toggleFavorite(recipe.id)}
                fullWidth
              />
            </View>
          ))
        )}
      </ScrollView>
      <BottomNavBar active="Favorites" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl + 80 },
  itemWrap: { marginBottom: spacing.md },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
