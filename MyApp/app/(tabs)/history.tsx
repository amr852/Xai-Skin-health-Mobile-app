import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Image, ActivityIndicator, Modal,
  KeyboardAvoidingView, Alert,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { C, FontSize, Space, Radius, Shadow } from '@/constants/theme';
import { useLesions, type Lesion, type LesionFields } from '@/hooks/useLesions';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DisclaimerBox } from '@/components/ui/DisclaimerBox';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { BottomTabBar, type NavKey } from '@/components/ui/BottomTabBar';

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
              ? <ActivityIndicator size="small" color={C.primary} />
              : <Text style={[em.headerSave, (!fields.title.trim()) && { opacity: 0.4 }]}>Save</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={em.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <View style={em.formCard}>
              <AppInput
                label="Title"
                required
                value={fields.title}
                onChangeText={v => set('title', v)}
                placeholder="e.g. Mole on left arm"
                editable={!saving}
                returnKeyType="next"
              />

              <AppInput
                label="Description"
                optional
                multiline
                value={fields.description}
                onChangeText={v => set('description', v)}
                placeholder="Describe the lesion…"
                editable={!saving}
              />

              <AppInput
                label="Body Location"
                optional
                value={fields.location}
                onChangeText={v => set('location', v)}
                placeholder="e.g. Left forearm"
                editable={!saving}
                returnKeyType="next"
              />

              {/* Status Selector */}
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

              <AppInput
                label="Notes"
                optional
                multiline
                value={fields.notes}
                onChangeText={v => set('notes', v)}
                placeholder="Any additional notes…"
                editable={!saving}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Lesion Card (vertical layout) ────────────────────────────────────────────
function LesionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Lesion;
  onEdit: (l: Lesion) => void;
  onDelete: (l: Lesion) => void;
}) {
  return (
    <View style={hs.lesionCard}>
      {/* Full-width image on top */}
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={hs.lesionImage} resizeMode="cover" />
      ) : (
        <View style={[hs.lesionImage, hs.lesionImagePlaceholder]}>
          <Feather name="image" size={32} color={C.muted} />
          <Text style={hs.noImgTxt}>No image</Text>
        </View>
      )}

      {/* Content below image */}
      <View style={hs.lesionContent}>
        {/* Title row + badge */}
        <View style={hs.cardTop}>
          <Text style={hs.lesionLabel} numberOfLines={1}>{item.title || 'Untitled'}</Text>
          <StatusBadge status={item.status} size="sm" />
        </View>

        {!!item.description && (
          <Text style={hs.lesionDescription} numberOfLines={2}>{item.description}</Text>
        )}

        <View style={hs.metaRow}>
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
        </View>

        {/* Action buttons */}
        <View style={hs.actions}>
          <AppButton
            label="Edit"
            icon="edit-2"
            onPress={() => onEdit(item)}
            variant="secondary"
            size="sm"
            style={hs.actionBtn}
          />
          <AppButton
            label="Delete"
            icon="trash-2"
            onPress={() => onDelete(item)}
            variant="danger"
            size="sm"
            style={hs.actionBtn}
          />
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { lesions, loading, error, fetchLesions, updateLesion, deleteLesion } = useLesions();
  const [activeNav, setActiveNav]         = useState<NavKey>('history');
  const [statusFilter, setStatusFilter]   = useState<FilterKey>('all');
  const [editingLesion, setEditingLesion] = useState<Lesion | null>(null);
  const [saving, setSaving]               = useState(false);

  const userInitials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'SH';
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';

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

  const handleNav = (key: NavKey) => {
    if      (key === 'scan')    router.push('/camera');
    else if (key === 'home')    router.push('/');
    else if (key === 'profile') router.push('/profile');
    else setActiveNav(key);
  };

  return (
    <SafeAreaView style={hs.safe} edges={['top', 'left', 'right']}>
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
        contentContainerStyle={hs.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Page Header */}
        <PageHeader
          initials={userInitials}
          name={userName}
          onBellPress={() => router.push('/notifications')}
        />

        {/* Title block */}
        <View style={hs.titleBlock}>
          <Text style={hs.pageTitle}>Lesion History</Text>
          <Text style={hs.pageSubtitle}>Track all your logged lesions and their status</Text>
        </View>

        {/* Stats row — individual small cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={hs.statsRow}
          style={hs.statsScroll}>
          {([
            { key: 'all',    label: 'Total',  count: lesions.length,                                  color: C.primary   },
            { key: 'Stable', label: 'Stable', count: lesions.filter(l => l.status === 'Stable').length, color: C.stableText },
            { key: 'Check',  label: 'Check',  count: lesions.filter(l => l.status === 'Check').length,  color: C.checkText  },
            { key: 'Urgent', label: 'Urgent', count: lesions.filter(l => l.status === 'Urgent').length, color: C.urgentText },
          ] as const).map(s => (
            <View key={s.key} style={hs.statCard}>
              <Text style={[hs.statNumber, { color: s.color }]}>{s.count}</Text>
              <Text style={hs.statLabel}>{s.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Filter pills — horizontally scrollable */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={hs.filterRow}
          style={hs.filterScroll}>
          {(['all', 'Stable', 'Check', 'Urgent'] as const).map(key => {
            const active = statusFilter === key;
            const bg = active
              ? key === 'all'    ? C.primary
              : key === 'Stable' ? C.stableBg
              : key === 'Check'  ? C.checkBg
              : C.urgentBg
              : C.surface;
            const color = active
              ? key === 'all'    ? C.white
              : key === 'Stable' ? C.stableText
              : key === 'Check'  ? C.checkText
              : C.urgentText
              : C.textSub;
            const borderColor = active
              ? key === 'all'    ? C.primary
              : key === 'Stable' ? C.stableBg
              : key === 'Check'  ? C.checkBg
              : C.urgentBg
              : C.border;
            return (
              <TouchableOpacity
                key={key}
                style={[hs.filterPill, { backgroundColor: bg, borderColor }]}
                onPress={() => setStatusFilter(key)}
                activeOpacity={0.7}>
                <Text style={[hs.filterPillText, { color }]}>
                  {key === 'all' ? 'All' : key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List content */}
        {loading ? (
          <EmptyState
            icon="clock"
            title="Loading lesions…"
            message="Please wait while we fetch your data."
          />
        ) : error ? (
          <EmptyState
            icon="alert-circle"
            title="Failed to load"
            message={error}
            actionLabel="Retry"
            onAction={fetchLesions}
            variant="error"
          />
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
            <View style={hs.disclaimerWrap}>
              <DisclaimerBox />
            </View>
          </>
        ) : (
          <EmptyState
            icon="inbox"
            title="No lesions found"
            message={
              statusFilter === 'all'
                ? 'Start scanning to add your first lesion.'
                : `No ${statusFilter} lesions yet.`
            }
          />
        )}
      </ScrollView>

      <BottomTabBar active={activeNav} onPress={handleNav} />
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
    backgroundColor: C.surface,
  },
  headerBtn: { minWidth: 64 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  headerCancel: { fontSize: 16, color: C.muted },
  headerSave: { fontSize: 16, fontWeight: '700', color: C.primary, textAlign: 'right' },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  formCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    padding: Space[5] - 2,
    borderWidth: 1,
    borderColor: C.border,
    ...Shadow.sm,
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: C.text, marginBottom: 8, marginTop: 4 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusPill: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.full,
    borderWidth: 1.5, alignItems: 'center',
  },
  statusPillTxt: { fontSize: FontSize.sm, fontWeight: '700' },
});

// ── History Screen Styles ────────────────────────────────────────────────────
const hs = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  titleBlock: { paddingHorizontal: Space[5], paddingTop: 4, paddingBottom: Space[4] },
  pageTitle:   { fontSize: FontSize['3xl'], fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  pageSubtitle:{ fontSize: FontSize.sm, color: C.muted, marginTop: 4 },

  // Stats
  statsScroll: { marginBottom: Space[3] },
  statsRow:    { paddingHorizontal: Space[5], gap: Space[3] },
  statCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    paddingVertical: Space[3],
    paddingHorizontal: Space[4],
    alignItems: 'center',
    minWidth: 72,
    borderWidth: 1,
    borderColor: C.border,
    ...Shadow.xs,
  },
  statNumber: { fontSize: FontSize.xl, fontWeight: '800' },
  statLabel:  { fontSize: FontSize.xs, color: C.muted, marginTop: 3, fontWeight: '600' },

  // Filter pills
  filterScroll: { marginBottom: Space[3] },
  filterRow:    { paddingHorizontal: Space[5], gap: Space[2], paddingVertical: 4 },
  filterPill: {
    paddingHorizontal: Space[4],
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  filterPillText: { fontSize: FontSize.sm, fontWeight: '600' },

  // Lesion card — vertical
  lesionCard: {
    marginHorizontal: Space[5],
    marginBottom: Space[3],
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    ...Shadow.sm,
  },
  lesionImage: {
    width: '100%',
    height: 180,
    backgroundColor: C.cardGray,
  },
  lesionImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noImgTxt: { fontSize: FontSize.sm, color: C.muted },
  lesionContent: { padding: Space[4] },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Space[2],
  },
  lesionLabel: { fontSize: FontSize.base, fontWeight: '700', color: C.text, flex: 1, marginRight: Space[2] },
  lesionDescription: { fontSize: FontSize.sm, color: C.textSub, lineHeight: 19, marginBottom: Space[2] },
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: Space[3], marginBottom: Space[3] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: FontSize.xs + 1, color: C.muted },
  actions:  { flexDirection: 'row', gap: Space[2] },
  actionBtn:{ flex: 1 },

  disclaimerWrap: { marginTop: Space[2] },
});
