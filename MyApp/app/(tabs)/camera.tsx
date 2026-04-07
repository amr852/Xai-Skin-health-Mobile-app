import { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { C } from '@/constants/theme';
import { useLesions, type LesionFields } from '@/hooks/useLesions';

type NavKey = 'home' | 'scan' | 'history' | 'profile';
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const STATUS_OPTIONS: LesionFields['status'][] = ['Stable', 'Check', 'Urgent'];
const STATUS_COLOR: Record<LesionFields['status'], { bg: string; text: string }> = {
  Stable: { bg: C.stableBg,  text: C.stableText },
  Check:  { bg: C.checkBg,   text: C.checkText  },
  Urgent: { bg: C.urgentBg,  text: C.urgentText  },
};

const DEFAULT_FORM: LesionFields = {
  title: '',
  description: '',
  location: '',
  status: 'Stable',
  notes: '',
};

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isFacingFront, setIsFacingFront]   = useState(false);
  const [capturedPhoto, setCapturedPhoto]   = useState<string | null>(null);
  const [form, setForm]                     = useState<LesionFields>(DEFAULT_FORM);
  const [saving, setSaving]                 = useState(false);
  const [activeNav, setActiveNav]           = useState<NavKey>('scan');
  const cameraRef = useRef<CameraView>(null);
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { addLesion } = useLesions();

  const navItems: { key: NavKey; icon: FeatherIconName; a11y: string }[] = [
    { key: 'home',    icon: 'home',   a11y: 'Home'    },
    { key: 'scan',    icon: 'camera', a11y: 'Camera'  },
    { key: 'history', icon: 'clock',  a11y: 'History' },
    { key: 'profile', icon: 'user',   a11y: 'Profile' },
  ];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
    if (photo?.uri) {
      setCapturedPhoto(photo.uri);
      setForm(DEFAULT_FORM);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setForm(DEFAULT_FORM);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please enter a title for this lesion.');
      return;
    }
    setSaving(true);
    try {
      await addLesion(
        { ...form, title: form.title.trim() },
        capturedPhoto ?? undefined,
      );
      Alert.alert('Saved', 'Lesion recorded successfully.', [
        {
          text: 'View History',
          onPress: () => {
            setCapturedPhoto(null);
            router.push('/history');
          },
        },
        {
          text: 'Scan Another',
          onPress: () => {
            setCapturedPhoto(null);
            setForm(DEFAULT_FORM);
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save lesion. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Permission screen ────────────────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={s.permissionWrap}>
          <Feather name="camera-off" size={64} color={C.muted} />
          <Text style={s.permissionTitle}>Camera Access Required</Text>
          <Text style={s.permissionText}>
            We need camera access to capture skin photos for analysis.
          </Text>
          <TouchableOpacity style={s.permissionButton} onPress={requestPermission} activeOpacity={0.7}>
            <Text style={s.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
        <NavBar navItems={navItems} activeNav={activeNav} setActiveNav={setActiveNav} insets={insets} router={router} />
      </SafeAreaView>
    );
  }

  // ── Form screen (after photo captured) ──────────────────────────────────────
  if (capturedPhoto) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.bg }]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        {/* Header */}
        <View style={s.formHeader}>
          <TouchableOpacity onPress={handleRetake} style={s.formBackBtn} hitSlop={10} disabled={saving}>
            <Feather name="arrow-left" size={22} color={saving ? C.muted : C.text} />
          </TouchableOpacity>
          <Text style={s.formHeaderTitle}>New Lesion</Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.formScroll, { paddingBottom: 24 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Photo thumbnail */}
            <Image source={{ uri: capturedPhoto }} style={s.thumbnail} resizeMode="cover" />

            {/* Title */}
            <Text style={s.fieldLabel}>Title <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Mole on left arm"
              placeholderTextColor={C.muted}
              value={form.title}
              onChangeText={v => setForm(f => ({ ...f, title: v }))}
              editable={!saving}
              returnKeyType="next"
            />

            {/* Description */}
            <Text style={s.fieldLabel}>Description</Text>
            <TextInput
              style={[s.input, s.inputMulti]}
              placeholder="Describe the lesion (size, colour, texture…)"
              placeholderTextColor={C.muted}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              multiline
              numberOfLines={3}
              editable={!saving}
            />

            {/* Body location */}
            <Text style={s.fieldLabel}>Body Location</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Back, Left forearm, Neck…"
              placeholderTextColor={C.muted}
              value={form.location}
              onChangeText={v => setForm(f => ({ ...f, location: v }))}
              editable={!saving}
              returnKeyType="next"
            />

            {/* Status */}
            <Text style={s.fieldLabel}>Status</Text>
            <View style={s.statusRow}>
              {STATUS_OPTIONS.map(opt => {
                const active = form.status === opt;
                const meta   = STATUS_COLOR[opt];
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      s.statusPill,
                      active
                        ? { backgroundColor: meta.bg, borderColor: meta.text }
                        : { backgroundColor: 'transparent', borderColor: C.border },
                    ]}
                    onPress={() => setForm(f => ({ ...f, status: opt }))}
                    disabled={saving}
                    activeOpacity={0.7}>
                    <Text style={[s.statusPillText, { color: active ? meta.text : C.muted }]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={s.fieldLabel}>Notes <Text style={s.optional}>(optional)</Text></Text>
            <TextInput
              style={[s.input, s.inputMulti]}
              placeholder="Any additional notes…"
              placeholderTextColor={C.muted}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              multiline
              numberOfLines={3}
              editable={!saving}
            />

            {/* Save button */}
            <TouchableOpacity
              style={[s.saveButton, saving && s.saveButtonDisabled]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Feather name="save" size={18} color={C.white} />
                  <Text style={s.saveButtonText}>Save Lesion</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={s.disclaimer}>
              For tracking only. Always consult a dermatologist for medical advice.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Camera screen ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        ref={cameraRef}
        style={s.camera}
        facing={isFacingFront ? 'front' : 'back'}
        ratio="16:9"
      />

      <View style={s.topControls}>
        <TouchableOpacity style={s.circleBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="x" size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={s.cameraHint}>Align the lesion in frame</Text>
        <TouchableOpacity style={s.circleBtn} onPress={() => setIsFacingFront(v => !v)} activeOpacity={0.7}>
          <Feather name="rotate-cw" size={24} color={C.white} />
        </TouchableOpacity>
      </View>

      <View style={[s.captureRow, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={s.captureButton} onPress={handleTakePhoto} activeOpacity={0.7}>
          <View style={s.captureDot} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Reusable nav bar ─────────────────────────────────────────────────────────
function NavBar({ navItems, activeNav, setActiveNav, insets, router }: any) {
  return (
    <View style={[s.navOuter, { paddingBottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
      <View style={s.navPill}>
        {navItems.map((item: any) => {
          const active = activeNav === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navIconCircle, active ? s.navIconCircleActive : s.navIconCircleIdle]}
              onPress={() => {
                if (item.key === 'home')    router.push('/');
                else if (item.key === 'history') router.push('/history');
                else if (item.key === 'profile') router.push('/profile');
                else setActiveNav(item.key);
              }}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={item.a11y}
              accessibilityState={{ selected: active }}>
              <Feather name={item.icon} size={21} color={active ? C.navIconActive : C.navIconInactive} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Permission
  permissionWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, backgroundColor: C.bg },
  permissionTitle: { fontSize: 20, fontWeight: '600', color: C.text, marginTop: 16, marginBottom: 8, textAlign: 'center' },
  permissionText:  { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  permissionButton: { backgroundColor: C.blue, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  permissionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Camera
  camera: { flex: 1 },
  topControls: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
  },
  cameraHint: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  circleBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  captureRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  captureButton: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureDot: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },

  // Form
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  formBackBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  formHeaderTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  formScroll: { paddingHorizontal: 20, paddingTop: 4 },
  thumbnail: {
    width: '100%', height: 200, borderRadius: 16,
    marginTop: 16, marginBottom: 20, backgroundColor: '#111',
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },
  required: { color: C.urgentText },
  optional: { color: C.muted, fontWeight: '400' },
  input: {
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: C.text, marginBottom: 16,
  },
  inputMulti: { height: 90, textAlignVertical: 'top', paddingTop: 11 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusPill: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  statusPillText: { fontSize: 13, fontWeight: '700' },
  saveButton: {
    backgroundColor: C.blue, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 16,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: C.white },
  disclaimer: {
    fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 17, marginBottom: 8,
  },

  // Nav bar
  navOuter: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  navPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    backgroundColor: C.navPillBg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12,
    gap: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.05)',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 6 }
      : { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }),
  },
  navIconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  navIconCircleIdle: { backgroundColor: C.navCircleInactive, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.04)' },
  navIconCircleActive: { backgroundColor: C.navCircleActive, borderColor: C.navCircleActive },
});
