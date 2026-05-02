import React from 'react';
import { View, StyleSheet } from 'react-native';
import { C } from '@/constants/theme';

type Status = 'Stable' | 'Check' | 'Urgent';

interface Props {
  status: Status;
  /** Edge to anchor against. Default 'left'. */
  edge?: 'left' | 'top';
  /** Length in px of the painted arc. Default fills its container. */
  length?: number | '100%';
  /** Stroke thickness. Default 3. */
  thickness?: number;
}

const COLOR: Record<Status, string> = {
  Stable: '#16A34A',
  Check:  '#D97706',
  Urgent: '#DC2626',
};

/**
 * Leading-edge data-encoding bar — replaces the rose left-bar on history
 * cards. Status color is the only signal; pure information, no decoration.
 */
export function StatusArc({ status, edge = 'left', length = '100%', thickness = 3 }: Props) {
  const color = COLOR[status] ?? C.primary;
  const isLeft = edge === 'left';

  return (
    <View
      style={[
        s.bar,
        {
          backgroundColor: color,
          width:  isLeft ? thickness : length,
          height: isLeft ? length    : thickness,
          ...(isLeft
            ? { borderTopRightRadius: thickness / 2, borderBottomRightRadius: thickness / 2 }
            : { borderBottomLeftRadius: thickness / 2, borderBottomRightRadius: thickness / 2 }),
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
