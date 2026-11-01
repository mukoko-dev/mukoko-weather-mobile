/**
 * A crash in one section never takes down the page (the web's
 * `ChartErrorBoundary`): the section shows a compact "Unable to display X"
 * line in the page's own card, and everything else keeps working. A section
 * that throws once while rendering is reported to the console only; nothing
 * about the person or the place leaves the phone.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, RADIUS, SPACE } from "@/theme/mzizi";

import { WxText } from "./WxText";

function Fallback({ name }: { name: string }) {
  const { colors } = usePageColors();
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.fallback,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <WxText type="bodySm" color={colors.textTertiary}>
        {`Unable to display ${name}.`}
      </WxText>
    </View>
  );
}

type Props = { name: string; children: ReactNode };
type State = { failed: boolean };

export class SectionBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[${this.props.name}] could not render`, error.message, info.componentStack);
  }

  render() {
    return this.state.failed ? (
      <Fallback name={this.props.name} />
    ) : (
      this.props.children
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
  },
});
