import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, FontFamily, Radius } from '@/constants/theme';

type Props = {
  lesionCount: number;
  selected: 'all' | number;
  onSelect: (value: 'all' | number) => void;
};

export function LesionFilterBar({ lesionCount, selected, onSelect }: Props) {
  if (lesionCount < 2) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={() => onSelect('all')}
          activeOpacity={0.85}
          style={[styles.chip, selected === 'all' ? styles.chipOn : styles.chipOff]}>
          <Text style={[styles.chipTxt, selected === 'all' ? styles.chipTxtOn : styles.chipTxtOff]}>All</Text>
        </TouchableOpacity>
        {Array.from({ length: lesionCount }, (_, i) => {
          const n = i + 1;
          const on = selected === n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onSelect(n)}
              activeOpacity={0.85}
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
              <Text style={[styles.chipTxt, on ? styles.chipTxtOn : styles.chipTxtOff]}>Lesion {n}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  scroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.25,
  },
  chipOn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipOff: {
    backgroundColor: C.surface,
    borderColor: C.border,
  },
  chipTxt: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemibold,
    letterSpacing: 0.2,
  },
  chipTxtOn: {
    color: C.white,
  },
  chipTxtOff: {
    color: C.text,
  },
});
