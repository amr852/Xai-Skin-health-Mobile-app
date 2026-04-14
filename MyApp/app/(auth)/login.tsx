import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { C } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/hooks/useAuth';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const { login, isLoading }    = useAuth();

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    const result = await login(email.trim(), password.trim());
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Branded top stripe ── */}
      <View style={s.topStripe}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.stripeLogo}>XAI Skin Health</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Heading ── */}
        <View style={s.headingBlock}>
          {/* Layered icon: outer ring + inner circle */}
          <View style={s.iconRing}>
            <View style={s.iconCircle}>
              <Feather name="activity" size={26} color={C.primary} />
            </View>
          </View>
          <Text style={s.heading}>Welcome back</Text>
          <Text style={s.subheading}>Sign in to continue monitoring your skin health</Text>

          {/* Medical credential bar */}
          <View style={s.credBar}>
            {([
              { icon: 'shield', label: 'Secure' },
              { icon: 'eye',    label: 'Private' },
              { icon: 'heart',  label: 'Clinical' },
            ] as { icon: FeatherIconName; label: string }[]).map(item => (
              <View key={item.label} style={s.credItem}>
                <Feather name={item.icon} size={12} color={C.primary} />
                <Text style={s.credLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Form card ── */}
        <View style={s.card}>
          <AppInput
            label="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureEntry
            editable={!isLoading}
          />

          {error ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={14} color={C.urgentText} />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          <AppButton
            label="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            icon="log-in"
            iconRight
            size="lg"
            style={s.signInBtn}
          />
        </View>

        {/* ── Divider ── */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerTxt}>New to XAI Skin Health?</Text>
          <View style={s.dividerLine} />
        </View>

        <Link href="./register" asChild>
          <TouchableOpacity style={s.createBtn} activeOpacity={0.8}>
            <Feather name="user-plus" size={16} color={C.primary} />
            <Text style={s.createBtnTxt}>Create an account</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ── Branded top stripe ────────────────────────────────────────
  topStripe: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  stripeLogo: {
    fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.2,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  headingBlock: { alignItems: 'center', paddingTop: 28, paddingBottom: 24 },

  // Outer ring + inner circle stacked icon
  iconRing: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: C.primaryLight,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    ...(Platform.OS === 'ios'
      ? { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 3 } : {}),
  },
  iconCircle: {
    width: 58, height: 58, borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },

  heading: {
    fontSize: 26, fontWeight: '800', color: C.text,
    letterSpacing: -0.5, marginBottom: 8, textAlign: 'center',
  },
  subheading: {
    fontSize: 14, color: C.textHint,
    textAlign: 'center', lineHeight: 21, marginBottom: 16,
  },

  // Small credential badges under subheading
  credBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  credItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1, borderColor: C.border,
  },
  credLabel: { fontSize: 11, fontWeight: '600', color: C.primary },

  card: {
    backgroundColor: C.surface,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 24,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#1E1010', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 }
      : Platform.OS === 'android' ? { elevation: 3 } : {}),
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.urgentBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderLeftWidth: 3, borderLeftColor: C.urgentText,
    marginBottom: 16,
  },
  errorTxt: { flex: 1, color: C.urgentText, fontSize: 13, fontWeight: '500' },

  signInBtn: { marginTop: 4 },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerTxt:  { paddingHorizontal: 12, fontSize: 12, color: C.textHint },

  createBtn: {
    height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    backgroundColor: C.surface,
  },
  createBtnTxt: { fontSize: 15, fontWeight: '700', color: C.primary },
});
