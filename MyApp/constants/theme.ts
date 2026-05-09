import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM FLORAL × CLINICAL — Xai Skin Health
//
// Warm paper backgrounds, rose accent, soft sage highlights. Status colours
// stay high-contrast for safety. Borders pick up a dusty floral warmth.
//
// Decoration policy: every visual element here serves data or brand. Pure
// ornament is forbidden. The DECORATION_BUDGET map below tracks where each
// purposeful element is allowed to render — never more than twice.
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  // ── Page & surface (warm floral paper) ─────────────────────────────────────
  bg:          '#F5F0EC',   // warm linen — primary screen canvas
  surface:     '#FFFCFA',   // card / sheet — soft white with peach bias
  surfaceAlt:  '#EFE8E3',   // inputs, chips, soft wells
  cream:       '#FAF4EF',   // legacy alias — warm cream
  ivory:       '#FFFCFA',
  sand:        '#E5D9D2',   // muted rose-beige
  overlay:     'rgba(15,23,42,0.45)', // slate-900 scrim

  // ── Typography ──────────────────────────────────────────────────────────────
  text:        '#0F172A',   // slate-900 — primary
  textSub:     '#475569',   // slate-600 — secondary
  textHint:    '#94A3B8',   // slate-400 — placeholder/meta (passes 3:1 against bg)
  muted:       '#64748B',   // slate-500 — labels/captions

  // ── Primary brand (rose, single accent) ─────────────────────────────────────
  primary:     '#9B3058',   // brand rose — CTAs, active state, links
  primaryDeep: '#5C1B36',   // pressed + gradient end-stop
  primaryDark: '#5C1B36',   // legacy alias
  primaryMid:  '#C24570',   // hover (rare on mobile)
  primaryLight:'#FCE7EE',   // tinted bg, used sparingly
  primarySoft: '#F4B8BC',   // legacy alias — phasing out

  // ── Legacy aliases (preserved so existing screens compile during migration) ─
  blush:       '#FCE7EE',
  petal:       '#F4B8BC',
  rose:        '#C24570',
  deepRose:    '#5C1B36',
  blue:        '#9B3058',
  blueFill:    '#C24570',
  blueLight:   '#FCE7EE',
  white:       '#FFFFFF',
  cardBg:      '#FFFFFF',
  cardGray:    '#F1F5F9',
  // The following used to mean "sage / gold". They are now neutralized to
  // prevent accidental reintroduction of the floral palette. Existing imports
  // continue to compile but render in the slate-neutral system instead.
  sage:        '#475569',
  sageSoft:    '#F1F5F9',
  sageDeep:    '#334155',
  sageDark:    '#0F172A',
  sageMid:     '#9B3058',
  gold:        '#9B3058',
  goldSoft:    '#FCE7EE',

  // ── Borders ─────────────────────────────────────────────────────────────────
  border:      '#E5D8D4',   // dusty rose-gray
  borderLight: '#F2EAE6',
  borderFocus: '#9B3058',
  borderSage:  '#C5D4C0',   // soft sage hairline (floral accent)

  // ── Floral accents (non-status decoration only) ────────────────────────────
  floralSage:     '#6B8B6E',
  floralSageSoft: '#E8F0E9',
  floralHeroTop:  '#FAF6F3',
  floralHeroBot:  '#F3EBE5',
  floralPetal:    'rgba(155, 48, 88, 0.08)',

  // ── Status — medical traffic-light (UNCHANGED for clinical safety) ──────────
  stableText:  '#166534',
  stableBg:    '#DCFCE7',
  stableBorder:'#86EFAC',
  checkText:   '#92400E',
  checkBg:     '#FEF3C7',
  checkBorder: '#FCD34D',
  urgentText:  '#991B1B',
  urgentBg:    '#FEE2E2',
  urgentBorder:'#FCA5A5',
  warnText:    '#854D0E',
  warnBg:      '#FEFCE8',
  warnBorder:  '#D97706',

  // ── Auxiliary palette ───────────────────────────────────────────────────────
  amber:       '#B45309',
  amberFill:   '#D97706',
  amberLight:  '#FEF3C7',
  purple:      '#7C3AED',
  purpleFill:  '#8B5CF6',
  purpleLight: '#EDE9FE',

  // ── Navigation (bottom tab bar) ─────────────────────────────────────────────
  navPillBg:          '#FFFFFF',
  navCircleInactive:  '#F1F5F9',
  navCircleActive:    '#9B3058',
  navIconInactive:    '#64748B',
  navIconActive:      '#FFFFFF',

  // ── Header chrome ────────────────────────────────────────────────────────────
  headerAvatarRing:   '#9B3058',
  bellBg:             '#FCE7EE',
  bellBadge:          '#9B3058',

  // ── Vital-card tints ─────────────────────────────────────────────────────────
  diagBlue:        '#FCE7EE',
  diagPeach:       '#FEF3C7',
  diagYellow:      '#FEF3C7',
  diagYellowDeep:  '#B45309',
  diagYellowPale:  '#FEF3C7',
  diagPurpleTint:  '#EDE9FE',
  diagPurpleRing:  '#DDD6FE',
  diagLine:        '#0F172A',
  diagPanelBorder: '#E2E8F0',
  lesCardBorder:   '#E2E8F0',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT TOKENS — the only allowed gradient in the system
// ─────────────────────────────────────────────────────────────────────────────

export const Gradient = {
  hero:        ['#9B3058', '#5C1B36'] as const,
  heroAngle:   16, // degrees
  surfaceTint: ['#FFFCFA', '#F5F0EC'] as const, // warm card inner highlight
  /** History / soft headers — rose wash without full hero saturation */
  floralBand:  ['#FAF6F3', '#F3EBE5'] as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAY TOKENS — translucent layers used over the gradient hero, camera
// preview, scrim'd modals, etc. Centralized here so a brand opacity tweak is
// one edit, not fifteen rgba() literals.
// ─────────────────────────────────────────────────────────────────────────────

export const Overlay = {
  // White-on-color (used over the gradient hero — petals, hairlines, chip text)
  whiteFaint:    'rgba(255,255,255,0.18)',  // chip backgrounds
  whiteSoft:     'rgba(255,255,255,0.28)',  // chip border, secondary stroke
  whiteSubtle:   'rgba(255,255,255,0.32)',  // primary petal opacity
  whiteMuted:    'rgba(255,255,255,0.55)',  // petal core color
  whiteHigh:     'rgba(255,255,255,0.78)',  // body text on hero
  whiteHigher:   'rgba(255,255,255,0.85)',  // pulse line stroke
  whiteAlmost:   'rgba(255,255,255,0.92)',  // chip text
  // Dark scrims (used over photos / modals)
  scrimSoft:     'rgba(15,23,42,0.20)',     // light dim
  scrimMedium:   'rgba(15,23,42,0.45)',     // standard modal scrim (alias of C.overlay)
  scrimStrong:   'rgba(0,0,0,0.50)',        // photo capture scrim
  scrimBlack:    'rgba(0,0,0,0.65)',        // full-photo viewer
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DECORATION BUDGET
//
// Hard rule: each decorative element appears in at most TWO places across the
// app. New screens cannot exceed this without revising the system.
// ─────────────────────────────────────────────────────────────────────────────

export const DECORATION_BUDGET = {
  GradientHero:   ['auth.welcome', 'home.greetingStrip'],
  Crest:          ['auth.welcome',  'auth.login'],
  PulseLine:      ['home.greetingStrip', 'home.uvCard'],
  GridBackplate:  ['home.uvCard',  'vitals.ringCard'],
  StatusArc:      ['history.row',  'home.sunCard'],
  Hairline:       ['profile.section', 'history.filterBar'],
  ItalicAccent:   ['auth.welcome.tagline', 'history.empty'],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY SCALE
// ─────────────────────────────────────────────────────────────────────────────

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const FontWeight = {
  regular:   '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  extrabold: '800',
} as const;

export const LineHeight = {
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.65,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// FONT FAMILIES
// Inter — every UI text (numbers, labels, body, headings).
// Source Serif 4 italic — exactly one tagline per screen, max two screens.
// ─────────────────────────────────────────────────────────────────────────────

export const FontFamily = {
  display:        'Inter_600SemiBold',
  displayBold:    'Inter_700Bold',
  // displayItalic kept as a token name but resolves to Source Serif 4 italic.
  // Use sparingly — see DECORATION_BUDGET.ItalicAccent.
  displayItalic:  'SourceSerif4_400Italic',
  displayLight:   'Inter_400Regular',
  body:           'Inter_400Regular',
  bodyMedium:     'Inter_500Medium',
  bodySemibold:   'Inter_600SemiBold',
  bodyBold:       'Inter_700Bold',
  bodyExtrabold:  'Inter_800ExtraBold',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans:    'Inter_400Regular',
    serif:   'SourceSerif4_400Italic',
    rounded: 'Inter_400Regular',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'Inter_400Regular',
    serif:   'SourceSerif4_400Italic',
    rounded: 'Inter_400Regular',
    mono:    'monospace',
  },
  web: {
    sans:    "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif:   "'Source Serif 4', Georgia, 'Times New Roman', serif",
    rounded: "Inter, system-ui, sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SPACING SCALE (4 pt grid)
// ─────────────────────────────────────────────────────────────────────────────

export const Space = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// BORDER RADIUS SCALE
// ─────────────────────────────────────────────────────────────────────────────

export const Radius = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  petal: 24,    // legacy alias (no longer petal-shaped)
  full: 9999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SHADOW / ELEVATION TOKENS
// Restrained slate shadows — no brand tint. Medical-quiet.
// ─────────────────────────────────────────────────────────────────────────────

const SHADOW_COLOR = '#0F172A'; // slate-900

export const Shadow = {
  xs: Platform.select({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  }),
  sm: Platform.select({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 20,
    },
    android: { elevation: 12 },
    default: {},
  }),
  xl: Platform.select({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.14,
      shadowRadius: 32,
    },
    android: { elevation: 20 },
    default: {},
  }),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export const Button = {
  height: { sm: 36, md: 46, lg: 52 },
  paddingH: { sm: 14, md: 22, lg: 30 },
  radius: 14,
  fontSize: { sm: FontSize.sm, md: FontSize.base, lg: FontSize.md },
  fontWeight: FontWeight.semibold,
  iconGap: 8,
} as const;

export const Input = {
  height: 48,
  heightMulti: 100,
  paddingH: Space[4],
  paddingV: Space[3],
  borderWidth: 1.25,
  radius: 12,
  fontSize: FontSize.base,
  labelSize: FontSize.sm,
  labelWeight: FontWeight.semibold,
  labelGap: 6,
  gap: Space[4],
} as const;

export const Card = {
  radius: 20,
  padding: Space[4],
  paddingLg: Space[5],
  borderWidth: 1,
} as const;

export const Badge = {
  paddingH: 10,
  paddingV: 4,
  radius: Radius.full,
  fontSize: FontSize.xs,
  fontWeight: FontWeight.semibold,
  dotSize: 6,
} as const;

export const Avatar = {
  sm:  32,
  md:  40,
  lg:  56,
  xl:  88,
  borderWidth: 2,
} as const;

export const IconSize = {
  xs:  14,
  sm:  16,
  md:  20,
  lg:  22,
  xl:  28,
  '2xl': 36,
} as const;

export const Divider = {
  thickness: 1,
  color: '#E2E8F0',
  gapV: Space[4],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY: Floral / wellness tokens — kept as no-ops so existing imports
// continue to compile during the migration. Do NOT introduce new uses.
// ─────────────────────────────────────────────────────────────────────────────

export const Floral = {
  decorOpacity: 0,
  bloomCenter:  '#9B3058',
  leafLight:    '#94A3B8',
  leafDark:     '#475569',
  petalLight:   '#FCE7EE',
  petalDark:    '#9B3058',
  bloomCore:    '#F4B8BC',
  sway:         { duration: 4000, angleDeg: 0 },
  bloomIn:      { duration: 220, fromScale: 1 },
  press:        { duration: 150, scale: 0.97 },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY EXPORT (do not remove — external imports still rely on it)
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  light: { text: C.text, background: C.bg, tint: C.primary, icon: C.muted, tabIconDefault: C.muted, tabIconSelected: C.primary },
  dark:  { text: '#ECEDEE', background: '#151718', tint: '#fff',  icon: '#9BA1A6', tabIconDefault: '#9BA1A6', tabIconSelected: '#fff' },
};
