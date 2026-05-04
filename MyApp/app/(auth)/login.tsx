import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { C, FontFamily, FontSize, Radius, Shadow, Space } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { Crest } from '@/components/decor/Crest';
import { validateEmail, validatePassword } from '@/lib/validators';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const { login, isLoading }    = useAuth();

  const handleLogin = async () => {
    setError('');

    // Validate both fields before any network call. The validators normalise
    // (trim/lowercase email) and enforce length caps, so we pass the validated
    // values to the auth context — never the raw user input.
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) { setError(emailCheck.error); return; }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) { setError(passwordCheck.error); return; }

    const result = await login(emailCheck.value, passwordCheck.value);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Top utility bar — back always lands on welcome (predictable, regardless of stack) */}
      <View style={s.topBar}>
        <Pressable
          onPress={() => router.replace('/(auth)/welcome')}
          hitSlop={10}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Back to welcome">
          <ArrowLeft size={20} color={C.text} strokeWidth={2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Editorial heading: small crest + asymmetric title */}
          <View style={s.headingBlock}>
            <Crest size={48} />
            <View style={{ height: 24 }} />
            <Text style={s.eyebrow}>SIGN IN</Text>
            <Text style={s.heading}>Welcome back.</Text>
            <Text style={s.subheading}>
              Continue your tracking history with the same email you registered with.
            </Text>
          </View>

          <View style={s.card}>
            <AppInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureEntry
              editable={!isLoading}
            />

            {error ? (
              <View style={s.errorBox}>
                <AlertCircle size={14} color={C.urgentText} strokeWidth={2} />
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

          {/* Bottom: link to register */}
          <View style={s.footRow}>
            <Text style={s.footTxt}>New here?</Text>
            <Link href="./register" asChild>
              <Pressable hitSlop={6}>
                <Text style={s.footLink}>Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topBar: {
    paddingHorizontal: Space[3],
    paddingVertical: Space[2],
  },
  backBtn: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.borderLight,
  },

  scroll: { paddingHorizontal: Space[6], paddingBottom: Space[10] },

  headingBlock: { alignItems: 'flex-start', paddingTop: Space[2], paddingBottom: Space[6] + 4 },
  eyebrow: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    letterSpacing: 1.6,
    marginBottom: Space[2],
  },
  heading: {
    // FontSize.3xl (28) — matches register.tsx heading and the design system token,
    // resolving the prior 30 vs 28 inconsistency between the two auth screens.
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    letterSpacing: -0.6,
    marginBottom: Space[2],
  },
  subheading: {
    fontSize: FontSize.sm + 1, // 14 — body sub-text, one notch under base
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 20,
    maxWidth: 320,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: Radius.xl, // 20 — system token, was hardcoded 18
    padding: Space[5] - 2, // 18 — internal field gap rhythm
    borderWidth: 1, borderColor: C.border,
    marginBottom: Space[6],
    ...(Platform.OS === 'ios' ? Shadow.xs : {}),
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Space[2],
    backgroundColor: C.urgentBg, borderRadius: Radius.sm + 2, // 10
    paddingHorizontal: Space[3], paddingVertical: Space[3] - 2,
    borderLeftWidth: 3, borderLeftColor: C.urgentText,
    marginBottom: Space[3] + 2,
  },
  errorTxt: {
    flex: 1,
    color: C.urgentText,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    lineHeight: 18,
  },

  signInBtn: { marginTop: Space[1] },

  footRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 6,
    marginTop: Space[2],
  },
  footTxt: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
  },
  footLink: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
    letterSpacing: 0.1,
  },
});
