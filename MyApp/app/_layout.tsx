import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { ActivityIndicator, LogBox, StyleSheet, View } from 'react-native';

// Expo removed Android remote push from Expo Go in SDK 53. Local notifications
// still work and `notificationsNativeSupported()` already gates native calls,
// so these expected module-load warnings are safe to silence.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

function RootLayoutNav() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';

  return (
    <>
      {/* Always declare all screens so Redirect can find them */}
      <Stack screenOptions={{ gestureEnabled: false, animation: 'fade', animationDuration: 220 }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {/* Redirect based on auth state — only after bootstrap completes */}
      {!isLoading && !token && !inAuthGroup && <Redirect href="/(auth)/welcome" />}
      {!isLoading && !!token && inAuthGroup && <Redirect href="/(tabs)" />}

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