import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { AuthScaffold } from "@/components/AuthScaffold";
import { LoginForm } from "@/features/auth/LoginForm";
import { colors, spacing, typography } from "@/theme";

/**
 * Sign-in (mock 1). On success the root auth gate redirects to (tabs).
 */
export default function Login() {
  return (
    <AuthScaffold headline="Welcome back" sub="Sign in to continue.">
      <LoginForm />
      <View style={styles.links}>
        <Link href="/(auth)/reset-password" style={styles.link}>
          Forgot password?
        </Link>
        <Text style={styles.dot}>·</Text>
        <Link href="/(auth)/signup" style={styles.link}>
          Create an account
        </Link>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  links: {
    marginTop: spacing.xl,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { ...typography.label, color: colors.info, fontWeight: "700" },
  dot: { color: colors.textMuted },
});
