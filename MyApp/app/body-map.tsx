import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Modal, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { C, FontSize, Radius, Space } from '@/constants/theme';
import { BodyMap } from '@/components/body/BodyMap';
import {
  loadBodyPoints, saveBodyPoint, type BodyPoint, type BodyPointMap,
} from '@/lib/bodyPointStorage';
import { useLesions } from '@/hooks/useLesions';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

export default function BodyMapScreen() {
  const router = useRouter();
  const { lesions, fetchLesions } = useLesions();
  const [points, setPoints] = useState<BodyPointMap>({});
  const [pickerPoint, setPickerPoint] = useState<BodyPoint | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const refreshPoints = useCallback(async () => {
    setPoints(await loadBodyPoints());
  }, []);

  useFocusEffect(useCallback(() => { void fetchLesions(); void refreshPoints(); }, [fetchLesions, refreshPoints]));

  const unplotted = useMemo(
    () => lesions.filter(l => !points[l._id]),
    [lesions, points],
  );

  const plotted = useMemo(
    () => lesions
      .filter(l => !!points[l._id])
      .map(l => ({ _id: l._id, title: l.title, status: l.status, bodyPoint: points[l._id] })),
    [lesions, points],
  );

  const onAssign = async (lesionId: string) => {
    if (!pickerPoint) return;
    await saveBodyPoint(lesionId, pickerPoint);
    setPickerPoint(null);
    await refreshPoints();
  };

  const detailLesion = detailId ? lesions.find(l => l._id === detailId) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Branded header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerIconBg}>
            <Feather name="map" size={16} color={C.primary} />
          </View>
          <Text style={s.headerTitle}>Body Map</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {lesions.length === 0 ? (
          <EmptyState
            icon="user"
            title="Nothing to map yet"
            message="Log your first lesion to see it appear on your body map."
            actionLabel="Scan lesion"
            onAction={() => router.push('/camera')}
          />
        ) : (
          <>
            <BodyMap
              lesions={plotted}
              onDotPress={id => setDetailId(id)}
              onEmptyPress={p => setPickerPoint(p)}
            />

            {unplotted.length > 0 && (
              <View style={s.unplottedSection}>
                <Text style={s.unplottedTitle}>
                  {unplotted.length} unplotted lesion{unplotted.length === 1 ? '' : 's'}
                </Text>
                <Text style={s.unplottedSub}>
                  Tap the silhouette where a lesion is, then pick which one.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Picker modal — choose lesion to assign to tapped point */}
      <Modal visible={!!pickerPoint} transparent animationType="fade" onRequestClose={() => setPickerPoint(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setPickerPoint(null)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>Assign to a lesion</Text>
            <Text style={s.sheetSub}>Pick a lesion to plot at this location on the {pickerPoint?.side}.</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {unplotted.length === 0 ? (
                <Text style={s.noneTxt}>All lesions are already plotted.</Text>
              ) : unplotted.map(l => (
                <TouchableOpacity key={l._id} style={s.pickRow} onPress={() => onAssign(l._id)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickTitle} numberOfLines={1}>{l.title || 'Untitled'}</Text>
                    {!!l.location && <Text style={s.pickSub} numberOfLines={1}>{l.location}</Text>}
                  </View>
                  <StatusBadge status={l.status} size="sm" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Dot detail modal */}
      <Modal visible={!!detailLesion} transparent animationType="fade" onRequestClose={() => setDetailId(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setDetailId(null)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            {detailLesion && (
              <>
                <View style={s.detailHead}>
                  <Text style={s.sheetTitle}>{detailLesion.title}</Text>
                  <StatusBadge status={detailLesion.status} size="sm" />
                </View>
                {!!detailLesion.description && (
                  <Text style={s.detailBody}>{detailLesion.description}</Text>
                )}
                {!!detailLesion.location && (
                  <Text style={s.detailMeta}>📍 {detailLesion.location}</Text>
                )}
                <Text style={s.detailMeta}>
                  Logged {new Date(detailLesion.createdAt).toLocaleDateString()}
                </Text>
                <TouchableOpacity
                  style={s.detailBtn}
                  onPress={() => { setDetailId(null); router.push('/history'); }}
                  activeOpacity={0.8}>
                  <Text style={s.detailBtnTxt}>Open in History</Text>
                  <Feather name="arrow-right" size={14} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBg: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },

  unplottedSection: {
    marginHorizontal: Space[5],
    marginTop: Space[3],
    padding: Space[4],
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: C.border,
  },
  unplottedTitle: { fontSize: FontSize.sm, fontWeight: '800', color: C.text },
  unplottedSub: { fontSize: FontSize.xs, color: C.textSub, marginTop: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: Space[5],
    paddingBottom: Space[5] + 16,
  },
  sheetTitle: { fontSize: FontSize.base, fontWeight: '800', color: C.text },
  sheetSub:   { fontSize: FontSize.xs, color: C.textSub, marginTop: 4, marginBottom: Space[3] },
  noneTxt:    { fontSize: FontSize.sm, color: C.muted, textAlign: 'center', paddingVertical: Space[4] },

  pickRow: {
    flexDirection: 'row', alignItems: 'center', gap: Space[3],
    paddingVertical: Space[3],
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickTitle: { fontSize: FontSize.sm, fontWeight: '700', color: C.text },
  pickSub:   { fontSize: FontSize.xs, color: C.muted, marginTop: 2 },

  detailHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Space[2],
  },
  detailBody: { fontSize: FontSize.sm, color: C.textSub, marginBottom: Space[2], lineHeight: 20 },
  detailMeta: { fontSize: FontSize.xs, color: C.muted, marginBottom: 4 },
  detailBtn: {
    marginTop: Space[4],
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
  },
  detailBtnTxt: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
});
