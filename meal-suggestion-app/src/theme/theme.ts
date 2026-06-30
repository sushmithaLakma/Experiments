export const colors = {
  background: '#EDEDED',
  surface: '#FFFFFF',
  textPrimary: '#1F2E22',
  textSecondary: '#6B7066',
  accent: '#1F3A28',
  accentLight: '#CBE08A',
  accentLightAlt: '#DCEBB0',
  iconOrange: '#E2A93B',
  heart: '#E0473C',
  border: '#E4E4E1',
  tabBarBackground: '#1C1C1A',
  tabIconInactive: '#9A9A95',
  danger: '#D6453D',
  success: '#3F7D4F',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.accent },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.accent },
  subheading: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.textPrimary },
  caption: { fontSize: 12, fontWeight: '400' as const, color: colors.textSecondary },
};
