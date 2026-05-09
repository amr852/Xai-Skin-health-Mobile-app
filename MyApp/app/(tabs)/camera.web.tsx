import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { C, FontFamily, Gradient, Space, Radius, Shadow } from '@/constants/theme';
import { BottomTabBar, type NavKey } from '@/components/ui/BottomTabBar';

export default function CameraScreenWeb() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<NavKey>('scan');

  const handleNav = (key: NavKey) => {
    if (key === 'home') router.push('/');
    else if (key === 'history') router.push('/history');
    else if (key === 'profile') router.push('/profile');
    else setActiveNav(key);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <LinearGradient
        colors={[...Gradient.floralBand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBand}>
        <Feather name="camera" size={28} color={C.primary} style={{ marginBottom: 8 }} />
        <Text style={styles.heroEyebrow}>Scan</Text>
        <Text style={styles.heroTitle}>Camera on this device</Text>
        <Text style={styles.heroBody}>
          Live capture runs on iOS and Android. On web you can still review records and profile.
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <Feather name="smartphone" size={56} color={C.textHint} />
        <Text style={styles.permissionTitle}>Use the mobile app to scan</Text>
        <Text style={styles.permissionText}>
          Open Xai Skin Health on your phone for the full camera workflow, multi-region analysis, and save flow.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/history')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open records">
          <Text style={styles.primaryBtnTxt}>View records</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Go home">
          <Text style={styles.secondaryBtnTxt}>Back to home</Text>
        </TouchableOpacity>
      </View>

      <BottomTabBar active={activeNav} onPress={handleNav} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  heroBand: {
    marginHorizontal: Space[5],
    marginTop: Space[4],
    paddingHorizontal: Space[5],
    paddingVertical: Space[5],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.borderLight,
    alignItems: 'center',
    ...Shadow.xs,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 12px rgba(15,23,42,0.06)' } : {}),
  },
  heroEyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.floralSage,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroBody: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 340,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space[6],
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 21,
    maxWidth: 360,
  },
  primaryBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryBtnTxt: {
    color: C.white,
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryBtnTxt: {
    fontSize: 15,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
  },
});
