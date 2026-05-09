import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Image, ActivityIndicator, Modal,
  KeyboardAvoidingView,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { C, FontFamily, FontSize, Space, Radius, Shadow, Gradient } from '@/constants/theme';
import { StatusArc } from '@/components/decor/StatusArc';
import { Hairline } from '@/components/decor/Hairline';
import { SegmentControl } from '@/components/ui/SegmentControl';
import { useUiOverlay } from '@/context/UiOverlayContext';
import { useLesions, type Lesion, type LesionFields } from '@/hooks/useLesions';
import { ImageWithBboxOverlay } from '@/components/ImageWithBboxOverlay';
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

function lesionRegionCount(item: Lesion): number {
  const n = item.analysis?.lesionCount;
  if (typeof n === 'number' && n > 0) return n;
  return item.analysis?.lesions?.length ?? 0;
}

function mapModelSeverityToStatus(s?: string): StatusKey {
  const k = (s || '').toLowerCase();
  if (k === 'urgent') return 'Urgent';
  if (k === 'stable') return 'Stable';
  return 'Check';
}

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

function LesionRegionsModal({
  item,
  onClose,
}: {
  item: Lesion;
  onClose: () => void;
}) {
  const regions = item.analysis?.lesions ?? [];
  const detections = regions.map((L) => ({
    bbox: L.bbox,
    severity: L.severity,
    label: L.diagnosis?.label,
  }));

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={rm.safe}>
        <View style={rm.header}>
          <TouchableOpacity onPress={onClose} style={rm.headerBtn} hitSlop={10}>
            <Text style={rm.headerClose}>Done</Text>
          </TouchableOpacity>
          <Text style={rm.headerTitle}>Scan regions</Text>
          <View style={{ width: 56 }} />
        </View>
        <ScrollView
          style={rm.scroll}
          contentContainerStyle={rm.scrollContent}
          showsVerticalScrollIndicator={false}>
          {item.imageUrl && regions.length > 0 ? (
            <View style={rm.previewCard}>
              <Text style={rm.previewLabel}>Photo with model outlines</Text>
              <ImageWithBboxOverlay
                source={{ uri: item.imageUrl }}
                height={220}
                borderRadius={Radius.lg}
                detections={detections}
              />
            </View>
          ) : null}

          <Text style={rm.sectionLabel}>
            {regions.length === 0
              ? 'No per-region data was stored for this entry.'
              : `${regions.length} region${regions.length === 1 ? '' : 's'}`}
          </Text>

          {regions.map((L, i) => {
            const st = mapModelSeverityToStatus(L.severity);
            const meta = statusMeta[st];
            const label = L.diagnosis?.label ?? '—';
            const score = typeof L.diagnosis?.score === 'number' ? L.diagnosis.score : 0;
            return (
              <View key={L.lesion_id ?? `r-${i}`} style={rm.regionRow}>
                <View style={rm.regionRowTop}>
                  <Text style={rm.regionTitle}>Region {i + 1}</Text>
                  <View style={[rm.sevPill, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                    <Text style={[rm.sevPillTxt, { color: meta.color }]}>{st}</Text>
                  </View>
                </View>
                <Text style={rm.regionPred}>
                  {label} · {(score * 100).toFixed(1)}%
                </Text>
                <Text style={rm.regionMeta}>
                  Detector conf: {((L.bbox?.conf ?? 0) * 100).toFixed(1)}%
                </Text>
              </View>
            );
          })}

          {item.analysis?.camImageUrl ? (
            <View style={rm.heatmapHint}>
              <Feather name="zap" size={14} color={C.primary} />
              <Text style={rm.heatmapHintTxt}>
                Open “Heatmap” on the card for the full Grad-CAM composite.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function LesionCard({
  item,
  onEdit,
  onDelete,
  onViewCam,
  onViewRegions,
}: {
  item: Lesion;
  onEdit: (l: Lesion) => void;
  onDelete: (l: Lesion) => void;
  onViewCam: (l: Lesion) => void;
  onViewRegions: (l: Lesion) => void;
}) {
  const nRegions = lesionRegionCount(item);
  const regions = item.analysis?.lesions;
  const hasStoredRegions = Array.isArray(regions) && regions.length > 0;
  const detections = (regions ?? []).map((L) => ({
    bbox: L.bbox,
    severity: L.severity,
    label: L.diagnosis?.label,
  }));

  return (
    <View style={hs.lesionCard}>
      <StatusArc status={item.status} edge="left" length={'100%'} thickness={4} />

      <View style={hs.ledgerRow}>
        {item.imageUrl && hasStoredRegions ? (
          <ImageWithBboxOverlay
            source={{ uri: item.imageUrl }}
            width={72}
            height={72}
            borderRadius={10}
            detections={detections}
          />
        ) : item.imageUrl ? (
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

          {nRegions > 1 ? (
            <View style={hs.multiBadge}>
              <Feather name="layers" size={11} color={C.primary} />
              <Text style={hs.multiBadgeTxt}>{nRegions} regions</Text>
            </View>
          ) : null}

          {!!item.description && (
            <Text style={hs.lesionDescription} numberOfLines={1}>{item.description}</Text>
          )}

          {!!item.analysis?.label && (
            <Text style={hs.analysisText} numberOfLines={1}>
              {item.analysis.label} · {(item.analysis.score * 100).toFixed(1)}%
            </Text>
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

          <View style={hs.actions}>
            {hasStoredRegions ? (
              <TouchableOpacity
                style={hs.actionBtnRegions}
                onPress={() => onViewRegions(item)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`View regions for ${item.title || 'lesion'}`}
                activeOpacity={0.75}>
                <Feather name="grid" size={14} color={C.floralSage} />
                <Text style={hs.actionBtnRegionsTxt}>Regions</Text>
              </TouchableOpacity>
            ) : null}
            {!!item.analysis?.camImageUrl && (
              <TouchableOpacity
                style={hs.actionBtnView}
                onPress={() => onViewCam(item)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`View Grad-CAM for ${item.title || 'lesion'}`}
                activeOpacity={0.75}>
                <Feather name="eye" size={14} color={C.primary} />
                <Text style={hs.actionBtnViewTxt}>Heatmap</Text>
              </TouchableOpacity>
            )}
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
  const [regionsLesion, setRegionsLesion] = useState<Lesion | null>(null);
  const [camPreviewUri, setCamPreviewUri] = useState<string | null>(null);
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
    [editingLesion, updateLesion, showAlert],
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

  const handleViewCam = useCallback((lesion: Lesion) => {
    const uri = lesion.analysis?.camImageUrl;
    if (!uri) {
      showAlert({
        title: 'No Grad-CAM image',
        message: 'This lesion does not have an explainability image yet.',
        variant: 'warning',
      });
      return;
    }
    setCamPreviewUri(uri);
  }, [showAlert]);

  const handleViewRegions = useCallback((lesion: Lesion) => {
    setRegionsLesion(lesion);
  }, []);

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

      {regionsLesion && (
        <LesionRegionsModal item={regionsLesion} onClose={() => setRegionsLesion(null)} />
      )}

      <Modal
        visible={!!camPreviewUri}
        animationType="fade"
        transparent
        onRequestClose={() => setCamPreviewUri(null)}>
        <View style={hs.camModalBackdrop}>
          <View style={hs.camModalCard}>
            <View style={hs.camModalHeader}>
              <Text style={hs.camModalTitle}>Grad-CAM heatmap</Text>
              <TouchableOpacity
                onPress={() => setCamPreviewUri(null)}
                style={hs.camModalCloseBtn}
                hitSlop={8}>
                <Feather name="x" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            {camPreviewUri ? (
              <Image source={{ uri: camPreviewUri }} style={hs.camModalImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>

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

        <LinearGradient colors={[...Gradient.floralBand]} style={hs.titleBlock} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={hs.pageTitle}>Lesion records</Text>
          <Text style={hs.pageSubtitle}>
            <Text style={hs.pageSubtitleAccent}>Garden view</Text>
            {' — '}every scan, newest first. Multi-region captures show outlines on the thumbnail.
          </Text>
        </LinearGradient>

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
                onViewCam={handleViewCam}
                onViewRegions={handleViewRegions}
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

const rm = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  headerBtn: { minWidth: 56 },
  headerClose: { fontSize: 16, fontFamily: FontFamily.bodySemibold, color: C.primary },
  headerTitle: {
    fontSize: 17,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  previewCard: {
    marginBottom: 20,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    padding: 12,
    ...Shadow.sm,
  },
  previewLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemibold,
    color: C.textSub,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    marginBottom: 12,
  },
  regionRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderLight,
    marginBottom: 10,
    ...Shadow.xs,
  },
  regionRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  regionTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
  },
  sevPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sevPillTxt: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyBold },
  regionPred: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
  },
  regionMeta: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginTop: 4,
  },
  heatmapHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: C.floralSageSoft,
    borderWidth: 1,
    borderColor: C.borderSage,
  },
  heatmapHintTxt: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 20,
  },
});

// ── History Screen Styles ────────────────────────────────────────────────────
const hs = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  titleBlock: {
    marginHorizontal: Space[5],
    paddingHorizontal: Space[4],
    paddingVertical: Space[4],
    borderRadius: Radius.xl,
    marginBottom: Space[2],
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Shadow.xs,
  },
  pageTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
    marginTop: 6,
    lineHeight: 20,
  },
  pageSubtitleAccent: {
    fontFamily: FontFamily.displayItalic,
    color: C.floralSage,
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
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
    ...Shadow.sm,
  },
  multiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: C.floralPetal,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  multiBadgeTxt: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    letterSpacing: 0.2,
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
  analysisText: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
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
  actions: { flexDirection: 'row', gap: Space[2], marginTop: 2, flexWrap: 'wrap' },
  actionBtnRegions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, paddingHorizontal: 12, borderRadius: Radius.sm + 2,
    backgroundColor: C.floralSageSoft,
    borderWidth: 1, borderColor: C.borderSage,
  },
  actionBtnRegionsTxt: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemibold,
    color: C.floralSage,
    letterSpacing: 0.1,
  },
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
  actionBtnView: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, paddingHorizontal: 14, borderRadius: Radius.sm + 2,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1, borderColor: C.borderLight,
  },
  actionBtnViewTxt: {
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
  camModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  camModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  camModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  camModalTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
  },
  camModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
  },
  camModalImage: {
    width: '100%',
    height: 320,
    borderRadius: Radius.md,
    backgroundColor: C.surfaceAlt,
  },
});
