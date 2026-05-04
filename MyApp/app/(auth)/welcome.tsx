import { View, Text, Pressable, StyleSheet, StatusBar, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowRight, ArrowUpRight, Camera, Eye, ShieldCheck, Sun } from 'lucide-react-native';
import { C, FontFamily, FontSize, Overlay, Radius, Shadow, Space } from '@/constants/theme';
import { GradientHero } from '@/components/decor/GradientHero';
import { Crest } from '@/components/decor/Crest';
import { Hairline } from '@/components/decor/Hairline';
import { Petal } from '@/components/decor/Petal';

interface Feature {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  { Icon: Camera,      title: 'Examine & Log',  desc: 'Capture each lesion with consistent, time-stamped photos.' },
  { Icon: Eye,         title: 'Track Changes',  desc: 'Compare entries over time. Status: Stable, Check, or Urgent.' },
  { Icon: Sun,         title: 'UV-Aware',       desc: 'Live UV index with personalized exposure guidance.' },
  { Icon: ShieldCheck, title: 'Private & Secure', desc: 'Your records are stored with your account and never shared.' },
];

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDeep} />

      {/* ── Editorial-split hero ── */}
      <GradientHero style={s.hero}>
        {/* Two diagonal corner petals — decorative; hidden from screen readers. */}
        <View
          style={s.heroPetalTL}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Petal size={150} color={Overlay.whiteMuted} opacity={0.32} animate />
        </View>
        <View
          style={s.heroPetalBR}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Petal size={130} color={Overlay.whiteMuted} opacity={0.28} animate />
        </View>
        {/* Asymmetric mark, top-left — clean, no petal behind */}
        <View style={s.heroMark}>
          <Crest size={72} />
        </View>
        <View style={s.heroBody}>
          <Text style={s.heroEyebrow}>XAI · DERMATOLOGY</Text>
          <Text style={s.heroTitle}>Skin Health,{'\n'}observed with care.</Text>
          <Text style={s.heroTagline}>
            <Text style={s.heroTaglineItalic}>Clinical-grade tracking</Text>{' '}for moles, lesions, and daily exposure.
          </Text>
        </View>
      </GradientHero>

      {/* ── White sheet ── */}
      <View style={s.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.sheetContent}>

          {/* Stacked feature list — vertical, 32-px gutters */}
          <View style={s.featureList}>
            {FEATURES.map((f, i) => (
              <View key={f.title}>
                <View style={s.featureRow}>
                  <View style={s.featureIcon}>
                    <f.Icon size={20} color={C.primary} strokeWidth={1.6} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.featureTitle}>{f.title}</Text>
                    <Text style={s.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
                {i < FEATURES.length - 1 && <Hairline width={'100%'} fadeInset={0} style={{ marginVertical: 18 }} />}
              </View>
            ))}
          </View>

          {/* Actions */}
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.push('/(auth)/register')}
            accessibilityRole="button"
            accessibilityLabel="Get started — create account">
            <Text style={s.primaryBtnTxt}>Get Started</Text>
            <ArrowRight size={18} color="#fff" strokeWidth={2} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Sign in to existing account">
            <Text style={s.secondaryBtnTxt}>I already have an account</Text>
            <ArrowUpRight size={16} color={C.primary} strokeWidth={2} />
          </Pressable>

          <Text style={s.disclaimer}>
            For tracking only. Not a substitute for professional medical advice.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.primaryDeep },

  // Hero — editorial-split, asymmetric
  hero: {
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 36,
    minHeight: 280,
    justifyContent: 'space-between',
  },
  // Two corner petals — placed off-edge so only their *outer* halo is visible.
  // Top-left peeks above the crest area; bottom-right balances near the pulse line.
  heroPetalTL: {
    position: 'absolute',
    top: -55, left: -55,
  },
  heroPetalBR: {
    position: 'absolute',
    bottom: -45, right: -45,
  },
  heroMark: { alignSelf: 'flex-start' },
  heroBody: { marginTop: Space[8] + 4 }, // 36
  heroEyebrow: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    color: Overlay.whiteHigh,
    letterSpacing: 1.6,
    marginBottom: Space[3],
  },
  heroTitle: {
    // 30 is intentionally larger than the system FontSize.3xl (28) — this is
    // the brand title on the welcome hero and gets one-step extra prominence.
    // Kept inline (not promoted to a token) because no other screen uses it.
    fontSize: 30,
    fontFamily: FontFamily.bodyBold,
    color: C.surface,
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: Space[3],
  },
  heroTagline: {
    fontSize: FontSize.sm + 1, // 14
    fontFamily: FontFamily.body,
    color: 'rgba(255,255,255,0.82)', // bespoke tagline alpha — between high (.78) and almost (.92)
    lineHeight: 20,
    maxWidth: 320,
  },
  heroTaglineItalic: {
    fontFamily: FontFamily.displayItalic,
    color: C.surface,
  },

  // White sheet — uses 3xl radius for the editorial split, slightly larger
  // than card-level radii to read as a true page surface, not a card.
  sheet: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: Radius['3xl'] - 4, // 28
    borderTopRightRadius: Radius['3xl'] - 4,
    overflow: 'hidden',
    marginTop: -18,
  },
  sheetContent: {
    paddingHorizontal: Space[6],
    paddingTop: Space[6] + 4,
    paddingBottom: Space[8] + 4,
  },

  // Feature list
  featureList: { marginBottom: Space[6] + 4 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space[3] + 2, // 14
  },
  featureIcon: {
    width: 40, height: 40, borderRadius: Radius.sm + 2, // 10
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  featureTitle: {
    fontSize: FontSize.base, // 15
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 18,
  },

  // Buttons — primary uses Button radius (14) + lg height (54)
  primaryBtn: {
    height: 54,
    borderRadius: 14, // matches Button.radius token
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[2],
    marginBottom: Space[3],
    ...(Platform.OS === 'ios' ? Shadow.sm : Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  primaryBtnTxt: {
    fontSize: FontSize.md, // 16
    fontFamily: FontFamily.bodySemibold,
    color: C.surface,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Space[5] + 2, // 22
  },
  secondaryBtnTxt: {
    fontSize: FontSize.sm + 1, // 14
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
    letterSpacing: 0.1,
  },

  // Disclaimer — bumped from 11.5 to FontSize.sm (13) so it stays readable
  // for users with the smallest accessibility text size enabled. Legal copy
  // never has any business hiding under 12px.
  disclaimer: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textHint,
    textAlign: 'center',
    lineHeight: 18,
  },
});
