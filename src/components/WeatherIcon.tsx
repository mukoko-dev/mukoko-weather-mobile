/**
 * WMO weather code -> Lucide icon mapper.
 *
 * Lucide ships a React Native build (`lucide-react-native`) but adding a 2MB
 * dependency for the bootstrap is overkill. Instead we expose a tiny mapper
 * that returns the icon NAME — screens then render an emoji glyph as a
 * placeholder. Once we add lucide-react-native we swap the renderer with no
 * caller-side changes.
 */

import { BrandText } from '@/components/BrandText';
import { type TypographyVariant } from '@/theme/typography';

/** WMO weather code ranges — same buckets mukoko-weather uses. */
export type WeatherIconName =
  | 'sun'
  | 'cloud-sun'
  | 'cloud'
  | 'cloud-rain'
  | 'cloud-drizzle'
  | 'cloud-snow'
  | 'cloud-lightning'
  | 'cloud-fog'
  | 'wind';

const GLYPH: Record<WeatherIconName, string> = {
  sun: '☀',
  'cloud-sun': '⛅',
  cloud: '☁',
  'cloud-rain': '🌧',
  'cloud-drizzle': '☔',
  'cloud-snow': '❄',
  'cloud-lightning': '⚡',
  'cloud-fog': '🌫',
  wind: '🌬',
};

export function iconForWmo(code: number | null | undefined, isDay = true): WeatherIconName {
  if (code === null || code === undefined) return 'cloud';
  if (code === 0) return isDay ? 'sun' : 'cloud-sun';
  if (code >= 1 && code <= 2) return 'cloud-sun';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'cloud-fog';
  if (code >= 51 && code <= 57) return 'cloud-drizzle';
  if (code >= 61 && code <= 67) return 'cloud-rain';
  if (code >= 71 && code <= 77) return 'cloud-snow';
  if (code >= 80 && code <= 82) return 'cloud-rain';
  if (code >= 85 && code <= 86) return 'cloud-snow';
  if (code >= 95 && code <= 99) return 'cloud-lightning';
  return 'cloud';
}

export type WeatherIconProps = {
  code: number | null | undefined;
  isDay?: boolean;
  variant?: TypographyVariant;
};

export function WeatherIcon({ code, isDay = true, variant = 'display' }: WeatherIconProps) {
  const name = iconForWmo(code, isDay);
  return (
    <BrandText variant={variant} accessibilityElementsHidden>
      {GLYPH[name]}
    </BrandText>
  );
}
