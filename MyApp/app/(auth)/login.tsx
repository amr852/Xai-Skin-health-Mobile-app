import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { C, FontFamily, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { Crest } from '@/components/decor/Crest';

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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.borderLight,
  },

  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  headingBlock: { alignItems: 'flex-start', paddingTop: 8, paddingBottom: 28 },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  heading: {
    fontSize: 30,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    letterSpacing: -0.7,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 20,
    maxWidth: 320,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 24,
    ...(Platform.OS === 'ios' ? Shadow.xs : {}),
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.urgentBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderLeftWidth: 3, borderLeftColor: C.urgentText,
    marginBottom: 14,
  },
  errorTxt: {
    flex: 1,
    color: C.urgentText,
    fontSize: 12.5,
    fontFamily: FontFamily.bodyMedium,
    lineHeight: 17,
  },

  signInBtn: { marginTop: 4 },

  footRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
  },
  footTxt: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: C.textSub,
  },
  footLink: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
    letterSpacing: 0.1,
  },
});
