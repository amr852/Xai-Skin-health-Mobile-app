import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, FontFamily } from '@/constants/theme';

export interface SegmentItem<K extends string> {
  key: K;
  label: string;
  /** Optional small count badge (history filter). */
  count?: number;
}

interface Props<K extends string> {
  items: readonly SegmentItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Optional accent color override; defaults to C.primary. */
  accent?: string;
}

/**
 * iOS-style segmented control — replaces the colored filter pills on history.
 * Single border, equal cells, animated selection slot via background color.
 */
export function SegmentControl<K extends string>({
  items, value, onChange, accent = C.primary,
}: Props<K>) {
  return (
    <View style={s.track}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={({ pressed }) => [
              s.cell,
              active && { backgroundColor: '#FFFFFF', ...s.cellActiveShadow },
              pressed && !active && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            <Text style={[s.label, active && { color: accent }]} numberOfLines={1}>
              {it.label}
            </Text>
            {typeof it.count === 'number' && (
              <Text style={[s.count, active && { color: accent }]}>{it.count}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  cellActiveShadow: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemibold,
    color: C.textSub,
    letterSpacing: 0.1,
  },
  count: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    fontVariant: ['tabular-nums'],
  },
});
