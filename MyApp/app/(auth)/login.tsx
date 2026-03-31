// app/(auth)/login.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { luminaPalette as palette } from '@/constants/palette';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);

      // TODO: replace this with your real auth call
      // Example: await signIn(email.trim(), password);
      await new Promise((resolve) => setTimeout(resolve, 400));

      router.replace('/(tabs)');
    } catch (loginError) {
      console.error(loginError);
      setError('Login failed. Please try again.');
      Alert.alert('Login failed', 'Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to continue</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={palette.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={palette.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}>
            <Text style={styles.buttonText}>{isLoading ? 'Logging in...' : 'Log in'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Link href="./register">
            <Text style={styles.link}>Don&apos;t have an account? Register</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: palette.cream,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 26,
    backgroundColor: palette.ivory,
    borderWidth: 1,
    borderColor: palette.sand,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  header: { width: '100%', marginBottom: 22, alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '600', textAlign: 'center', color: palette.text },
  subtitle: { marginTop: 6, color: palette.textMuted, textAlign: 'center' },
  form: { width: '100%', maxWidth: 360, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: palette.petal,
    backgroundColor: palette.white,
    borderRadius: 14,
    padding: 13,
    textAlign: 'center',
    color: palette.text,
  },
  errorText: { color: '#c62828', fontSize: 13, textAlign: 'center' },
  button: {
    backgroundColor: palette.deepRose,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: palette.white, fontWeight: '600' },
  footer: { width: '100%', maxWidth: 360, marginTop: 16 },
  link: { textAlign: 'center', color: palette.deepRose },
});