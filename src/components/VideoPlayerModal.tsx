import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";

import { refreshActiveTokens } from "@/api/client";
import { authHeadersFor } from "@/lib/download";
import { colors, spacing, radius, typography } from "@/theme";

/**
 * Full-screen player for course videos, streamed straight from the
 * `/api/files/*` proxy — nothing is downloaded to the device first.
 *
 * That proxy is AUTHENTICATED, and the native video loader sends no headers of
 * its own, so the Bearer token has to be attached to the source explicitly
 * (`headers` on the video source, the same problem `<AuthedImage>` solves for
 * images). Without it every video would fail with a 401 that looks like a
 * corrupt file.
 *
 * The token can also expire while the screen sits open. A failed load refreshes
 * it once and remounts the player, rather than leaving the student staring at a
 * dead frame.
 */
export function VideoPlayerModal({
  visible,
  uri,
  title,
  onClose,
}: {
  visible: boolean;
  /** Absolute URL — run the stored path through `resolveFileUrl` first. */
  uri: string | null;
  title: string;
  onClose: () => void;
}) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible || !uri) {
      setHeaders(null);
      setAttempt(0);
      return;
    }
    let alive = true;
    authHeadersFor(uri).then((h) => {
      if (alive) setHeaders(h);
    });
    return () => {
      alive = false;
    };
  }, [visible, uri, attempt]);

  async function onFailed() {
    if (attempt > 0) return;
    await refreshActiveTokens();
    setHeaders(null);
    setAttempt(1);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close video">
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>

        {uri && headers ? (
          <Player key={attempt} uri={uri} headers={headers} onFailed={onFailed} />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>
    </Modal>
  );
}

/**
 * The player itself. Split out because `useVideoPlayer` is a hook and the
 * source can't be built until the auth headers have resolved — mounting this
 * only once they have keeps the hook call unconditional.
 */
function Player({
  uri,
  headers,
  onFailed,
}: {
  uri: string;
  headers: Record<string, string>;
  onFailed: () => void;
}) {
  const [error, setError] = useState(false);
  const player = useVideoPlayer({ uri, headers }, (p) => {
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "error") {
        setError(true);
        onFailed();
      }
    });
    return () => sub.remove();
  }, [player, onFailed]);

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
        <Text style={styles.errorText}>This video couldn&apos;t be played. Please try again.</Text>
      </View>
    );
  }

  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: { flex: 1, color: "#fff", ...typography.body, fontWeight: "600" as const },
  video: { flex: 1, width: "100%", borderRadius: radius.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  errorText: { color: colors.textMuted, ...typography.body, textAlign: "center" as const },
});
