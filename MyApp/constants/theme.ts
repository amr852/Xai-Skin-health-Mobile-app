import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/** Skin health home / vitals palette */
export const C = {
  bg: '#FFFFFF',
  cardGray: '#EDECEA',
  white: '#FFFFFF',
  sage: '#C8E0A4',
  sageDark: '#3D5C1E',
  sageMid: '#4A7A22',
  text: '#1A1A18',
  muted: '#888077',
  border: '#D8D5CF',
  blue: '#1E7AAE',
  blueFill: '#5BAED0',
  blueLight: '#D4EEF8',
  amber: '#C08010',
  amberFill: '#E8A830',
  amberLight: '#FFF0CC',
  purple: '#6050B8',
  purpleFill: '#9080D0',
  purpleLight: '#EAE6F8',
  stableText: '#2A6A2A',
  stableBg: '#DCF0DC',
  checkText: '#8A5A00',
  checkBg: '#FFF0CC',
  urgentText: '#9B1C1C',
  urgentBg: '#FDE8E8',
  warnText: '#8A6010',
  warnBg: '#FFFBEC',
  warnBorder: '#D4922B',
  navPillBg: '#E6E5E2',
  navCircleInactive: '#FAFAF8',
  navCircleActive: '#1A1A1A',
  navIconInactive: '#3D3D3A',
  navIconActive: '#FFFFFF',
  diagBlue: '#CDE7FA',
  diagYellow: '#FFF2D6',
  diagYellowDeep: '#E8A830',
  diagYellowPale: '#FFF9EC',
  diagPurpleTint: '#F6F2FC',
  diagPurpleRing: '#D4CAF0',
  diagLine: '#1A1A18',
  diagPanelBorder: '#DDD4F0',
  lesCardBorder: '#E8E6E3',
  headerAvatarRing: '#F2D24A',
  bellBg: '#EBEBEB',
  bellBadge: '#E85D32',
} as const;
