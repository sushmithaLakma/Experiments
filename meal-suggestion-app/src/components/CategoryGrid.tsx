import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mealCategories } from '../data/mockData';
import { colors, radius, spacing } from '../theme/theme';

interface Props {
  selected: string;
  onSelect: (key: string) => void;
}

export default function CategoryGrid({ selected, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {mealCategories.map((cat) => {
        const isActive = selected === cat.key;
        return (
          <Pressable
            key={cat.key}
            onPress={() => onSelect(cat.key)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${cat.key}`}
            accessibilityState={{ selected: isActive }}
            style={[styles.tile, isActive && styles.tileActive]}
          >
            <Ionicons
              name={cat.icon as any}
              size={22}
              color={isActive ? colors.accent : colors.iconOrange}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{cat.key}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '23.5%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    gap: 6,
  },
  tileActive: {
    backgroundColor: colors.accentLight,
  },
  label: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
});
