import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types';
import { colors, radius, spacing } from '../theme/theme';

interface Props {
  recipe: Recipe;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  width?: number;
  fullWidth?: boolean;
}

export default function RecipeCard({
  recipe,
  isFavorite,
  onPress,
  onToggleFavorite,
  width = 220,
  fullWidth = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open recipe ${recipe.title}`}
      style={[styles.card, fullWidth ? { width: '100%' } : { width }]}
    >
      <Image source={{ uri: recipe.image }} style={styles.image} accessibilityLabel={recipe.title} />
      <Pressable
        onPress={onToggleFavorite}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        hitSlop={10}
        style={styles.heartButton}
      >
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={colors.heart} />
      </Pressable>
      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={1}>
          {recipe.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {recipe.author}
        </Text>
      </View>
      <View style={styles.matchBadge}>
        <Text style={styles.matchText}>{recipe.matchPercent}% match</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 260,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heartButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  author: {
    color: '#EDEDED',
    fontSize: 12,
    marginTop: 2,
  },
});
