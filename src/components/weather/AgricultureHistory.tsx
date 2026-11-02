/**
 * "Past 30 days against normal" (the web's `AgricultureHistory`): the rain
 * recorded for the place and the mean high and low of the last 30 days, with
 * today's 1991 to 2020 normals beside them and the forecast model's own
 * 30-day rain as a cross-check. Two reads from the Worker: `/v1/history` and
 * `/v1/normals`.
 *
 * Honest about every outcome: loading, a history that could not be read, a
 * history that is partial (the Worker's `degraded` flag, with its own words),
 * normals that are not available (a dash, never zero), and a place with no
 * recorded days at all (a point from the phone's fix has no slug to keep a
 * record under, so only the model's rain is shown and the card says why).
 * Recorded days are "forecast or archive, not a gauge", and the card says so.
 */

import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { fetchHistory30, fetchWindowNormals } from "@/api/agri-history";
import { useWorkerData } from "@/hooks/useWorkerData";
import {
  formatAnomaly,
  formatMm,
  formatTempC,
  summarizeHistory,
} from "@/shared/agriculture";
import { DEGRADED_NOTE, HISTORY_FAILED_NOTE } from "@/shared/agri-history";
import { SPACE } from "@/theme/mzizi";

import { PillButton } from "./PillButton";
import { CardBody, CardHeading, CardNote, PlaceCard } from "./PlaceCard";
import { CardLoading } from "./RemoteStates";
import { StatTile, TilePairs } from "./StatTiles";

export type AgricultureHistoryProps = {
  /** The place's slug; a bare GPS point has none and so no recorded days. */
  slug?: string;
  lat: number;
  lon: number;
  /** The forecast model's past-30-day rain (from `/v1/agriculture`). */
  modelRain30dMm: number | null;
};

const TITLE = "Past 30 days against normal";

export function AgricultureHistory({
  slug,
  lat,
  lon,
  modelRain30dMm,
}: AgricultureHistoryProps) {
  const loadHistory = useCallback(
    (signal: AbortSignal) =>
      slug ? fetchHistory30(slug, signal) : Promise.resolve(null),
    [slug],
  );
  const loadNormals = useCallback(
    (signal: AbortSignal) => fetchWindowNormals(lat, lon, signal),
    [lat, lon],
  );
  const history = useWorkerData(loadHistory, true);
  const normals = useWorkerData(loadNormals, true);

  const retry = () => {
    history.reload();
    normals.reload();
  };

  if (history.status === "loading") {
    return (
      <PlaceCard accent="quiet" testID="agriculture-history">
        <CardHeading>{TITLE}</CardHeading>
        <CardLoading what="the last 30 days" />
      </PlaceCard>
    );
  }

  const answer = history.status === "ready" ? history.data : null;
  const noRecord = history.status === "ready" && history.data === null;
  const failed = history.status === "unavailable";
  const summary = summarizeHistory((answer?.data ?? []) as never[]);
  const normal =
    normals.status === "ready" && normals.data.available ? normals.data : null;
  const pending = normals.status === "loading";
  const normalText = (n: number | null | undefined) =>
    pending ? "…" : formatTempC(n ?? null);
  const highAnomaly = formatAnomaly(summary.meanHigh, normal?.normalHigh);
  const lowAnomaly = formatAnomaly(summary.meanLow, normal?.normalLow);
  const recorded = answer !== null && summary.days > 0;

  const tiles = [
    <StatTile
      on="card"
      key="rain-file"
      label="Rain on file"
      value={
        recorded && summary.rainMm != null ? formatMm(summary.rainMm) : "—"
      }
      hint={
        recorded
          ? `${summary.days} days stored (forecast or archive, not a gauge)`
          : undefined
      }
    />,
    <StatTile
      on="card"
      key="rain-model"
      label="Rain (forecast model)"
      value={formatMm(modelRain30dMm)}
    />,
    <StatTile
      on="card"
      key="high"
      label="Mean high"
      value={recorded ? formatTempC(summary.meanHigh) : "—"}
      hint={`Normal ${normalText(normal?.normalHigh)}${highAnomaly ? ` · ${highAnomaly}` : ""}`}
    />,
    <StatTile
      on="card"
      key="low"
      label="Mean low"
      value={recorded ? formatTempC(summary.meanLow) : "—"}
      hint={`Normal ${normalText(normal?.normalLow)}${lowAnomaly ? ` · ${lowAnomaly}` : ""}`}
    />,
  ];

  return (
    <PlaceCard accent="quiet" testID="agriculture-history">
      <CardHeading>{TITLE}</CardHeading>
      <TilePairs tiles={tiles} />
      <CardNote>
        Normals: 1991–2020 average over the same 30 days (ERA5 via Open-Meteo).
      </CardNote>
      {noRecord ? (
        <CardBody>
          Recorded days are kept for named places. This point has no record yet,
          so only the forecast model&apos;s rain and the normals are shown.
        </CardBody>
      ) : null}
      {failed || answer?.degraded ? (
        <View style={styles.trouble} testID="agriculture-history-trouble">
          <CardBody>{failed ? HISTORY_FAILED_NOTE : DEGRADED_NOTE}</CardBody>
          <PillButton label="Try again" variant="outline" onPress={retry} />
        </View>
      ) : null}
    </PlaceCard>
  );
}

const styles = StyleSheet.create({ trouble: { gap: SPACE.snug } });
