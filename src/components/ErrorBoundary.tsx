import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui";
import { colors, palette, spacing, radius, typography } from "@/theme";

/**
 * App-wide error boundary (audit H1). A render throw anywhere below this would
 * otherwise unmount the whole tree to a blank white screen with no recovery.
 * This catches it and shows a recoverable fallback with a "Try again" that
 * resets the boundary and re-mounts the subtree. Sits high (inside
 * SafeAreaProvider, wrapping the providers + navigator) so it also survives a
 * throw from a context provider, not just a screen.
 *
 * React error boundaries MUST be class components — there is no hook equivalent.
 */
interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Dev-visible; a real crash-reporting sink (Sentry, etc.) can hook in here.
    if (__DEV__) {
      console.error("Uncaught render error:", error, info.componentStack);
    }
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={styles.ic}>
          <Ionicons name="warning-outline" size={30} color={colors.danger} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.sub}>
          The app hit an unexpected error. You can try again — your data is safe.
        </Text>
        {__DEV__ ? (
          <Text style={styles.devMsg} numberOfLines={4}>
            {error.message}
          </Text>
        ) : null}
        <View style={{ height: spacing.md }} />
        <Button label="Try again" onPress={onRetry} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  ic: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.redBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: { ...typography.h1, color: colors.ink },
  sub: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 300 },
  devMsg: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
    maxWidth: 320,
    marginTop: spacing.sm,
    fontFamily: undefined,
    backgroundColor: palette.primary50,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
});
