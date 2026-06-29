import { useColorScheme } from 'react-native';

import { paletteFor, type Palette } from '@/theme/colors';

/** Returns the active palette based on the OS color scheme. */
export function usePalette(): Palette {
  const scheme = useColorScheme();
  return paletteFor(scheme === 'dark' ? 'dark' : 'light');
}
