import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

function RootLayoutNav() {
  const { token, isLoading } = useAuth();

  return (
    <>
      {/* Always declare all screens so Redirect can find them */}
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {/* Redirect based on auth state — only after bootstrap completes */}
      {!isLoading && !token && <Redirect href="/(auth)/welcome" />}

      {/* Overlay spinner only during initial bootstrap (token check) */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <NotificationBootstrap />
        <RootLayoutNav />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}