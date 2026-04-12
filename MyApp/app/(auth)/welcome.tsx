import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { C } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const FEATURES: { icon: FeatherIconName; title: string; desc: string; color: string; bg: string }[] = [
  { icon: 'zoom-in',    title: 'Examine & Log',   desc: 'Photograph skin lesions and track changes with clinical precision',       color: C.primary,  bg: C.primaryLight  },
  { icon: 'activity',   title: 'AI Analysis',     desc: 'AI-powered pattern recognition assesses lesion changes over time',        color: '#6D28D9',  bg: '#EDE9FE'        },
  { icon: 'bell',       title: 'Smart Alerts',    desc: 'Instant notifications when a lesion warrants clinical attention',         color: '#B45309',  bg: '#FEF3C7'        },
  { icon: 'shield',     title: 'UV Protection',   desc: 'Real-time UV index with personalised sun-exposure guidance',              color: '#0369A1',  bg: '#E0F2FE'        },
];

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Hero ── */}
      <View style={s.hero}>
        {/* Decorative background rings for depth */}
        <View style={s.decorRing1} />
        <View style={s.decorRing2} />

        {/* Medical cross accent dots */}
        <View style={s.decorDot1} />
        <View style={s.decorDot2} />

        <View style={s.heroLogoRing}>
          <View style={s.heroLogo}>
            <Feather name="heart" size={30} color="#fff" />
          </View>
        </View>
        <Text style={s.heroTitle}>XAI Skin Health</Text>
        <Text style={s.heroTagline}>Clinical-grade dermatology monitoring{'\n'}powered by AI analysis</Text>

        {/* Stats bar */}
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatNum}>AI</Text>
            <Text style={s.heroStatLbl}>Powered</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatNum}>24/7</Text>
            <Text style={s.heroStatLbl}>Monitoring</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatNum}>UV</Text>
            <Text style={s.heroStatLbl}>Tracking</Text>
          </View>
        </View>
      </View>

      {/* ── White sheet ── */}
      <View style={s.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.sheetContent}>

          <Text style={s.sheetHeading}>Your personal{'\n'}dermatology companion</Text>

          <View style={s.featureGrid}>
            {FEATURES.map(f => (
              <View key={f.title} style={[s.featureCard, { borderTopColor: f.color }]}>
                <View style={[s.featureIconWrap, { backgroundColor: f.bg }]}>
                  <Feather name={f.icon} size={20} color={f.color} />
                </View>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* ── Actions ── */}
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}>
            <Feather name="user-plus" size={18} color="#fff" />
            <Text style={s.primaryBtnTxt}>Get Started Free</Text>
            <Feather name="arrow-right" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}>
            <Feather name="log-in" size={16} color={C.primary} />
            <Text style={s.secondaryBtnTxt}>Sign in to your account</Text>
          </TouchableOpacity>

          <Text style={s.disclaimer}>
            Not a substitute for professional medical advice.{'\n'}Always consult a qualified dermatologist.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.primary },

  // ── Hero ────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  // Decorative background rings
  decorRing1: {
    position: 'absolute',
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 40, borderColor: 'rgba(255,255,255,0.05)',
    top: -80, left: -60,
  },
  decorRing2: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 30, borderColor: 'rgba(255,255,255,0.05)',
    top: -20, right: -40,
  },
  decorDot1: {
    position: 'absolute',
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    top: 30, right: 60,
  },
  decorDot2: {
    position: 'absolute',
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: 60, left: 50,
  },
  // Logo with outer glow ring
  heroLogoRing: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  heroLogo: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 30, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, marginBottom: 8,
  },
  heroTagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.78)',
    textAlign: 'center', lineHeight: 22, marginBottom: 20,
  },
  // Quick stats bar inside hero
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 0,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatNum: { fontSize: 16, fontWeight: '800', color: '#fff' },
  heroStatLbl: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },

  // ── White sheet ─────────────────────────────────────────────────
  sheet: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
  },
  sheetHeading: {
    fontSize: 22, fontWeight: '800', color: C.text,
    letterSpacing: -0.4, marginBottom: 20,
  },

  // ── Feature 2×2 grid ────────────────────────────────────────────
  featureGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, marginBottom: 28,
  },
  featureCard: {
    width: '47.5%',
    backgroundColor: C.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
    borderTopWidth: 3,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#1E1010', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }
      : Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  featureIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12, color: C.textHint, lineHeight: 17,
  },

  // ── Buttons ─────────────────────────────────────────────────────
  primaryBtn: {
    height: 54, borderRadius: 14,
    backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 12,
    ...(Platform.OS === 'ios'
      ? { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 }
      : Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  primaryBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    marginBottom: 24, backgroundColor: C.surface,
  },
  secondaryBtnTxt: { fontSize: 15, fontWeight: '600', color: C.primary },

  disclaimer: {
    fontSize: 11, color: C.textHint,
    textAlign: 'center', lineHeight: 17,
  },
});
