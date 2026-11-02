/**
 * Keeps one section's crash from taking the page down (the web's
 * `ChartErrorBoundary`): if a chart or card throws while it renders, only that
 * section shows a short, quiet line, and the rest of the page keeps working.
 * The line is a real status for VoiceOver, never an empty gap.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { View } from "react-native";

import { WxText } from "./WxText";

type Props = {
  /** What failed, for the line and the log: "hourly forecast". */
  name: string;
  /** The text colour (the section's own surface decides it). */
  color: string;
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
    return (
      <View
        testID="chart-error"
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`Unable to display ${this.props.name}`}
      >
        <WxText type="body" color={this.props.color}>
          {`Unable to display ${this.props.name}.`}
        </WxText>
      </View>
    );
  }
}
