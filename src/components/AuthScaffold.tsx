import { type ReactNode } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Keyboard } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Brand } from "@/components/ui";
import { gradients, colors, spacing, radius, typography } from "@/theme";

/**
 * Navy-gradient auth screen with a gold glow and a white bottom sheet — matches
 * the mock login screen (`.login` + `.login-sheet`). Used by Welcome and Login.
 */
export function AuthScaffold({
  headline,
  sub,
  children,
}: {
  headline: string;
  sub?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.navyLogin} style={styles.fill}>
      {/* gold glow accent (mock `.login::before`) */}
      <View style={styles.glow} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={styles.fill} edges={["top"]}>
          {/* Tapping anywhere outside an input dismisses the keyboard. Interactive
              children (fields, buttons, links, scrolling) still work — they become
              the touch responder; only empty-area taps hit this Pressable. */}
          <Pressable style={styles.fill} onPress={() => Keyboard.dismiss()} accessible={false}>
            {router.canGoBack() ? (
              <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                <Ionicons name="chevron-back" size={26} color={colors.textInverse} />
              </Pressable>
            ) : null}
            <View style={styles.top}>
              <Brand size={46} />
              <Text style={styles.headline}>{headline}</Text>
              {sub ? <Text style={styles.sub}>{sub}</Text> : null}
            </View>

            <ScrollView
              style={styles.sheet}
              contentContainerStyle={[
                styles.sheetContent,
                { paddingBottom: insets.bottom + spacing.xl },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              bounces={false}
            >
              {children}
            </ScrollView>
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  glow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -140,
    right: -120,
    backgroundColor: "rgba(240,194,39,0.12)",
  },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  top: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  headline: {
    ...typography.display,
    color: colors.textInverse,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  sub: {
    color: colors.navyTint,
    ...typography.body,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  sheet: {
    flexGrow: 0,
    marginTop: "auto",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  sheetContent: { padding: spacing.xl, paddingBottom: spacing.xxl },
});
