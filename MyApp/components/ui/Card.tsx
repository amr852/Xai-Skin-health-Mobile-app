import React, { ReactNode } from 'react';
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { C, Shadow } from '@/constants/theme';

interface BaseProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Optional press handler. If set, renders as a Pressable. */
  onPress?: () => void;
  /** Disable inner content padding (e.g., for ledger rows). */
  noPadding?: boolean;
}

/**
 * Three deliberate card variants — each with a single home in the system.
 * Do not interchange them. See plan: Card system.
 */

export function StatCard({ children, style, onPress, noPadding }: BaseProps) {
  const content = (
    <View style={[s.stat, !noPadding && { padding: 16 }, style]}>{children}</View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      {content}
    </Pressable>
  ) : content;
}

export function RowCard({ children, style, onPress, noPadding }: BaseProps) {
  const content = (
    <View style={[s.row, !noPadding && { padding: 12 }, style]}>{children}</View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      {content}
    </Pressable>
  ) : content;
}

export function SectionCard({ children, style, onPress, noPadding }: BaseProps) {
  const content = (
    <View style={[s.section, !noPadding && { padding: 20 }, style]}>{children}</View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      {content}
    </Pressable>
  ) : content;
}

const s = StyleSheet.create({
  stat: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...Shadow.xs,
  },
  row: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...Shadow.xs,
  },
  section: {
    backgroundColor: C.surface,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadow.sm,
  },
});

// Keep a barrel export so callers can do `import { Card } from '...'` if they prefer.
export const Card = {
  Stat: StatCard,
  Row: RowCard,
  Section: SectionCard,
};
