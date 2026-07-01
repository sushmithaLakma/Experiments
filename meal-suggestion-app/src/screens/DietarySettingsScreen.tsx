import React, { useState } from 'react';
import {
  TouchableOpacity,
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
import { useAppContext } from '../context/AppContext';
import { DietTag, HouseholdProfile } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DietarySettings'>;

const ALL_DIET_TAGS: DietTag[] = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'low-carb',
  'halal',
  'kosher',
  'pescatarian',
];

const AVATAR_COLORS = ['#CBE08A', '#E2A93B', '#9AD0C2', '#E0A6A6', '#A6B8E0'];

export default function DietarySettingsScreen({ navigation }: Props) {
  const { profiles, activeProfileId, setActiveProfileId, updateProfile, addProfile } =
    useAppContext();
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  const [name, setName] = useState(activeProfile.name);
  const [allergyInput, setAllergyInput] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');
  const [draft, setDraft] = useState<HouseholdProfile>(activeProfile);

  function switchProfile(id: string) {
    setActiveProfileId(id);
    const p = profiles.find((pr) => pr.id === id);
    if (p) {
      setDraft(p);
      setName(p.name);
    }
  }

  function toggleDiet(tag: DietTag) {
    setDraft((d) => ({
      ...d,
      dietaryRestrictions: d.dietaryRestrictions.includes(tag)
        ? d.dietaryRestrictions.filter((t) => t !== tag)
        : [...d.dietaryRestrictions, tag],
    }));
  }

  function addAllergy() {
    if (!allergyInput.trim()) return;
    setDraft((d) => ({ ...d, allergies: [...d.allergies, allergyInput.trim()] }));
    setAllergyInput('');
  }

  function removeAllergy(value: string) {
    setDraft((d) => ({ ...d, allergies: d.allergies.filter((a) => a !== value) }));
  }

  function addDislike() {
    if (!dislikeInput.trim()) return;
    setDraft((d) => ({ ...d, dislikedIngredients: [...d.dislikedIngredients, dislikeInput.trim()] }));
    setDislikeInput('');
  }

  function removeDislike(value: string) {
    setDraft((d) => ({
      ...d,
      dislikedIngredients: d.dislikedIngredients.filter((i) => i !== value),
    }));
  }

  function handleSave() {
    updateProfile({ ...draft, name: name.trim() || draft.name });
    navigation.goBack();
  }

  function handleAddProfile() {
    const id = `p${Date.now()}`;
    const newProfile: HouseholdProfile = {
      id,
      name: 'New Member',
      avatarColor: AVATAR_COLORS[profiles.length % AVATAR_COLORS.length],
      dietaryRestrictions: [],
      allergies: [],
      dislikedIngredients: [],
    };
    addProfile(newProfile);
    switchProfile(id);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={typography.heading}>Dietary Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.label}>Household Profiles</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileScroll}>
          {profiles.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => switchProfile(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${p.name}'s profile`}
              accessibilityState={{ selected: p.id === activeProfileId }}
              style={[
                styles.profileChip,
                p.id === activeProfileId && styles.profileChipActive,
              ]}
            >
              <View style={[styles.chipAvatar, { backgroundColor: p.avatarColor }]} />
              <Text style={styles.chipName}>{p.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={handleAddProfile}
            accessibilityRole="button"
            accessibilityLabel="Add household member"
            style={styles.addProfileChip}
          >
            <Ionicons name="add" size={20} color={colors.accent} />
          </TouchableOpacity>
        </ScrollView>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          accessibilityLabel="Profile name"
          placeholder="Profile name"
        />

        <Text style={styles.label}>Dietary Restrictions</Text>
        <View style={styles.tagWrap}>
          {ALL_DIET_TAGS.map((tag) => {
            const active = draft.dietaryRestrictions.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleDiet(tag)}
                accessibilityRole="button"
                accessibilityLabel={`Toggle ${tag}`}
                accessibilityState={{ selected: active }}
                style={[styles.tag, active && styles.tagActive]}
              >
                <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Allergies</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={allergyInput}
            onChangeText={setAllergyInput}
            placeholder="e.g. peanuts"
            accessibilityLabel="Add allergy"
            onSubmitEditing={addAllergy}
          />
          <TouchableOpacity
            onPress={addAllergy}
            accessibilityRole="button"
            accessibilityLabel="Add allergy"
            style={styles.addButton}
          >
            <Ionicons name="add" size={20} color={colors.surface} />
          </TouchableOpacity>
        </View>
        <View style={styles.tagWrap}>
          {draft.allergies.map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => removeAllergy(a)}
              accessibilityRole="button"
              accessibilityLabel={`Remove allergy ${a}`}
              style={[styles.tag, styles.removableTag]}
            >
              <Text style={styles.tagText}>{a}</Text>
              <Ionicons name="close" size={12} color={colors.textPrimary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Disliked Ingredients</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={dislikeInput}
            onChangeText={setDislikeInput}
            placeholder="e.g. cilantro"
            accessibilityLabel="Add disliked ingredient"
            onSubmitEditing={addDislike}
          />
          <TouchableOpacity
            onPress={addDislike}
            accessibilityRole="button"
            accessibilityLabel="Add disliked ingredient"
            style={styles.addButton}
          >
            <Ionicons name="add" size={20} color={colors.surface} />
          </TouchableOpacity>
        </View>
        <View style={styles.tagWrap}>
          {draft.dislikedIngredients.map((i) => (
            <TouchableOpacity
              key={i}
              onPress={() => removeDislike(i)}
              accessibilityRole="button"
              accessibilityLabel={`Remove disliked ingredient ${i}`}
              style={[styles.tag, styles.removableTag]}
            >
              <Text style={styles.tagText}>{i}</Text>
              <Ionicons name="close" size={12} color={colors.textPrimary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save dietary settings"
        >
          <Text style={styles.saveText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  profileScroll: { flexDirection: 'row' },
  profileChip: {
    alignItems: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  profileChipActive: { backgroundColor: colors.accentLight },
  chipAvatar: { width: 32, height: 32, borderRadius: radius.pill },
  chipName: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  addProfileChip: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.textPrimary,
  },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: { backgroundColor: colors.accentLight, borderColor: colors.accentLight },
  tagText: { fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
  tagTextActive: { color: colors.accent, fontWeight: '700' },
  removableTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
});
