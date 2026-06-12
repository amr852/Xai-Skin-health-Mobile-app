import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { C, FontFamily, Radius, Shadow } from '@/constants/theme';

const STATUS_STAGES = [
  'Uploading image…',
  'Detecting lesions…',
  'Classifying regions…',
  'Generating XAI map…',
  'Finalizing results…',
] as const;

type Props = {
  active: boolean;
};

export function ScanReviewLoading({ active }: Props) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [active, pulse]);

  useEffect(() => {
    if (!active) {
      setStage(0);
      setElapsed(0);
      return;
    }
    const stageId = setInterval(() => {
      setStage(s => Math.min(s + 1, STATUS_STAGES.length - 1));
    }, 4500);
    const tickId = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => {
      clearInterval(stageId);
      clearInterval(tickId);
    };
  }, [active]);

  if (!active) return null;

  const opacityAnim = pulse;
  const slowHint = elapsed >= 25;

  return (
    <View style={styles.wrap}>
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.logoBackdrop}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Animated.View style={[styles.card, { opacity: opacityAnim }]}>
        <View style={styles.shimmerRow}>
          <View style={[styles.shimmerBlock, { flex: 1 }]} />
        </View>
        <View style={styles.shimmerRow}>
          <View style={[styles.shimmerBlock, { width: '72%' }]} />
        </View>
        <View style={styles.shimmerRow}>
          <View style={[styles.shimmerBlock, { width: '48%', height: 110, borderRadius: Radius.md }]} />
          <View style={[styles.shimmerBlock, { flex: 1, height: 110, borderRadius: Radius.md }]} />
        </View>
      </Animated.View>
      <Text style={styles.status}>
        {STATUS_STAGES[stage]} <Text style={styles.elapsed}>· {elapsed}s</Text>
      </Text>
      {slowHint ? (
        <Text style={styles.subHint}>
          Larger photos can take up to a minute to fully analyze. Keep this screen open.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  logoBackdrop: {
    position: 'absolute',
    alignSelf: 'center',
    top: 8,
    width: 112,
    height: 112,
    opacity: 0.1,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: C.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: C.borderLight,
    padding: 20,
    gap: 12,
    ...(Platform.OS === 'ios' ? Shadow.sm : {}),
  },
  shimmerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shimmerBlock: {
    height: 14,
    borderRadius: Radius.sm,
    backgroundColor: C.primaryLight,
  },
  status: {
    marginTop: 18,
    fontSize: 15,
    fontFamily: FontFamily.bodyMedium,
    color: C.primary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  elapsed: {
    fontFamily: FontFamily.body,
    color: C.textHint,
  },
  subHint: {
    marginTop: 8,
    paddingHorizontal: 16,
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
    textAlign: 'center',
    lineHeight: 17,
  },
});
