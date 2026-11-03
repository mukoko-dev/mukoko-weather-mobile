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
 * /location/[slug] (and its /forecast and /atmosphere pages), /sign-in, and
 * /sign-in-callback push above the tabs. The (tabs) group holds the home,
 * Locations, Explore and My screens; its tab bar is not drawn. AppChrome
 * (src/components/shell) draws the one floating bottom bar over the weather
 * pages, as the web does, and /menu is the ⋯ menu as a native sheet.
 */

import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { recordAppOpen } from "@/analytics";
import { initAuth } from "@/api/auth";
import { BRAND_FONTS } from "@/brand/fonts";
import { BrandStripe } from "@/components/BrandStripe";
import { AppChrome } from "@/components/shell/AppChrome";
import { ModalGuard } from "@/components/shell/ModalGuard";
import { registerDevice } from "@/device/register";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden — fine */
});

/**
 * The most the native splash waits for the brand fonts. The shell below is
 * mounted at once either way (screens and their first requests start while the
 * fonts load); this only bounds how long the splash can cover it.
 */
const FONT_WAIT_MS = 400;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(BRAND_FONTS);
  const colorScheme = useColorScheme();
  // True once the splash has gone without the brand fonts.
  const [gaveUp, setGaveUp] = useState(false);
  // Bumped when the fonts arrive after the splash went (see below).
  const [lateFonts, setLateFonts] = useState(false);
  const shownWithoutFonts = useRef(false);

  useEffect(() => {
    initAuth();
    // Fire-and-forget; the result is logged in dev. We don't want to gate
    // the UI on device registration succeeding.
    void registerDevice();
    // first_open, once per install id; queued on the phone (src/analytics).
    recordAppOpen();
  }, []);

  // The app never waits on fonts: the shell renders on the first frame in the
  // system font, and the splash hides as soon as the brand fonts are ready or
  // FONT_WAIT_MS has passed, whichever is first.
  const fontsSettled = Boolean(fontsLoaded || fontError);
  const fontsSettledRef = useRef(fontsSettled);
  fontsSettledRef.current = fontsSettled;
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fontsSettledRef.current) shownWithoutFonts.current = true;
      setGaveUp(true);
    }, FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontsSettled || gaveUp) {
      SplashScreen.hideAsync().catch(() => {
        /* noop */
      });
    }
  }, [fontsSettled, gaveUp]);

  // Text laid out in the system font stays in it, so a brand font that only
  // arrives after the splash went re-keys the shell once to pick it up. The
  // usual case (fonts ready within FONT_WAIT_MS) never does.
  useEffect(() => {
    if (fontsLoaded && shownWithoutFonts.current) setLateFonts(true);
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView
      key={lateFonts ? "brand-fonts" : "first"}
      style={{ flex: 1 }}
    >
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <View style={{ flex: 1, flexDirection: "row" }}>
            <BrandStripe width={3} />
            <View style={{ flex: 1 }}>
              <AppChrome>
                {/* No native header by default: a place's pages (the location,
                    its forecast and atmosphere pages, and any page added under
                    it) carry their own top row with Back. The sign-in modals
                    keep theirs. */}
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="location/[slug]"
                    options={{ presentation: "card" }}
                  />
                  <Stack.Screen
                    name="menu"
                    options={{
                      presentation: "formSheet",
                      sheetAllowedDetents: "fitToContents",
                      sheetGrabberVisible: true,
                    }}
                  />
                  <Stack.Screen
                    name="map"
                    options={{ presentation: "fullScreenModal" }}
                  />
                  <Stack.Screen
                    name="sign-in"
                    options={{
                      headerShown: true,
                      title: "Sign in",
                      presentation: "modal",
                    }}
                  />
                  <Stack.Screen
                    name="sign-in-callback"
                    options={{
                      headerShown: true,
                      title: "Signing in...",
                      presentation: "modal",
                    }}
                  />
                </Stack>
                <ModalGuard />
              </AppChrome>
            </View>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
