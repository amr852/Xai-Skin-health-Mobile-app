import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Image, ActivityIndicator, Modal,
  TextInput, KeyboardAvoidingView, Alert,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { C } from '@/constants/theme';
import { useLesions, type Lesion, type LesionFields } from '@/hooks/useLesions';
import { useAuth } from '@/hooks/useAuth';

type NavKey = 'home' | 'scan' | 'history' | 'profile';
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
type StatusKey = 'Stable' | 'Check' | 'Urgent';
type FilterKey = 'all' | StatusKey;

const STATUS_OPTIONS: StatusKey[] = ['Stable', 'Check', 'Urgent'];

const statusMeta: Record<StatusKey, { label: string; color: string; bg: string }> = {
  Stable: { label: 'Stable', color: C.stableText, bg: C.stableBg },
  Check:  { label: 'Check',  color: C.checkText,  bg: C.checkBg  },
  Urgent: { label: 'Urgent', color: C.urgentText,  bg: C.urgentBg },
};

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  lesion,
  saving,
  onSave,
  onClose,
}: {
  lesion: Lesion;
  saving: boolean;
  onSave: (fields: LesionFields) => void;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<LesionFields>({
    title:       lesion.title       ?? '',
    description: lesion.description ?? '',
    location:    lesion.location    ?? '',
    status:      lesion.status,
    notes:       lesion.notes       ?? '',
  });

  const set = <K extends keyof LesionFields>(k: K, v: LesionFields[K]) =>
    setFields(f => ({ ...f, [k]: v }));

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={em.safe}>
        {/* Header */}
        <View style={em.header}>
          <TouchableOpacity onPress={onClose} disabled={saving} style={em.headerBtn} hitSlop={10}>
            <Text style={[em.headerCancel, saving && { opacity: 0.4 }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={em.headerTitle}>Edit Lesion</Text>
          <TouchableOpacity
            onPress={() => onSave(fields)}
            disabled={saving || !fields.title.trim()}
            style={em.headerBtn}
            hitSlop={10}>
            {saving
              ? <ActivityIndicator size="small" color={C.blue} />
              : <Text style={[em.headerSave, (!fields.title.trim()) && { opacity: 0.4 }]}>Save</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={em.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Title */}
            <Text style={em.label}>Title <Text style={em.required}>*</Text></Text>
            <TextInput
              style={em.input}
              value={fields.title}
              onChangeText={v => set('title', v)}
              placeholder="e.g. Mole on left arm"
              placeholderTextColor={C.muted}
              editable={!saving}
              returnKeyType="next"
            />

            {/* Description */}
            <Text style={em.label}>Description</Text>
            <TextInput
              style={[em.input, em.inputMulti]}
              value={fields.description}
              onChangeText={v => set('description', v)}
              placeholder="Describe the lesion…"
              placeholderTextColor={C.muted}
              multiline numberOfLines={3}
              editable={!saving}
            />

            {/* Location */}
            <Text style={em.label}>Body Location</Text>
            <TextInput
              style={em.input}
              value={fields.location}
              onChangeText={v => set('location', v)}
              placeholder="e.g. Left forearm"
              placeholderTextColor={C.muted}
              editable={!saving}
              returnKeyType="next"
            />

            {/* Status */}
            <Text style={em.label}>Status</Text>
            <View style={em.statusRow}>
              {STATUS_OPTIONS.map(opt => {
                const active = fields.status === opt;
                const meta   = statusMeta[opt];
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      em.statusPill,
                      active
                        ? { backgroundColor: meta.bg, borderColor: meta.color }
                        : { backgroundColor: 'transparent', borderColor: C.border },
                    ]}
                    onPress={() => set('status', opt)}
                    disabled={saving}
                    activeOpacity={0.7}>
                    <Text style={[em.statusPillTxt, { color: active ? meta.color : C.muted }]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={em.label}>Notes</Text>
            <TextInput
              style={[em.input, em.inputMulti]}
              value={fields.notes}
              onChangeText={v => set('notes', v)}
              placeholder="Any additional notes…"
              placeholderTextColor={C.muted}
              multiline numberOfLines={3}
              editable={!saving}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Lesion Card ───────────────────────────────────────────────────────────────
function LesionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Lesion;
  onEdit: (l: Lesion) => void;
  onDelete: (l: Lesion) => void;
}) {
  const meta = statusMeta[item.status] ?? statusMeta.Stable;
  return (
    <View style={hs.lesionCard}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={hs.lesionImage} />
      ) : (
        <View style={[hs.lesionImage, hs.lesionImagePlaceholder]}>
          <Feather name="image" size={28} color={C.muted} />
        </View>
      )}

      <View style={hs.lesionContent}>
        <View style={hs.cardTop}>
          <Text style={hs.lesionLabel} numberOfLines={1}>{item.title || 'Untitled'}</Text>
          <View style={[hs.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[hs.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {!!item.description && (
          <Text style={hs.lesionDescription} numberOfLines={2}>{item.description}</Text>
        )}

        {!!item.location && (
          <View style={hs.metaItem}>
            <Feather name="map-pin" size={12} color={C.muted} />
            <Text style={hs.metaText}>{item.location}</Text>
          </View>
        )}

        <View style={hs.metaItem}>
          <Feather name="calendar" size={12} color={C.muted} />
          <Text style={hs.metaText}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={hs.actions}>
          <TouchableOpacity style={hs.editBtn} onPress={() => onEdit(item)} activeOpacity={0.7}>
            <Feather name="edit-2" size={13} color={C.blue} />
            <Text style={hs.editBtnTxt}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={hs.deleteBtn} onPress={() => onDelete(item)} activeOpacity={0.7}>
            <Feather name="trash-2" size={13} color={C.urgentText} />
            <Text style={hs.deleteBtnTxt}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lesions, loading, error, fetchLesions, updateLesion, deleteLesion } = useLesions();
  const [activeNav, setActiveNav]       = useState<NavKey>('history');
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');
  const [editingLesion, setEditingLesion] = useState<Lesion | null>(null);
  const [saving, setSaving]             = useState(false);

  const userInitials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'SH';
  const userName = user?.firstName || 'User';

  useFocusEffect(
    useCallback(() => { void fetchLesions(); }, [fetchLesions]),
  );

  const sortedAndFiltered = useMemo(() => {
    const filtered = statusFilter === 'all' ? lesions : lesions.filter(l => l.status === statusFilter);
    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lesions, statusFilter]);

  const handleEdit = useCallback((lesion: Lesion) => setEditingLesion(lesion), []);

  const handleSaveEdit = useCallback(
    async (fields: LesionFields) => {
      if (!editingLesion) return;
      setSaving(true);
      try {
        await updateLesion(editingLesion._id, fields);
        setEditingLesion(null);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to update lesion');
      } finally {
        setSaving(false);
      }
    },
    [editingLesion, updateLesion],
  );

  const handleDelete = useCallback(
    (lesion: Lesion) => {
      Alert.alert(
        'Delete Lesion',
        `Delete "${lesion.title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteLesion(lesion._id);
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to delete lesion');
              }
            },
          },
        ],
      );
    },
    [deleteLesion],
  );

  const navItems: { key: NavKey; icon: FeatherIconName; a11y: string }[] = [
    { key: 'home',    icon: 'home',   a11y: 'Home'    },
    { key: 'scan',    icon: 'camera', a11y: 'Camera'  },
    { key: 'history', icon: 'clock',  a11y: 'History' },
    { key: 'profile', icon: 'user',   a11y: 'Profile' },
  ];

  return (
    <SafeAreaView style={hs.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Edit Modal */}
      {editingLesion && (
        <EditModal
          lesion={editingLesion}
          saving={saving}
          onSave={handleSaveEdit}
          onClose={() => setEditingLesion(null)}
        />
      )}

      <ScrollView
        style={hs.scroll}
        contentContainerStyle={[hs.scrollContent, { paddingBottom: 88 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>

        {/* Header row */}
        <View style={hs.headerTop}>
          <View style={hs.headerLeft}>
            <View style={hs.avatar}>
              <Text style={hs.avatarTxt}>{userInitials}</Text>
            </View>
            <Text style={hs.helloTxt}>Hello, {userName}!</Text>
          </View>
          <TouchableOpacity style={hs.bell} onPress={() => router.push('/notifications')}
            activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Notifications">
            <Feather name="bell" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        <View style={hs.header}>
          <Text style={hs.headerTitle}>Lesion History</Text>
          <Text style={hs.headerSubtitle}>Track all your logged lesions and their status</Text>
        </View>

        {/* Stats */}
        <View style={hs.statsSection}>
          {(['all', 'Stable', 'Check', 'Urgent'] as const).map(key => (
            <View key={key} style={hs.statItem}>
              <Text style={[hs.statNumber, {
                color: key === 'Stable' ? C.stableText
                  : key === 'Check' ? C.checkText
                  : key === 'Urgent' ? C.urgentText
                  : C.blue,
              }]}>
                {key === 'all' ? lesions.length : lesions.filter(l => l.status === key).length}
              </Text>
              <Text style={hs.statLabel}>{key === 'all' ? 'Total' : key}</Text>
            </View>
          ))}
        </View>

        {/* Filter pills */}
        <View style={hs.filterSection}>
          {(['all', 'Stable', 'Check', 'Urgent'] as const).map(key => {
            const active = statusFilter === key;
            const bg = active
              ? key === 'all' ? C.blue
                : key === 'Stable' ? C.stableBg
                : key === 'Check' ? C.checkBg
                : C.urgentBg
              : 'transparent';
            const color = active
              ? key === 'all' ? C.white
                : key === 'Stable' ? C.stableText
                : key === 'Check' ? C.checkText
                : C.urgentText
              : C.text;
            return (
              <TouchableOpacity key={key}
                style={[hs.filterButton, { backgroundColor: bg }, active && hs.filterButtonActive]}
                onPress={() => setStatusFilter(key)} activeOpacity={0.7}>
                <Text style={[hs.filterButtonText, { color }]}>
                  {key === 'all' ? 'All' : key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {loading ? (
          <View style={hs.emptyState}>
            <ActivityIndicator size="large" color={C.blue} />
            <Text style={[hs.emptyStateText, { marginTop: 12 }]}>Loading lesions…</Text>
          </View>
        ) : error ? (
          <View style={hs.emptyState}>
            <Feather name="alert-circle" size={48} color={C.urgentText} />
            <Text style={hs.emptyStateTitle}>Failed to load</Text>
            <Text style={hs.emptyStateText}>{error}</Text>
            <TouchableOpacity onPress={fetchLesions} style={hs.retryBtn}>
              <Text style={hs.retryTxt}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sortedAndFiltered.length > 0 ? (
          <>
            {sortedAndFiltered.map(l => (
              <LesionCard
                key={l._id}
                item={l}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
            <View style={hs.disclaimer}>
              <Feather name="alert-circle" size={16} color={C.amber} />
              <Text style={hs.disclaimerText}>
                For tracking only. Always consult a dermatologist for medical advice.
              </Text>
            </View>
          </>
        ) : (
          <View style={hs.emptyState}>
            <Feather name="inbox" size={48} color={C.muted} />
            <Text style={hs.emptyStateTitle}>No lesions found</Text>
            <Text style={hs.emptyStateText}>
              {statusFilter === 'all'
                ? 'Start scanning to add your first lesion.'
                : `No ${statusFilter} lesions yet.`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Nav bar */}
      <View style={[hs.navOuter, { paddingBottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
        <View style={hs.navPill}>
          {navItems.map(item => {
            const active = activeNav === item.key;
            return (
              <TouchableOpacity key={item.key}
                style={[hs.navIconCircle, active ? hs.navIconCircleActive : hs.navIconCircleIdle]}
                onPress={() => {
                  if (item.key === 'scan')    router.push('/camera');
                  else if (item.key === 'home')    router.push('/');
                  else if (item.key === 'profile') router.push('/profile');
                  else setActiveNav(item.key);
                }}
                activeOpacity={0.82} accessibilityRole="button"
                accessibilityLabel={item.a11y} accessibilityState={{ selected: active }}>
                <Feather name={item.icon} size={21} color={active ? C.navIconActive : C.navIconInactive} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Edit Modal Styles ────────────────────────────────────────────────────────
const em = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  headerBtn: { minWidth: 64 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  headerCancel: { fontSize: 16, color: C.muted },
  headerSave: { fontSize: 16, fontWeight: '700', color: C.blue, textAlign: 'right' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6, marginTop: 12 },
  required: { color: C.urgentText },
  input: {
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: C.text,
  },
  inputMulti: { height: 88, textAlignVertical: 'top', paddingTop: 11 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusPill: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center',
  },
  statusPillTxt: { fontSize: 13, fontWeight: '700' },
});

// ── History Screen Styles ────────────────────────────────────────────────────
const hs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 16, marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.headerAvatarRing,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 17, fontWeight: '600', color: '#2E2608' },
  helloTxt: { fontSize: 18, fontWeight: '500', color: C.text, letterSpacing: -0.2 },
  bell: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.bellBg,
    alignItems: 'center', justifyContent: 'center',
  },

  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.6, lineHeight: 34 },
  headerSubtitle: { fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 20 },

  statsSection: {
    flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 18,
    marginBottom: 20, paddingVertical: 14, backgroundColor: C.white,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 4 },

  filterSection: { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 12, gap: 8, marginBottom: 12 },
  filterButton: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, alignItems: 'center',
  },
  filterButtonActive: { borderWidth: 0 },
  filterButtonText: { fontSize: 13, fontWeight: '600' },

  // Lesion card
  lesionCard: {
    marginHorizontal: 18, marginBottom: 16, borderRadius: 16, overflow: 'hidden',
    backgroundColor: C.white, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
  },
  lesionImage: { width: 100, height: '100%', minHeight: 110, backgroundColor: '#f0f0f0' },
  lesionImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  lesionContent: { flex: 1, padding: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  lesionLabel: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  lesionDescription: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  metaText: { fontSize: 12, color: C.muted },

  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: C.blueLight, borderWidth: 1, borderColor: C.blue + '30',
  },
  editBtnTxt: { fontSize: 12, fontWeight: '600', color: C.blue },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: C.urgentBg, borderWidth: 1, borderColor: C.urgentText + '30',
  },
  deleteBtnTxt: { fontSize: 12, fontWeight: '600', color: C.urgentText },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: C.text, marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.blue, borderRadius: 10 },
  retryTxt: { color: C.white, fontWeight: '600', fontSize: 14 },

  disclaimer: {
    marginHorizontal: 18, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FFF8E6', borderRadius: 12, borderLeftWidth: 4,
    borderLeftColor: C.amber, flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  disclaimerText: { fontSize: 12, color: '#8B6914', flex: 1, lineHeight: 18 },

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
