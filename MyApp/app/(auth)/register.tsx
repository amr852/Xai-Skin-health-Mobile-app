// app/(auth)/register.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { luminaPalette as palette } from '@/constants/palette';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    // TODO: add your registration logic here
    // e.g. await signUp(email, password);
    // router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>

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

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor={palette.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        <Link href="/(auth)/login">
          <Text style={styles.link}>Already have an account? Log in</Text>
        </Link>
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
  title: {
    fontSize: 30,
    fontWeight: '600',
    marginBottom: 28,
    textAlign: 'center',
    color: palette.text,
  },
  input: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: palette.petal,
    backgroundColor: palette.white,
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
    textAlign: 'center',
    color: palette.text,
  },
  button: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: palette.deepRose,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 2,
  },
  buttonText: { color: palette.white, fontWeight: '600' },
  link: { textAlign: 'center', color: palette.deepRose },
});