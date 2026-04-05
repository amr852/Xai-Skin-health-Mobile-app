import { StyleSheet, Text, View, TouchableOpacity, StatusBar, SafeAreaView, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';
import { useState } from 'react';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
type NavKey = 'home' | 'scan' | 'history' | 'profile';

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeNav, setActiveNav] = useState<NavKey>('scan');

  const navItems: { key: NavKey; icon: FeatherIconName; a11y: string }[] = [
    { key: 'home', icon: 'home', a11y: 'Home' },
    { key: 'scan', icon: 'camera', a11y: 'Camera' },
    { key: 'history', icon: 'clock', a11y: 'History' },
    { key: 'profile', icon: 'user', a11y: 'Profile' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <Feather name="camera" size={64} color={C.muted} />
        <Text style={styles.permissionTitle}>Camera Not Available on Web</Text>
        <Text style={styles.permissionText}>
          Camera functionality is only available on iOS and Android devices.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => router.push('/')}
          activeOpacity={0.7}>
          <Text style={styles.permissionButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[styles.navOuter, { paddingBottom: Math.max(insets.bottom, 16) }]}
        pointerEvents="box-none">
        <View style={styles.navPill}>
          {navItems.map(item => {
            const active = activeNav === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.navIconCircle, active ? styles.navIconCircleActive : styles.navIconCircleIdle]}
                onPress={() => {
                  if (item.key === 'home') {
                    router.push('/');
                  } else if (item.key === 'history') {
                    router.push('/history');
                  } else if (item.key === 'profile') {
                    router.push('/profile');
                  } else {
                    setActiveNav(item.key);
                  }
                }}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={item.a11y}
                accessibilityState={{ selected: active }}>
                <Feather
                  name={item.icon}
                  size={21}
                  color={active ? C.navIconActive : C.navIconInactive}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: C.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: C.blue,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '600',
  },
  navOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: C.navPillBg,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : Platform.OS === 'android'
        ? { elevation: 6 }
        : { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }),
  },
  navIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconCircleIdle: {
    backgroundColor: C.navCircleInactive,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  navIconCircleActive: {
    backgroundColor: C.navCircleActive,
    borderColor: C.navCircleActive,
  },
});
