import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <View style={[styles.card, fullWidth ? { width: '100%' } : { width }]}>
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open recipe ${recipe.title}`}
        style={StyleSheet.absoluteFill}
        activeOpacity={0.88}
      />
      <Image source={{ uri: recipe.image }} style={styles.image} accessibilityLabel={recipe.title} />
      <TouchableOpacity
        onPress={onToggleFavorite}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.heartButton}
        activeOpacity={0.7}
      >
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={colors.heart} />
      </TouchableOpacity>
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
    </View>
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
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
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
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  author: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
