import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { C } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/hooks/useAuth';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';

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
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Heading ── */}
        <View style={s.headingBlock}>
          <View style={s.iconCircle}>
            <Feather name="lock" size={26} color={C.primary} />
          </View>
          <Text style={s.heading}>Welcome back</Text>
          <Text style={s.subheading}>Sign in to continue monitoring your skin health</Text>
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
            <Text style={s.createBtnTxt}>Create an account</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  topBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  headingBlock: { alignItems: 'center', paddingTop: 12, paddingBottom: 28 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 28, fontWeight: '800', color: C.text,
    letterSpacing: -0.5, marginBottom: 8, textAlign: 'center',
  },
  subheading: {
    fontSize: 14, color: C.textHint,
    textAlign: 'center', lineHeight: 21,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 24,
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
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface,
  },
  createBtnTxt: { fontSize: 15, fontWeight: '700', color: C.primary },
});
