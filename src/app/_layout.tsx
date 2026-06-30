/**
 * Root layout. Loads brand fonts, wires the auth token resolver, kicks off
 * device registration (idempotent), mounts the navigation stack, and pins
 * the 7-mineral BrandStripe to the LEFT edge of the viewport.
 *
 * Layout shape:
 *   <SafeAreaProvider>
 *     <ThemeProvider>
 *       <Row>
 *         <BrandStripe />     ← 3dp vertical, full-height, ALWAYS left edge
 *         <Stack>             ← all routes (tabs + modals + detail pages)
 *       </Row>
 *     </ThemeProvider>
 *   </SafeAreaProvider>
 *
 * /location/[slug], /sign-in, and /sign-in-callback push above the tabs.
 * The (tabs) group renders the actual bottom Tabs.
 */

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAuth } from '@/api/auth';
import { BRAND_FONTS } from '@/brand/fonts';
import { BrandStripe } from '@/components/BrandStripe';
import { registerDevice } from '@/device/register';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden — fine */
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(BRAND_FONTS);
  const colorScheme = useColorScheme();

  useEffect(() => {
    initAuth();
    // Fire-and-forget; the result is logged in dev. We don't want to gate
    // the UI on device registration succeeding.
    void registerDevice();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        /* noop */
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <BrandStripe width={3} />
          <View style={{ flex: 1 }}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="location/[slug]"
                options={{ title: 'Location', presentation: 'card' }}
              />
              <Stack.Screen
                name="sign-in"
                options={{ title: 'Sign in', presentation: 'modal' }}
              />
              <Stack.Screen
                name="sign-in-callback"
                options={{ title: 'Signing in...', presentation: 'modal' }}
              />
            </Stack>
          </View>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
