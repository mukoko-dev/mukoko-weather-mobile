/**
 * The agriculture snapshot card (the web's `AgricultureSnapshot`): a glanceable
 * farm-weather view from `GET /v1/agriculture`. The day's verdict, the spray,
 * plant, harvest and irrigate windows, rain, soil, the water balance, growing
 * degree days, frost and heat risk, and the wind for spraying. Every number is
 * deterministic and comes from the Worker; nothing here is invented.
 *
 * States, all designed:
 *   - loading: bars in the card's own shape;
 *   - the request failed: what happened and "Try again";
 *   - the Worker said there is no farm data (`available: false`): its reason,
 *     in words, and whether trying again can help;
 *   - ready: the card.
 *
 * Shamwari's one-line farm advice and the briefing need an account. Sign-in is
 * switched off in the app, so the card says exactly that instead of a button
 * that leads nowhere.
 *
 * Colour: a window's tone (Go, Wait, Hold off) follows the severity
 * convention and is always printed as a word beside the dot. Malachite is the
 * card's accent only.
 */

import { StyleSheet, View } from "react-native";

import { type AgricultureResult } from "@/api/agriculture";
import { failureMessage } from "@/api/failure";
import { SparklesIcon } from "@/components/icons/Icon";
import { CropIcon } from "@/components/icons/PlaceIcons";
import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import { type AgricultureState, useAgriculture } from "@/hooks/useAgriculture";
import {
  type AgricultureResponse,
  MOISTURE_LABELS,
  RISK_TONE,
  STATUS_LABELS,
  STATUS_TONE,
  WINDOW_ORDER,
  WINDOW_TITLES,
  formatBalance,
  formatGdd,
  formatMm,
  formatMoisture,
  formatTempC,
  unavailableFor,
} from "@/shared/agriculture";
import { type PlaceInfo } from "@/shared/place-info";
import { FARM_SIZE } from "@/theme/farm";
import { RADIUS, SIZE, SPACE, withAlpha } from "@/theme/mzizi";

import { PillButton } from "./PillButton";
import { CardBody, CardHeading, CardNote, PlaceCard } from "./PlaceCard";
import { CardFailed, CardLoading } from "./RemoteStates";
import { StatTile, TilePairs, statTileSurface } from "./StatTiles";
import { WxText } from "./WxText";

/** Why Shamwari's farm advice is not here: said once, in the same words everywhere. */
export function advicePending(placeName: string): string {
  return `Shamwari's farm advice for ${placeName} needs an account, and sign-in is not available in the app yet.`;
}

export type AgricultureSnapshotViewProps = {
  place: PlaceInfo;
  state: AgricultureState;
  /**
   * "card" (the location page): the advice line and a link to the insights
   * page. "page" (top of the insights page): neither, the page has its own
   * briefing.
   */
  variant?: "card" | "page";
  onOpenInsights?: () => void;
};

export type AgricultureSnapshotProps = Omit<
  AgricultureSnapshotViewProps,
  "state"
> & {
  /** The user's farming crops (activity ids), possibly none. */
  crops: readonly string[];
  /** Changes when the page pulls a new forecast: the farm data asks again. */
  refreshKey?: unknown;
};

type Ready = Extract<AgricultureResult, { kind: "ready" }>["data"];

function windowTile(
  data: Ready,
  key: (typeof WINDOW_ORDER)[number],
  tone: string,
  textPrimary: string,
  tertiary: string,
  surface: string,
) {
  const w = data.windows![key];
  return (
    <View
      key={key}
      accessible
      accessibilityLabel={`${WINDOW_TITLES[key]}: ${STATUS_LABELS[w.status]}. ${w.label}`}
      accessibilityHint={w.detail}
      style={statTileSurface(
        "card",
        { card: surface, border: surface },
        surface,
      )}
    >
      <View style={styles.tileHead}>
        <View
          style={[styles.dot, { backgroundColor: tone }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <WxText type="bodySm" color={tertiary}>
          {WINDOW_TITLES[key]}
        </WxText>
        <WxText type="bodySm" weight={600} color={tone}>
          {STATUS_LABELS[w.status]}
        </WxText>
      </View>
      <WxText type="body" weight={600} color={textPrimary}>
        {w.label}
      </WxText>
    </View>
  );
}

/** The stats under the windows, as the web's six: label and value. */
export function snapshotStats(
  data: Ready,
): { label: string; value: string; bad?: boolean }[] {
  const moisture = data.soil?.moistureBand
    ? ` · ${MOISTURE_LABELS[data.soil.moistureBand]}`
    : "";
  const wind = data.wind;
  return [
    {
      label: "Rain 24 h / 7 d",
      value: `${formatMm(data.rain?.next24hMm)} / ${formatMm(data.rain?.next7dMm)}`,
    },
    {
      label: "Topsoil moisture",
      value: `${formatMoisture(data.soil?.moistureTopsoil)}${moisture}`,
    },
    {
      label: "Soil at seed depth",
      value: formatTempC(data.soil?.temperatureSeedDepth),
    },
    {
      label: "Water balance 7 d",
      value: formatBalance(data.waterBalance?.balanceNext7dMm),
    },
    { label: "GDD past 30 d", value: formatGdd(data.gdd?.past30d) },
    {
      label: "Spray wind",
      value:
        wind?.speedKmh != null
          ? `${Math.round(wind.speedKmh)} km/h · ${wind.sprayable ? "OK to spray" : "Not now"}`
          : "—",
      bad: wind?.sprayable === false,
    },
  ];
}

/** The card for a full picture. */
export function AgricultureSnapshotBody({
  data,
  place,
  variant,
  onOpenInsights,
}: {
  data: Ready;
  place: PlaceInfo;
  variant: "card" | "page";
  onOpenInsights?: () => void;
}) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  const verdict = data.verdict!;
  const verdictTone = farm.severity[STATUS_TONE[verdict]];
  const risks = [data.risks?.frost, data.risks?.heat].filter(
    (r): r is NonNullable<typeof r> => Boolean(r && r.level !== "none"),
  );
  const stats = snapshotStats(data);

  const windows = WINDOW_ORDER.map((key) =>
    windowTile(
      data,
      key,
      farm.severity[STATUS_TONE[data.windows![key].status]],
      colors.textPrimary,
      colors.textTertiary,
      farm.surfaceDim,
    ),
  );
  const statTiles = stats.map((s) => (
    <StatTile
      on="card"
      key={s.label}
      label={s.label}
      value={s.value}
      valueColor={s.bad ? farm.severity.severe : undefined}
    />
  ));

  return (
    <>
      <View style={styles.head}>
        <View style={styles.headText}>
          <View style={styles.eyebrow}>
            <CropIcon size={SIZE.iconSm} color={farm.malachite} />
            <WxText
              type="bodySm"
              uppercase
              tracking="wider"
              color={colors.textTertiary}
            >
              Agriculture
            </WxText>
          </View>
          <CardHeading>{data.headline}</CardHeading>
        </View>
        <View
          accessible
          accessibilityLabel={`${STATUS_LABELS[verdict]} overall for field work today`}
          style={[
            styles.verdict,
            { backgroundColor: withAlpha(verdictTone, 0.15) },
          ]}
        >
          <WxText type="bodySm" weight={600} color={verdictTone}>
            {STATUS_LABELS[verdict]}
          </WxText>
        </View>
      </View>

      <View accessibilityLabel="Farm work windows" style={styles.group}>
        <TilePairs tiles={windows} />
      </View>

      <View accessibilityLabel="Farm figures" style={styles.group}>
        <TilePairs tiles={statTiles} />
      </View>

      {risks.length > 0 ? (
        <View style={styles.risks}>
          {risks.map((r) => (
            <WxText
              key={r.detail}
              type="body"
              color={farm.severity[RISK_TONE[r.level]]}
            >
              {r.detail}
            </WxText>
          ))}
        </View>
      ) : null}

      {variant === "card" ? (
        <View style={styles.advice}>
          <View
            style={styles.adviceIcon}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <SparklesIcon size={SIZE.iconSm} color={farm.malachite} />
          </View>
          <View style={styles.adviceText}>
            <CardNote>{advicePending(place.name)}</CardNote>
          </View>
        </View>
      ) : null}

      {variant === "card" && onOpenInsights ? (
        <PillButton
          variant="link"
          label="Full agriculture insights →"
          onPress={onOpenInsights}
          testID="agriculture-insights-link"
        />
      ) : null}
    </>
  );
}

/** What the card says when the Worker has no farm data, with its reason. */
export function AgricultureUnavailable({
  reason,
  onRetry,
}: {
  reason: string | null;
  onRetry: () => void;
}) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  const words = unavailableFor(reason);
  return (
    <View style={styles.unavailable} testID="agriculture-unavailable">
      <View style={styles.eyebrow}>
        <CropIcon size={SIZE.iconSm} color={farm.malachite} />
        <WxText
          type="bodySm"
          uppercase
          tracking="wider"
          color={colors.textTertiary}
        >
          Agriculture
        </WxText>
      </View>
      <CardHeading>{words.title}</CardHeading>
      <CardBody>{words.body}</CardBody>
      {words.retry ? (
        <PillButton label="Try again" variant="outline" onPress={onRetry} />
      ) : null}
    </View>
  );
}

/** The card for a state that is already loaded (or loading). */
export function AgricultureSnapshotView({
  place,
  state,
  variant = "card",
  onOpenInsights,
}: AgricultureSnapshotViewProps) {
  // No memo: the state, the place and the callback are new each render.
  const body = (() => {
    if (state.status === "loading") return <CardLoading what="farm weather" />;
    if (state.status === "unavailable") {
      return (
        <CardFailed
          title="Farm weather did not load"
          body={failureMessage(state.error)}
          onRetry={state.reload}
        />
      );
    }
    if (state.data.kind === "unavailable") {
      return (
        <AgricultureUnavailable
          reason={state.data.reason}
          onRetry={state.reload}
        />
      );
    }
    return (
      <AgricultureSnapshotBody
        data={state.data.data}
        place={place}
        variant={variant}
        onOpenInsights={onOpenInsights}
      />
    );
  })();

  return (
    <PlaceCard accent="malachite" testID="agriculture-snapshot">
      {body}
    </PlaceCard>
  );
}

/** The card that loads its own data (the location page). */
export function AgricultureSnapshot({
  crops,
  refreshKey,
  ...rest
}: AgricultureSnapshotProps) {
  const state = useAgriculture(rest.place, crops, refreshKey);
  return <AgricultureSnapshotView {...rest} state={state} />;
}

export type { AgricultureResponse };

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACE.stack,
  },
  headText: { flexShrink: 1, flexGrow: 1, gap: SPACE.hair },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
  verdict: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.stack,
    paddingVertical: SPACE.hair,
  },
  group: { gap: SPACE.snug },
  tileHead: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
  dot: {
    width: FARM_SIZE.dot,
    height: FARM_SIZE.dot,
    borderRadius: RADIUS.pill,
  },
  risks: { gap: SPACE.hair },
  advice: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.snug },
  adviceIcon: { paddingTop: SPACE.hair },
  adviceText: { flex: 1 },
  unavailable: { gap: SPACE.stack },
});
