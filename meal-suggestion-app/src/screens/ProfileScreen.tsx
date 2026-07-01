import React from 'react';
import { TouchableOpacity, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/theme';
import { useAppContext } from '../context/AppContext';
import BottomNavBar from '../components/BottomNavBar';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { profiles, activeProfileId, setActiveProfileId, activeProfile } = useAppContext();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={typography.title}>Household</Text>

        {profiles.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => setActiveProfileId(p.id)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${p.name}`}
            accessibilityState={{ selected: p.id === activeProfileId }}
            style={[styles.profileCard, p.id === activeProfileId && styles.profileCardActive]}
          >
            <View style={[styles.avatar, { backgroundColor: p.avatarColor }]}>
              <Text style={styles.avatarInitial}>{p.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.meta}>
                {p.dietaryRestrictions.length > 0
                  ? p.dietaryRestrictions.join(', ')
                  : 'No dietary restrictions'}
              </Text>
            </View>
            {p.id === activeProfileId && (
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('DietarySettings')}
          accessibilityRole="button"
          accessibilityLabel={`Edit dietary settings for ${activeProfile.name}`}
        >
          <Ionicons name="settings-outline" size={18} color={colors.accent} />
          <Text style={styles.settingsText}>Edit Dietary Settings</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNavBar active="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl + 80, gap: spacing.md },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  profileCardActive: { borderWidth: 2, borderColor: colors.accentLight },
  avatar: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontWeight: '700', color: colors.accent },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentLightAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  settingsText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
});
