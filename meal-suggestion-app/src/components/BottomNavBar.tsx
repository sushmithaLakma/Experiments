import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type TabKey = 'Home' | 'Favorites' | 'PantryScanner' | 'MealSuggestions' | 'Profile';

const TABS: { key: TabKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Home', icon: 'home' },
  { key: 'Favorites', icon: 'heart' },
  { key: 'PantryScanner', icon: 'add-circle' },
  { key: 'MealSuggestions', icon: 'grid' },
  { key: 'Profile', icon: 'person' },
];

export default function BottomNavBar({ active }: { active: TabKey }) {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => navigation.navigate(tab.key as any)}
            accessibilityRole="tab"
            accessibilityLabel={tab.key}
            accessibilityState={{ selected: isActive }}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
          >
            <Ionicons
              name={tab.icon}
              size={tab.key === 'PantryScanner' ? 26 : 20}
              color={isActive ? colors.accent : '#FFFFFF'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.tabBarBackground,
    borderRadius: radius.pill,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tabButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.accentLight,
  },
});
