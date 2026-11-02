/**
 * The ⋯ menu, as a native sheet (the web's phone menu, PhoneMenu): opened
 * from the hero's account control on every weather page. The brand at the
 * top, then My Location, the weather map, Saved locations, Explore and
 * My Weather (sign in, theme, activities). Rows come from src/shell/menu.ts.
 */

import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NavigationIcon, SparklesIcon } from "@/components/icons/Icon";
import { MukokoLogo } from "@/components/MukokoLogo";
import {
  CloseIcon,
  CompassIcon,
  ListIcon,
  MapIcon,
  SettingsIcon,
} from "@/components/shell/ShellIcons";
import { WxText } from "@/components/weather/WxText";
import { usePageColors } from "@/hooks/usePageColors";
import { isFeatureEnabled } from "@/shared/feature-flags";
import { placeSlugOf } from "@/components/shell/AppChrome";
import { useShell } from "@/components/shell/ShellContext";
import { type MenuIcon, visibleMenuRows } from "@/shell/menu";
import { mapRoute } from "@/shell/routes";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";

function RowIcon({ icon, color }: { icon: MenuIcon; color: string }) {
  const size = SIZE.iconMd;
  switch (icon) {
    case "location":
      return <NavigationIcon size={size} color={color} />;
    case "map":
      return <MapIcon size={size} color={color} />;
    case "list":
      return <ListIcon size={size} color={color} />;
    case "compass":
      return <CompassIcon size={size} color={color} />;
    case "chat":
      return <SparklesIcon size={size} color={color} />;
    default:
      return <SettingsIcon size={size} color={color} />;
  }
}

/**
 * Close the sheet, then show `route`. The map opens over the page instead,
 * for the place under the menu (`slug`).
 */
export function openFromMenu(route: string, slug: string | null) {
  if (route === "/map") {
    router.replace(mapRoute(slug) as never);
    return;
  }
  router.dismissTo(route as never);
}

export default function MenuSheet() {
  const { colors } = usePageColors();
  const insets = useSafeAreaInsets();
  const rows = visibleMenuRows(isFeatureEnabled);
  const slug = placeSlugOf(useShell().basePath);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.body,
        { paddingBottom: SPACE.section + insets.bottom },
      ]}
    >
      <View style={styles.head}>
        <MukokoLogo size={28} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={() => router.back()}
          style={[styles.close, { borderColor: colors.border }]}
        >
          <CloseIcon size={SIZE.iconMd} color={colors.textPrimary} />
        </Pressable>
      </View>
      <View
        style={[
          styles.group,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {rows.map((row, i) => (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            accessibilityHint={row.description}
            onPress={() => openFromMenu(row.route, slug)}
            testID={`menu-${row.id}`}
            style={({ pressed }) => [
              styles.row,
              i > 0 && {
                borderTopColor: colors.border,
                borderTopWidth: BORDER.rest,
              },
              pressed && {
                backgroundColor: withAlpha(colors.textPrimary, 0.06),
              },
            ]}
          >
            <RowIcon icon={row.icon} color={colors.primary} />
            <View style={styles.rowText}>
              <WxText type="body" weight={600} color={colors.textPrimary}>
                {row.label}
              </WxText>
              <WxText type="bodySm" color={colors.textSecondary}>
                {row.description}
              </WxText>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: SPACE.gutter, gap: SPACE.section },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  close: {
    width: TOUCH.min,
    height: TOUCH.min,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.rest,
    alignItems: "center",
    justifyContent: "center",
  },
  group: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    overflow: "hidden",
  },
  row: {
    minHeight: TOUCH.default,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.stack,
    paddingHorizontal: SPACE.card,
    paddingVertical: SPACE.cozy,
  },
  rowText: { flex: 1, minWidth: 0 },
});
