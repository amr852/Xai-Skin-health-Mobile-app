import { Platform, StyleSheet } from 'react-native';
import { C } from '@/constants/theme';

export const vitalStyles = StyleSheet.create({
  // ── Shared elements ───────────────────────────────────────────
  vStatusDot: { width: 6, height: 6, borderRadius: 3 },
  vBarFill: { height: '100%', borderRadius: 99 },

  // ── Stepper controls (+/–) ────────────────────────────────────
  vValueStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  vStepperValueMid: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vStepBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,          // full circle
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.09)',
    // subtle shadow so it lifts off the card background
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  vStepBtnDisabled: { opacity: 0.30 },

  // ── Goal value display ────────────────────────────────────────
  vVitalsGoalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    flexShrink: 1,
    justifyContent: 'center',
    columnGap: 3,
    rowGap: 2,
  },
  vVitalsGoalText: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  // ════════════════════════════════════════════════════════════════
  // WAVE CARD  (hydration — blush pink bg)
  // ════════════════════════════════════════════════════════════════
  vBoxWave: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: C.diagBlue,   // Blush pink
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#9B3058', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 3 } : { boxShadow: '0 3px 14px rgba(155,48,88,0.08)' }),
  },
  vWaveHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  vWhiteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  vWaveTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vWaveBig: {
    fontSize: 30,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -1,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vWaveUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSub,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vWaveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 8,
  },
  vWaveStatus: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vBarBgWave: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: 'rgba(155,48,88,0.15)',
  },

  // ── Sleep target label ─────────────────────────────────────────
  vSleepWaveTargetCol: { justifyContent: 'flex-end', marginBottom: 2 },
  vSleepWaveTarget: {
    fontSize: 17,
    fontWeight: '600',
    color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vSleepWaveTargetLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    marginTop: 1,
    letterSpacing: 0.3,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vSleepWaveSub: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 2,
    lineHeight: 17,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  // ════════════════════════════════════════════════════════════════
  // SLEEP WAVE CARD  (lavender bg)
  // ════════════════════════════════════════════════════════════════
  vBoxSleepWave: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: C.diagPurpleTint,   // Soft lavender
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 3 } : { boxShadow: '0 3px 14px rgba(109,40,217,0.08)' }),
  },
  vSleepWaveValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    marginBottom: 2,
    gap: 2,
  },
  vSleepWaveSlash: {
    fontSize: 18,
    fontWeight: '400',
    color: C.muted,
    marginBottom: 4,
    paddingHorizontal: 2,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vBarBgSleepWave: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: 'rgba(109,40,217,0.14)',
  },

  // ════════════════════════════════════════════════════════════════
  // SEGMENTS CARD  (warm peach bg — UV index)
  // ════════════════════════════════════════════════════════════════
  vBoxSeg: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: C.diagPeach,   // Warm peach
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#B84A3A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 3 } : { boxShadow: '0 3px 14px rgba(184,74,58,0.08)' }),
  },
  vSegTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  vWhiteIconCircleSm: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  vSegTitleBlock: { flex: 1, minWidth: 0 },
  vSegBig: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vSegBigUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSub,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vSegSub: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSub,
    marginTop: 2,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vSegStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 10 },
  vSegStatus: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vSegBarRow: { flexDirection: 'row', gap: 6, width: '100%' },
  vSegCell: { flex: 1, minWidth: 0, alignItems: 'center' },
  vSegChunk: {
    width: '100%',
    height: 12,
    borderRadius: 7,
    marginBottom: 6,
  },
  vSegLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: C.textSub,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vBarBgSeg: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
    width: '100%',
    marginTop: 12,
    backgroundColor: 'rgba(184,74,58,0.15)',
  },

  // ════════════════════════════════════════════════════════════════
  // PANEL CARD  (lavender bg — sleep alternative)
  // ════════════════════════════════════════════════════════════════
  vBoxPanel: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.diagPurpleTint,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.diagPanelBorder,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 }
      : Platform.OS === 'android' ? { elevation: 3 } : { boxShadow: '0 3px 14px rgba(109,40,217,0.07)' }),
  },
  vPanelLeft: { flexShrink: 0 },
  vPanelMoonCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  vPanelRight: { flex: 1, minWidth: 0 },
  vPanelTitleRow: { flexDirection: 'row', alignItems: 'center' },
  vPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vPanelSleepRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 2,
    flexWrap: 'wrap',
    columnGap: 4,
    rowGap: 2,
  },
  vPanelSleepTargetLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    marginTop: 2,
    letterSpacing: 0.3,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vPanelDesc: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 5,
    lineHeight: 17,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vPanelPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  vPanelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 99,
  },
  vPanelPillDot: { width: 6, height: 6, borderRadius: 3 },
  vPanelPillTxt: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  vBarBgPanel: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: 'rgba(109,40,217,0.14)',
    marginTop: 12,
  },
});
