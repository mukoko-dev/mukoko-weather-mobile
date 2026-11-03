/**
 * Keeps one section's crash from taking the page down (the web's
 * `ChartErrorBoundary`): if a chart or card throws while it renders, only that
 * section shows a short, quiet line, and the rest of the page keeps working.
 * The line is a real status for VoiceOver, never an empty gap.
 *
 * The app's ONE section boundary. Inside a card (a chart) the line takes the
 * card's text `color`; a whole card that fails (no `color`) is replaced by a
 * compact card of its own, so the page keeps its rhythm.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, RADIUS, SPACE } from "@/theme/mzizi";

import { WxText } from "./WxText";

function Fallback({ name, color }: { name: string; color?: string }) {
  const { colors } = usePageColors();
  return (
    <View
      testID="chart-error"
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`Unable to display ${name}`}
      style={
        color
          ? undefined
          : [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]
      }
    >
      <WxText
        type={color ? "body" : "bodySm"}
        color={color ?? colors.textTertiary}
      >
        {`Unable to display ${name}.`}
      </WxText>
    </View>
  );
}

type Props = {
  /** What failed, for the line and the log: "hourly forecast". */
  name: string;
  /**
   * The text colour inside a card (the section's own surface decides it).
   * Leave it out for a whole card: the fallback is then a card itself.
   */
  color?: string;
  /**
   * A section that has failed draws its children again when this changes, so
   * a crash on one answer is not final: the next answer (a refresh) gets
   * another go. Leave it out and a failure lasts as long as the section does.
   */
  resetKey?: string;
  children: ReactNode;
};

type State = { failed: boolean; key: string | undefined };

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    return props.resetKey === state.key
      ? null
      : { failed: false, key: props.resetKey };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Development only: the app has no crash reporter yet and logs nothing in
    // a release build.
    if (__DEV__) {
      console.warn(`Could not display ${this.props.name}`, error, info);
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <Fallback name={this.props.name} color={this.props.color} />;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
  },
});
