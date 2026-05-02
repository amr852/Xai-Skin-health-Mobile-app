import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";
import { ActivityIndicator, LogBox, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle } from 'lucide-react-native';
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  useFonts as useSerif,
  SourceSerif4_400Regular_Italic,
} from '@expo-google-fonts/source-serif-4';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { UiOverlayProvider } from '@/context/UiOverlayContext';
import { useApiHealth } from '@/hooks/useApiHealth';
import { C, FontFamily } from '@/constants/theme';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

// ── API health banner ──────────────────────────────────────────────────────
// Sits below the status bar / notch, full-width, two-line if needed.
function ApiHealthBanner() {
  const { status } = useApiHealth();
  const insets = useSafeAreaInsets();
  if (status !== 'down') return null;
  return (
    <View
      pointerEvents="box-none"
      style={[banner.wrap, { paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 4) }]}>
      <View style={banner.bar}>
        <AlertTriangle size={16} color="#fff" strokeWidth={2.2} />
        <Text style={banner.txt} numberOfLines={2}>
          {`Can't reach the server. Check that the backend is running, or set EXPO_PUBLIC_API_URL.`}
        </Text>
      </View>
    </View>
  );
}

const banner = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: 0,
    zIndex: 9999,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.urgentText,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  txt: {
    flex: 1,
    color: '#fff',
    fontSize: 12.5,
    fontFamily: FontFamily.bodySemibold,
    letterSpacing: 0.1,
    lineHeight: 17,
  },
});

// ── Auth-driven nav ──────────────────────────────────────────────────────
function RootLayoutNav() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';

  return (
    <>
      <Stack screenOptions={{ gestureEnabled: false, animation: 'fade', animationDuration: 200 }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {!isLoading && !token && !inAuthGroup && <Redirect href="/(auth)/welcome" />}
      {!isLoading && !!token && inAuthGroup && <Redirect href="/(tabs)" />}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      )}

      <ApiHealthBanner />
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
});

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const [serifLoaded] = useSerif({
    SourceSerif4_400Italic: SourceSerif4_400Regular_Italic,
  });

  const fontsReady = interLoaded && serifLoaded;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <UiOverlayProvider>
            <NotificationBootstrap />
            {fontsReady ? (
              <RootLayoutNav />
            ) : (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            )}
            <StatusBar style="auto" />
          </UiOverlayProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
