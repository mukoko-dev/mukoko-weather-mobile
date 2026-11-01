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
  children: ReactNode;
};

type State = { failed: boolean };

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
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
