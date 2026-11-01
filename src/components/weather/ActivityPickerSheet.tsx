/**
 * The activity picker (the web's My Weather modal, Activities tab): category
 * filter chips, a search field, and a grid of activity tiles that toggle on
 * and off. A selected tile takes its category's mineral for its border, tint
 * and check, and says "selected" to the screen reader.
 *
 * The selection is stored on this device only (`src/state/preferences.ts`) and
 * is never sent anywhere; the sheet says so. The list is the Worker's
 * `GET /v1/activities`, with the web's own seed showing at once and when the
 * Worker cannot be reached (the sheet says which it is showing).
 *
 * States: start (the grid), progress ("n selected", live), empty (no match for
 * a search, with a way to clear it), failure (the built-in list, said plainly),
 * and end (Done).
 */

import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { ActivityIcon, CheckIcon } from "@/components/icons/ActivityIcon";
import { SearchIcon } from "@/components/icons/Icon";
import { useActivityCatalogue } from "@/hooks/useActivityData";
import { usePageColors } from "@/hooks/usePageColors";
import {
  type Activity,
  type ActivityCategory,
  categoryMineral,
  filterActivities,
} from "@/shared/activities";
import { toggleActivity, usePreferences } from "@/state/preferences";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import { LANE, mineralColor, onMineral } from "@/theme/ratings";

import { DetailSheet } from "./DetailSheet";
import { PillButton } from "./PillButton";
import { SINGLE_COLUMN_FONT_SCALE } from "./InsightCard";
import { WxText } from "./WxText";

/** The tint behind a selected tile (`bg-mineral/10`). */
const SELECTED_TINT = 0.1;

export type ActivityPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function ActivityPickerSheet({
  visible,
  onClose,
}: ActivityPickerSheetProps) {
  const { colors, scheme } = usePageColors();
  const { fontScale } = useWindowDimensions();
  const { activities: selected } = usePreferences();
  const { activities, categories, source } = useActivityCatalogue(visible);
  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const [query, setQuery] = useState("");

  const items = useMemo(
    () => filterActivities(activities, query, category),
    [activities, query, category],
  );
  const columns = fontScale > SINGLE_COLUMN_FONT_SCALE ? 1 : 2;
  const rows = useMemo(() => {
    const out: Activity[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      out.push(items.slice(i, i + columns));
    }
    return out;
  }, [items, columns]);

  const count = selected.length;

  return (
    <DetailSheet
      visible={visible}
      title="Choose activities"
      description="Pick what you follow the weather for. Your picks stay on this device and are never sent anywhere."
      onClose={onClose}
      testID="activity-picker"
      footer={<PillButton label="Done" size="md" stretch onPress={onClose} />}
    >
      <WxText
        type="body"
        weight={600}
        color={colors.textPrimary}
        accessibilityLiveRegion="polite"
      >
        {count === 0
          ? "None selected"
          : count === 1
            ? "1 selected"
            : `${count} selected`}
      </WxText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Activity categories, scroll horizontally"
        contentContainerStyle={styles.chips}
      >
        <Chip
          label="All"
          selected={category === "all"}
          fill={colors.primary}
          ink={onMineral(scheme)}
          onPress={() => setCategory("all")}
        />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            selected={category === c.id}
            fill={mineralColor(categoryMineral(c.id), colors, scheme)}
            ink={onMineral(scheme)}
            onPress={() => setCategory(c.id)}
          />
        ))}
      </ScrollView>

      <View
        style={[
          styles.search,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <SearchIcon size={SIZE.iconSm} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search activities"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Search activities"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={[styles.input, { color: colors.textPrimary }]}
        />
      </View>

      {source === "builtin" ? (
        <WxText
          type="bodySm"
          color={colors.textTertiary}
          accessibilityRole="alert"
        >
          Could not reach the weather service, so this is the list saved in the
          app.
        </WxText>
      ) : null}

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <WxText type="body" color={colors.textSecondary} align="center">
            {query.trim()
              ? `No activities match "${query.trim()}".`
              : "No activities in this category."}
          </WxText>
          <PillButton
            label="Show all activities"
            variant="outline"
            onPress={() => {
              setQuery("");
              setCategory("all");
            }}
          />
        </View>
      ) : (
        <View style={styles.grid} accessibilityLabel="Available activities">
          {rows.map((row) => (
            <View key={row[0].id} style={styles.row}>
              {row.map((a) => (
                <Tile
                  key={a.id}
                  activity={a}
                  selected={selected.includes(a.id)}
                />
              ))}
              {row.length < columns ? <View style={styles.cell} /> : null}
            </View>
          ))}
        </View>
      )}
    </DetailSheet>
  );
}

function Chip({
  label,
  selected,
  fill,
  ink,
  onPress,
}: {
  label: string;
  selected: boolean;
  fill: string;
  ink: string;
  onPress: () => void;
}) {
  const { colors } = usePageColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: fill, borderColor: fill }
          : { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <WxText
        type="body"
        weight={600}
        color={selected ? ink : colors.textSecondary}
      >
        {label}
      </WxText>
    </Pressable>
  );
}

function Tile({
  activity,
  selected,
}: {
  activity: Activity;
  selected: boolean;
}) {
  const { colors, scheme } = usePageColors();
  const mineral = mineralColor(
    categoryMineral(activity.category),
    colors,
    scheme,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${activity.label}: ${activity.description}`}
      accessibilityState={{ selected }}
      accessibilityHint={
        selected ? "Double tap to remove" : "Double tap to add"
      }
      onPress={() => toggleActivity(activity.id)}
      testID={`activity-tile-${activity.id}`}
      style={[
        styles.tile,
        selected
          ? {
              borderColor: mineral,
              backgroundColor: withAlpha(mineral, SELECTED_TINT),
              borderWidth: BORDER.active,
            }
          : {
              borderColor: colors.border,
              backgroundColor: colors.background,
              borderWidth: BORDER.rest,
            },
      ]}
    >
      {selected ? (
        <View
          style={[styles.check, { backgroundColor: mineral }]}
          importantForAccessibility="no-hide-descendants"
        >
          <CheckIcon size={SIZE.iconSm} color={onMineral(scheme)} />
        </View>
      ) : null}
      <ActivityIcon
        icon={activity.icon}
        size={SIZE.iconMd}
        color={selected ? mineral : colors.textTertiary}
      />
      <WxText
        type="body"
        weight={600}
        align="center"
        color={selected ? mineral : colors.textSecondary}
      >
        {activity.label}
      </WxText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { gap: SPACE.snug, paddingVertical: SPACE.hair },
  chip: {
    minHeight: TOUCH.min,
    paddingHorizontal: SPACE.card,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.rest,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    minHeight: TOUCH.min,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.snug,
    paddingHorizontal: SPACE.stack,
    borderRadius: RADIUS.input,
    borderWidth: BORDER.rest,
  },
  input: { flex: 1, minHeight: TOUCH.min },
  grid: { gap: SPACE.cozy },
  row: { flexDirection: "row", gap: SPACE.cozy },
  cell: { flex: 1 },
  tile: {
    flex: 1,
    minHeight: LANE.pickerTile,
    borderRadius: RADIUS.card,
    padding: SPACE.stack,
    gap: SPACE.snug,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    position: "absolute",
    top: SPACE.tight,
    right: SPACE.tight,
    width: LANE.check,
    height: LANE.check,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    gap: SPACE.stack,
    paddingVertical: SPACE.card,
  },
});
