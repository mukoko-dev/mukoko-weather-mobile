/**
 * Root layout. Loads brand fonts, wires the auth token resolver, kicks off
 * device registration (idempotent), and mounts the navigation stack.
 *
 * We use a Stack here so /location/[slug], /sign-in, and /sign-in-callback
 * push above the tabs. The (tabs) group renders the actual NativeTabs.
 */

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAuth } from '@/api/auth';
import { BRAND_FONTS } from '@/brand/fonts';
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
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
