import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/theme';
import CategoryGrid from '../components/CategoryGrid';
import RecipeCard from '../components/RecipeCard';
import { useAppContext } from '../context/AppContext';
import { sampleRecipes } from '../data/mockData';
import BottomNavBar from '../components/BottomNavBar';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { activeProfile, favoriteRecipeIds, toggleFavorite } = useAppContext();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Dinner');

  const trending = sampleRecipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.profileRow}
            onPress={() => navigation.navigate('DietarySettings')}
            accessibilityRole="button"
            accessibilityLabel="Open profile and dietary settings"
          >
            <View style={[styles.avatar, { backgroundColor: activeProfile.avatarColor }]}>
              <Text style={styles.avatarInitial}>{activeProfile.name[0]}</Text>
            </View>
            <Text style={styles.profileName}>{activeProfile.name}</Text>
          </Pressable>
          <Pressable
            style={styles.bell}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Text style={typography.title}>What's cooking today?</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search here"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search recipes"
          />
        </View>

        <CategoryGrid selected={selectedCategory} onSelect={setSelectedCategory} />

        <Text style={[typography.heading, styles.sectionTitle]}>Trending Recipe</Text>
        <FlatList
          data={trending}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              isFavorite={favoriteRecipeIds.includes(item.id)}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          )}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
        />

        <Pressable
          style={styles.scanCta}
          onPress={() => navigation.navigate('PantryScanner')}
          accessibilityRole="button"
          accessibilityLabel="Scan your fridge or pantry"
        >
          <Ionicons name="camera" size={22} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>Scan your fridge</Text>
            <Text style={styles.scanSubtitle}>Snap a photo to get personalized meal ideas</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.accent} />
        </Pressable>
      </ScrollView>
      <BottomNavBar active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl + 80 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontWeight: '700', color: colors.accent },
  profileName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  bell: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 48,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.md },
  scanCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentLightAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  scanTitle: { fontSize: 15, fontWeight: '700', color: colors.accent },
  scanSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
