/**
 * Mukoko brand kit doctrine v4.1.0 — Seven African Minerals.
 * Mirrors mukoko-weather's `src/app/globals.css`. Update both files in lockstep.
 *
 * Ring order (clockwise from top): cobalt -> gold -> malachite -> copper -> sodalite -> terracotta.
 * Tanzanite is the core / brand mineral.
 */

export const MINERALS = {
  cobalt: {
    light: '#0047AB',
    dark: '#00B0FF',
    containerLight: '#E3F2FD',
    onContainerLight: '#002966',
    origin: 'Katanga (DRC) & Zambian Copperbelt',
    use: 'Primary blue, links, CTAs',
  },
  tanzanite: {
    light: '#4B0082',
    dark: '#B388FF',
    containerLight: '#F3E5F5',
    onContainerLight: '#2E004D',
    origin: 'Merelani Hills, Tanzania',
    use: 'Brand / logo, social features',
  },
  malachite: {
    light: '#004D40',
    dark: '#64FFDA',
    containerLight: '#E0F2F1',
    onContainerLight: '#00332B',
    origin: 'Congo Copper Belt',
    use: 'Success states, positive actions',
  },
  gold: {
    light: '#5D4037',
    dark: '#FFD740',
    containerLight: '#FFF8E1',
    onContainerLight: '#3E2723',
    origin: 'African gold deposits',
    use: 'Honey, rewards, warmth',
  },
  terracotta: {
    light: '#A0522D',
    dark: '#E1B07E',
    containerLight: '#F5E6D3',
    onContainerLight: '#5D2906',
    origin: 'African earth',
    use: 'Earth, community, grounding',
  },
  sodalite: {
    light: '#283593',
    dark: '#3D5AFE',
    containerLight: '#E8EAF6',
    onContainerLight: '#1A237E',
    origin: 'Namibia / Angola',
    use: 'Intelligence, AI / Shamwari surfaces',
  },
  copper: {
    light: '#BF5A36',
    dark: '#FF8A65',
    containerLight: '#FBE4DA',
    onContainerLight: '#5A2310',
    origin: 'Zambian Copperbelt',
    use: 'Connection, community features',
  },
} as const;

export type MineralName = keyof typeof MINERALS;

export const SURFACE = {
  paper: '#F3F2EE',
  bone: '#F5F5F4',
  ink: '#141413',
  stone: '#1B1A17',
} as const;

/** 4 / 8 / 16 / 24 / 32 / 48 scale — matches web `tailwind` spacing. */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  button: 9999,
  card: 16,
  pill: 24,
  sm: 8,
} as const;

/** Material Design 3 recommended minimum touch target. */
export const TOUCH_TARGET_MIN = 56;

export const FONT_FAMILY = {
  display: 'NotoSerif_600SemiBold',
  displayRegular: 'NotoSerif_400Regular',
  body: 'NotoSans_400Regular',
  bodyBold: 'NotoSans_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  display: 32,
  hero: 48,
} as const;
