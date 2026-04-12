import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR PALETTE
// Single source of truth for every colour used in the app.
// ─────────────────────────────────────────────────────────────────────────────

/** Skin health — warm rose / skin-tone palette */
export const C = {
  // ── Page & surface ──────────────────────────────────────────────────────────
  bg:          '#F8F4F2',   // Warm cream page background
  surface:     '#FFFFFF',   // Card / sheet surface
  surfaceAlt:  '#F3EDEB',   // Subtle alternative surface (input backgrounds, dividers)
  overlay:     'rgba(0,0,0,0.45)', // Modal scrim

  // ── Typography ──────────────────────────────────────────────────────────────
  text:        '#1E1010',   // Primary text — deep warm almost-black
  textSub:     '#5A3535',   // Secondary text — warm brown
  textHint:    '#A07070',   // Placeholder / hint text
  muted:       '#9B7878',   // Muted — labels, captions

  // ── Primary brand ───────────────────────────────────────────────────────────
  primary:     '#9B3058',   // Deep rose / cranberry — CTAs, active states
  primaryDark: '#7A2344',   // Pressed / active shade
  primaryMid:  '#C24570',   // Medium rose — hover tint
  primaryLight:'#FAE8EF',   // Very light blush — tinted backgrounds

  // Keep old alias so existing screens don't break before redesign
  blue:        '#9B3058',
  blueFill:    '#C24570',
  blueLight:   '#FAE8EF',
  white:       '#FFFFFF',
  cardBg:      '#FDF5F3',
  cardGray:    '#F7F0EE',

  // ── Borders ─────────────────────────────────────────────────────────────────
  border:      '#E8D8D5',
  borderLight: '#F2E8E6',
  borderFocus: '#9B3058',   // Input focus ring

  // ── Status — medical traffic-light ──────────────────────────────────────────
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

  // ── Accent colours ──────────────────────────────────────────────────────────
  amber:       '#B45309',
  amberFill:   '#D97706',
  amberLight:  '#FEF3C7',
  purple:      '#6D28D9',
  purpleFill:  '#8B5CF6',
  purpleLight: '#EDE9FE',
  sage:        '#FAE8EF',
  sageDark:    '#9B3058',
  sageMid:     '#C24570',

  // ── Navigation (bottom tab bar) ─────────────────────────────────────────────
  navPillBg:          '#FFFFFF',
  navCircleInactive:  '#F8F4F2',
  navCircleActive:    '#9B3058',
  navIconInactive:    '#9B7878',
  navIconActive:      '#FFFFFF',

  // ── Header chrome ────────────────────────────────────────────────────────────
  headerAvatarRing:   '#9B3058',
  bellBg:             '#FAE8EF',
  bellBadge:          '#DC2626',

  // ── Vital-card tints ─────────────────────────────────────────────────────────
  diagBlue:        '#FDE8EF',
  diagPeach:       '#FDEDE5',
  diagYellow:      '#FEF3C7',
  diagYellowDeep:  '#B84A3A',
  diagYellowPale:  '#FDEAE6',
  diagPurpleTint:  '#F0E8F8',
  diagPurpleRing:  '#DDD6FE',
  diagLine:        '#2B1A1A',
  diagPanelBorder: '#EDD9D5',
  lesCardBorder:   '#EEDBD8',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY SCALE
// Use these everywhere instead of hardcoded fontSize values.
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
} as const;

export const FontWeight = {
  regular:   '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  extrabold: '800',
} as const;

export const LineHeight = {
  tight:   1.2,  // multiply by fontSize
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.65,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SPACING SCALE  (4 pt grid)
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
  full: 9999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SHADOW / ELEVATION TOKENS
// Each token includes iOS shadow props + Android elevation.
// ─────────────────────────────────────────────────────────────────────────────

export const Shadow = {
  /** Very subtle — list rows, inner panels */
  xs: Platform.select({
    ios: {
      shadowColor: '#1E1010',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  }),
  /** Standard card shadow */
  sm: Platform.select({
    ios: {
      shadowColor: '#1E1010',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  }),
  /** Elevated card, modal sheet */
  md: Platform.select({
    ios: {
      shadowColor: '#1E1010',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
    default: {},
  }),
  /** Full modal, floating button */
  lg: Platform.select({
    ios: {
      shadowColor: '#1E1010',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
    },
    android: { elevation: 12 },
    default: {},
  }),
  /** Bottom sheet, prominent overlay */
  xl: Platform.select({
    ios: {
      shadowColor: '#1E1010',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.18,
      shadowRadius: 32,
    },
    android: { elevation: 20 },
    default: {},
  }),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT TOKENS
// Shared sizing and style rules for individual UI components.
// ─────────────────────────────────────────────────────────────────────────────

export const Button = {
  /** Height of each button size */
  height: { sm: 36, md: 44, lg: 52 },
  /** Horizontal padding inside button */
  paddingH: { sm: 14, md: 20, lg: 28 },
  radius: Radius.md,
  fontSize: { sm: FontSize.sm, md: FontSize.base, lg: FontSize.md },
  fontWeight: FontWeight.bold,
  /** Gap between icon and label text */
  iconGap: 8,
} as const;

export const Input = {
  height: 48,
  heightMulti: 96,         // multiline textarea
  paddingH: Space[4],
  paddingV: Space[3],
  borderWidth: 1.5,
  radius: Radius.md,
  fontSize: FontSize.base,
  labelSize: FontSize.sm,
  labelWeight: FontWeight.semibold,
  labelGap: 6,             // space between label and input box
  gap: Space[4],           // space between consecutive fields
} as const;

export const Card = {
  radius: Radius.lg,
  padding: Space[4],
  paddingLg: Space[5],
  borderWidth: 1,
} as const;

export const Badge = {
  paddingH: 10,
  paddingV: 4,
  radius: Radius.full,
  fontSize: FontSize.xs,
  fontWeight: FontWeight.bold,
  dotSize: 7,
} as const;

export const Avatar = {
  sm:  32,
  md:  40,
  lg:  56,
  xl:  88,
  borderWidth: 2.5,
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
  color: '#E8D8D5',       // same as C.border
  gapV: Space[4],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// FONT FAMILIES  (kept from original)
// ─────────────────────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Kept for any file that still imports Colors directly
export const Colors = {
  light: { text: '#11181C', background: '#fff', tint: C.primary, icon: '#687076', tabIconDefault: '#687076', tabIconSelected: C.primary },
  dark:  { text: '#ECEDEE', background: '#151718', tint: '#fff',  icon: '#9BA1A6', tabIconDefault: '#9BA1A6', tabIconSelected: '#fff' },
};
