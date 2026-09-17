import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TextInput,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { BackButton } from "@/components/BackButton";
import { Brand } from "@/components/ui";
import { KeyboardRevealContext, type FocusedInput } from "@/components/keyboard-reveal";
import { gradients, colors, spacing, radius, typography } from "@/theme";

/**
 * Space kept below a focused field when it's scrolled into view, so the submit
 * button under it (and the field's own error line) stays visible too.
 */
const REVEAL_MARGIN = 96;

/**
 * Navy-gradient auth screen with a gold glow and a white bottom sheet — matches
 * the mock login screen (`.login` + `.login-sheet`). Used by Welcome, Login,
 * Sign-up and Reset password.
 *
 * Keyboard handling: the whole screen (brand block + sheet) is ONE ScrollView
 * inside a padding KeyboardAvoidingView. When the keyboard opens the viewport
 * shrinks by its height and the focused field is scrolled into view. `padding`
 * is used on Android as well: SDK 57 is edge-to-edge, where the window no
 * longer resizes for the keyboard (adjustResize is a no-op), so without it the
 * form sat behind the keyboard.
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
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const viewportH = useRef(0);
  const scrollY = useRef(0);

  const reveal = useCallback((input: FocusedInput | null) => {
    const content = contentRef.current;
    if (!input || !content || !viewportH.current) return;
    // Wait a frame so the KeyboardAvoidingView padding has been laid out and
    // `viewportH` reflects the shrunken viewport.
    requestAnimationFrame(() => {
      input.measureLayout(
        content,
        (_x, y, _w, h) => {
          const bottom = y + h + REVEAL_MARGIN;
          const visibleTop = scrollY.current;
          const visibleBottom = visibleTop + viewportH.current;
          let target: number | null = null;
          if (bottom > visibleBottom) target = bottom - viewportH.current;
          else if (y < visibleTop) target = y - spacing.xl;
          if (target != null) {
            scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: true });
          }
        },
        () => {},
      );
    });
  }, []);

  useEffect(() => {
    // Fires once the keyboard is up (and again if its height changes, e.g.
    // number-pad → text). Field-to-field focus changes go through the context.
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => reveal(TextInput.State.currentlyFocusedInput()), 50);
    });
    return () => sub.remove();
  }, [reveal]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      const shrank = viewportH.current > 0 && h < viewportH.current;
      viewportH.current = h;
      // On Android `keyboardDidShow` can land before the avoiding-view padding
      // is laid out; re-check once the viewport has actually shrunk.
      if (shrank) reveal(TextInput.State.currentlyFocusedInput());
    },
    [reveal],
  );

  return (
    <KeyboardRevealContext.Provider value={reveal}>
      <LinearGradient colors={gradients.navyLogin} style={styles.fill}>
        {/* gold glow accent (mock `.login::before`) */}
        <View style={styles.glow} />
        <KeyboardAvoidingView style={styles.fill} behavior="padding">
          <SafeAreaView style={styles.fill} edges={["top"]}>
            <ScrollView
              ref={scrollRef}
              style={styles.fill}
              contentContainerStyle={styles.scrollContent}
              onLayout={onLayout}
              onScroll={(e) => {
                scrollY.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={32}
              // "handled": a tap on empty space (not a field/button/link)
              // dismisses the keyboard.
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <View ref={contentRef} style={styles.fill} collapsable={false}>
                {router.canGoBack() ? (
                  <BackButton onPress={() => router.back()} style={styles.back} />
                ) : null}
                <View style={styles.top}>
                  <Brand size={58} />
                  <Text style={styles.headline}>{headline}</Text>
                  {sub ? <Text style={styles.sub}>{sub}</Text> : null}
                </View>

                <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
                  {children}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </KeyboardRevealContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  glow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -140,
    right: -120,
    backgroundColor: "rgba(240,194,39,0.12)",
  },
  back: { marginLeft: spacing.lg, marginTop: spacing.sm },
  top: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
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
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.xl,
  },
});
