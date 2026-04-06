// app/(auth)/login.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { C } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

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
      Alert.alert('Login failed', result.error || 'Please check your credentials and try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={s.container}>
        <View style={s.card}>
          <View style={s.headerIcon}>
            <Feather name="lock" size={32} color={C.blue} />
          </View>

          <View style={s.header}>
            <Text style={s.title}>Welcome back</Text>
            <Text style={s.subtitle}>Log in to your account</Text>
          </View>

          <View style={s.form}>
            <View style={s.inputGroup}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                placeholder="Enter your email"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                placeholder="Enter your password"
                placeholderTextColor={C.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.button, isLoading && s.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.75}>
              {isLoading ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Text style={s.buttonText}>Log in</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>New here?</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.footer}>
            <Link href="./register" asChild>
              <TouchableOpacity style={s.secondaryButton} activeOpacity={0.7}>
                <Text style={s.secondaryButtonText}>Create an account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 24,
    paddingVertical: 28,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : Platform.OS === 'android'
        ? { elevation: 4 }
        : {}),
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: C.text,
    letterSpacing: -0.3,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  subtitle: {
    marginTop: 6,
    color: C.muted,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  form: {
    width: '100%',
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cardGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  button: {
    backgroundColor: C.blue,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: C.white,
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    paddingHorizontal: 12,
    color: C.muted,
    fontSize: 12,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  footer: {
    width: '100%',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: C.blue,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: C.blue,
    fontWeight: '600',
    fontSize: 15,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
});