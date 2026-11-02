/**
 * The quiet invitation to pick activities (the web's `ActivityInvite`): shown
 * on the page only while nothing is picked. Activities are optional, so they
 * are offered where their payoff is, not above the temperature. Once some are
 * picked their advice lives behind the Community lane.
 */

import { usePreferences } from "@/state/preferences";

import { useActivitySheets } from "./ActivitySheets";
import { PageCard } from "./PageCard";
import { PillButton } from "./PillButton";
import { WxText } from "./WxText";
import { usePageColors } from "@/hooks/usePageColors";

export function ActivityInvite() {
  const { colors } = usePageColors();
  const { activities } = usePreferences();
  const { openPicker } = useActivitySheets();
  if (activities.length > 0) return null;
  return (
    <PageCard title="Advice for what you do" testID="activity-invite">
      <WxText type="body" color={colors.textSecondary}>
        Farming, football, a braai, the school run: pick a few activities and
        we&apos;ll tell you how today&apos;s weather affects them. Your picks
        stay on this device.
      </WxText>
      <PillButton
        label="Choose activities"
        variant="outline"
        onPress={openPicker}
      />
    </PageCard>
  );
}
