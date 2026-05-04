import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Image, ActivityIndicator, Modal,
  KeyboardAvoidingView,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { C, FontFamily, FontSize, Space, Radius, Shadow } from '@/constants/theme';
import { StatusArc } from '@/components/decor/StatusArc';
import { Hairline } from '@/components/decor/Hairline';
import { SegmentControl } from '@/components/ui/SegmentControl';
import { useUiOverlay } from '@/context/UiOverlayContext';
import { useLesions, type Lesion, type LesionFields } from '@/hooks/useLesions';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DisclaimerBox } from '@/components/ui/DisclaimerBox';
import { AppInput } from '@/components/ui/AppInput';
import { BottomTabBar, type NavKey } from '@/components/ui/BottomTabBar';
import { useAppAlert } from '@/components/ui/AppAlert';
import { countUnread, subscribeInboxChange } from '@/lib/notificationInbox';

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
                placeholder="Petite mole near left elbow"
                editable={!saving}
                returnKeyType="next"
              />

              <AppInput
                label="Description"
                optional
                multiline
                value={fields.description}
                onChangeText={v => set('description', v)}
                placeholder="A few words on size, colour, edges, texture…"
                editable={!saving}
              />

              <AppInput
                label="Body Location"
                optional
                value={fields.location}
                onChangeText={v => set('location', v)}
                placeholder="Inner left forearm"
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
                placeholder="Tenderness, sun exposure that day, anything to remember…"
                editable={!saving}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

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
      {/* Leading-edge status arc — encodes status as data, not decoration */}
      <StatusArc status={item.status} edge="left" length={'100%'} thickness={4} />

      <View style={hs.ledgerRow}>
        {/* 64-px square thumbnail — Apple Mail / Things style */}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={hs.thumb} resizeMode="cover" />
        ) : (
          <View style={[hs.thumb, hs.thumbEmpty]}>
            <Feather name="camera-off" size={20} color={C.muted} />
          </View>
        )}

        <View style={hs.ledgerBody}>
          <View style={hs.cardTop}>
            <Text style={hs.lesionLabel} numberOfLines={1}>{item.title || 'Untitled'}</Text>
            <StatusBadge status={item.status} size="sm" />
          </View>

          {!!item.description && (
            <Text style={hs.lesionDescription} numberOfLines={1}>{item.description}</Text>
          )}

          <View style={hs.metaRow}>
            {!!item.location && (
              <Text style={hs.metaText}>{item.location}</Text>
            )}
            {!!item.location && <Text style={hs.metaDivider}>·</Text>}
            <Text style={hs.metaText}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>

          {/* Action buttons — 40pt height + 6pt hitSlop = 52pt effective target */}
          <View style={hs.actions}>
            <TouchableOpacity
              style={hs.actionBtnEdit}
              onPress={() => onEdit(item)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.title || 'lesion'}`}
              activeOpacity={0.75}>
              <Feather name="edit-2" size={14} color={C.primary} />
              <Text style={hs.actionBtnEditTxt}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={hs.actionBtnDelete}
              onPress={() => onDelete(item)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title || 'lesion'}`}
              activeOpacity={0.75}>
              <Feather name="trash-2" size={14} color={C.urgentText} />
              <Text style={hs.actionBtnDeleteTxt}>Delete</Text>
            </TouchableOpacity>
          </View>
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
  const [unreadCount, setUnreadCount]     = useState(0);
  const { showAlert, alertNode }          = useAppAlert();

  const { openAvatarMenu } = useUiOverlay();

  const userInitials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'SH';
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';

  useFocusEffect(
    useCallback(() => { void fetchLesions(); }, [fetchLesions]),
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const upd = async () => {
        const count = await countUnread();
        if (alive) setUnreadCount(count);
      };
      void upd();
      const unsub = subscribeInboxChange(() => void upd());
      return () => { alive = false; unsub(); };
    }, []),
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
        showAlert({ title: 'Update Failed', message: e.message || 'Failed to update lesion.', variant: 'error' });
      } finally {
        setSaving(false);
      }
    },
    [editingLesion, updateLesion],
  );

  const handleDelete = useCallback(
    (lesion: Lesion) => {
      showAlert({
        title: 'Delete Lesion',
        message: `"${lesion.title}" will be permanently removed. This cannot be undone.`,
        variant: 'confirm',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteLesion(lesion._id);
              } catch (e: any) {
                showAlert({ title: 'Delete Failed', message: e.message || 'Failed to delete lesion.', variant: 'error' });
              }
            },
          },
        ],
      });
    },
    [deleteLesion, showAlert],
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

      {alertNode}

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
          unreadCount={unreadCount}
          onBellPress={() => router.push('/notifications')}
          onAvatarPress={openAvatarMenu}
        />

        {/* Title block — ledger heading, no decorative SVG */}
        <View style={hs.titleBlock}>
          <Text style={hs.pageTitle}>Lesion Records</Text>
          <Text style={hs.pageSubtitle}>Every lesion you have logged, in chronological order.</Text>
        </View>

        {/* Filter — segmented control with counts; replaces stats + pills duplication */}
        <View style={hs.filterBar}>
          <SegmentControl
            value={statusFilter}
            onChange={setStatusFilter}
            items={[
              { key: 'all',    label: 'All',    count: lesions.length },
              { key: 'Stable', label: 'Stable', count: lesions.filter(l => l.status === 'Stable').length },
              { key: 'Check',  label: 'Check',  count: lesions.filter(l => l.status === 'Check').length  },
              { key: 'Urgent', label: 'Urgent', count: lesions.filter(l => l.status === 'Urgent').length },
            ]}
          />
          <Hairline width={'100%'} style={{ marginTop: 12 }} />
        </View>

        {/* List content */}
        {loading && lesions.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
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
            title={statusFilter === 'all' ? 'Nothing to show yet' : `No ${statusFilter} lesions`}
            italicTitle
            message={
              statusFilter === 'all'
                ? 'Capture your first lesion from the Scan tab to begin tracking.'
                : 'Try a different filter, or add a new entry from the Scan tab.'
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
  headerTitle: {
    fontSize: 17,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.3,
  },
  headerCancel: {
    fontSize: 16,
    fontFamily: FontFamily.body,
    color: C.muted,
  },
  headerSave: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    textAlign: 'right',
  },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  formCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    padding: Space[5] - 2,
    borderWidth: 1,
    borderColor: C.border,
    ...Shadow.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    marginBottom: 8, marginTop: 4,
  },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusPill: {
    flex: 1, paddingVertical: 11, borderRadius: Radius.full,
    borderWidth: 1.5, alignItems: 'center',
  },
  statusPillTxt: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.2,
  },
});

// ── History Screen Styles ────────────────────────────────────────────────────
const hs = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  // Title block — clean ledger heading
  titleBlock: { paddingHorizontal: Space[5], paddingTop: 4, paddingBottom: Space[3] },
  pageTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
    marginTop: 4,
    lineHeight: 20,
  },

  // Filter bar — segment control + hairline
  filterBar: {
    paddingHorizontal: Space[5],
    paddingBottom: Space[3],
  },

  // Ledger row — leading status arc + thumbnail + content
  lesionCard: {
    marginHorizontal: Space[5],
    marginBottom: Space[2] + 2,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
    ...Shadow.xs,
  },
  ledgerRow: {
    flexDirection: 'row',
    padding: 12,
    paddingLeft: 16,
    gap: 12,
  },
  thumb: {
    width: 64, height: 64, borderRadius: 10,
    backgroundColor: C.surfaceAlt,
  },
  thumbEmpty: {
    alignItems: 'center', justifyContent: 'center',
  },
  ledgerBody: { flex: 1, minWidth: 0 },
  metaDivider: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginHorizontal: 4,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
    gap: 8,
  },
  lesionLabel: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  lesionDescription: {
    fontSize: 12.5,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: C.textHint,
    letterSpacing: 0.2,
  },

  // Inline action buttons — 40pt height for WCAG 2.5.5 (with 6pt hitSlop = 52pt target)
  actions: { flexDirection: 'row', gap: Space[2], marginTop: 2 },
  actionBtnEdit: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, paddingHorizontal: 14, borderRadius: Radius.sm + 2,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1, borderColor: C.borderLight,
  },
  actionBtnEditTxt: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    letterSpacing: 0.1,
  },
  actionBtnDelete: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, paddingHorizontal: 14, borderRadius: Radius.sm + 2,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: C.urgentBorder,
  },
  actionBtnDeleteTxt: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemibold,
    color: C.urgentText,
    letterSpacing: 0.1,
  },

  disclaimerWrap: { marginTop: Space[3] },
});
