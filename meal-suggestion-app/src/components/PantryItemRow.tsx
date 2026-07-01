import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PantryItem } from '../types';
import { colors, radius, spacing } from '../theme/theme';

interface Props {
  item: PantryItem;
  onRemove: () => void;
}

export default function PantryItemRow({ item, onRemove }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`${item.name}, ${item.category}`}>
      <View style={styles.iconWrap}>
        <Ionicons name="basket-outline" size={18} color={colors.accent} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.category}
          {item.quantity ? ` · ${item.quantity}` : ''} · {Math.round(item.confidence * 100)}% confident
        </Text>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name} from pantry`}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accentLightAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
