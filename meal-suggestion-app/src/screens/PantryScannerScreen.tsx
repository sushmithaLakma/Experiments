import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/theme';
import { scanPantryPhotos } from '../services/aiService';
import { useAppContext } from '../context/AppContext';
import PantryItemRow from '../components/PantryItemRow';

type Props = NativeStackScreenProps<RootStackParamList, 'PantryScanner'>;

export default function PantryScannerScreen({ navigation }: Props) {
  const { pantryItems, setPantryItems } = useAppContext();
  const [photos, setPhotos] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickFromCamera() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to scan your pantry.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function handlePickFromLibrary() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload pantry photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }

  async function handleScan() {
    if (photos.length === 0) {
      setError('Add at least one photo of your fridge or pantry to scan.');
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const items = await scanPantryPhotos(photos);
      setPantryItems(items);
    } catch (e) {
      setError('Something went wrong scanning your photos. Please try again.');
    } finally {
      setScanning(false);
    }
  }

  function removeItem(id: string) {
    setPantryItems(pantryItems.filter((item) => item.id !== id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={typography.heading}>Pantry Scanner</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={[typography.body, styles.intro]}>
          Take a photo of your fridge or pantry shelves and we'll identify what's inside.
        </Text>

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionButton}
            onPress={handlePickFromCamera}
            accessibilityRole="button"
            accessibilityLabel="Take a photo with camera"
          >
            <Ionicons name="camera" size={22} color={colors.accent} />
            <Text style={styles.actionLabel}>Camera</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={handlePickFromLibrary}
            accessibilityRole="button"
            accessibilityLabel="Upload photos from library"
          >
            <Ionicons name="images" size={22} color={colors.accent} />
            <Text style={styles.actionLabel}>Upload</Text>
          </Pressable>
        </View>

        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        {photos.length > 0 && (
          <ScrollView horizontal style={styles.photoRow} showsHorizontalScrollIndicator={false}>
            {photos.map((uri) => (
              <View key={uri} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} accessibilityLabel="Pantry photo" />
                <Pressable
                  style={styles.removePhoto}
                  onPress={() => removePhoto(uri)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <Pressable
          style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
          onPress={handleScan}
          disabled={scanning}
          accessibilityRole="button"
          accessibilityLabel="Scan pantry photos"
        >
          {scanning ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.scanButtonText}>Scan Inventory</Text>
          )}
        </Pressable>

        {pantryItems.length > 0 && (
          <>
            <Text style={[typography.heading, styles.sectionTitle]}>
              Detected Items ({pantryItems.length})
            </Text>
            {pantryItems.map((item) => (
              <PantryItemRow key={item.id} item={item} onRemove={() => removeItem(item.id)} />
            ))}
            <Pressable
              style={styles.continueButton}
              onPress={() => navigation.navigate('MealSuggestions')}
              accessibilityRole="button"
              accessibilityLabel="Get meal suggestions from pantry"
            >
              <Text style={styles.continueText}>Get Meal Suggestions</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.surface} />
            </Pressable>
          </>
        )}
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
  intro: { marginBottom: spacing.lg, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  photoRow: { marginBottom: spacing.md },
  photoThumbWrap: { marginRight: spacing.sm },
  photoThumb: { width: 80, height: 80, borderRadius: radius.md },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.textPrimary,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  scanButtonDisabled: { opacity: 0.7 },
  scanButtonText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  continueButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  continueText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
});
