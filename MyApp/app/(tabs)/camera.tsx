import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { C } from '@/constants/theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
type NavKey = 'home' | 'scan' | 'history' | 'profile';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isFacingFront, setIsFacingFront] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<NavKey>('scan');
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const navItems: { key: NavKey; icon: FeatherIconName; a11y: string }[] = [
    { key: 'home', icon: 'home', a11y: 'Home' },
    { key: 'scan', icon: 'camera', a11y: 'Camera' },
    { key: 'history', icon: 'clock', a11y: 'History' },
    { key: 'profile', icon: 'user', a11y: 'Profile' },
  ];

  useEffect(() => {
    if (permission === null) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (permission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={C.blue} />
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <Feather name="camera-off" size={64} color={C.muted} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to capture your skin photos for analysis.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.7}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
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

  const handleTakePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      setCapturedPhoto(photo?.uri || null);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleUsePhoto = () => {
    // TODO: Process the captured photo
    router.back();
  };

  if (capturedPhoto) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedPhoto }} style={styles.capturedImage} />
        </View>

        <View style={[styles.controlsBottom, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleRetake}
            activeOpacity={0.7}>
            <Feather name="rotate-ccw" size={20} color={C.text} />
            <Text style={styles.buttonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.useButton]}
            onPress={handleUsePhoto}
            activeOpacity={0.7}>
            <Feather name="check" size={20} color={C.white} />
            <Text style={[styles.buttonText, { color: C.white }]}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={isFacingFront ? 'front' : 'back'}
        ratio="16:9"
      />

      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Feather name="x" size={24} color={C.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setIsFacingFront(!isFacingFront)}
          activeOpacity={0.7}>
          <Feather name="rotate-cw" size={24} color={C.white} />
        </TouchableOpacity>
      </View>

      <View style={[styles.controlsBottom, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleTakePhoto}
          activeOpacity={0.7}>
          <View style={styles.captureDot} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: C.text,
  },
  useButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: C.blue,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
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
    color: '#fff',
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
