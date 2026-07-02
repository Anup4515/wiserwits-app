import { useState } from "react";
import { View } from "react-native";
import { Button, Field, FormError } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { spacing } from "@/theme";

/**
 * Shared email+password sign-in form. Used by the first-login screen and the
 * "add account" flow (§5a multi-account) — both call `signIn`, which ADDS the
 * account and makes it active.
 */
export function LoginForm({
  submitLabel = "Sign in",
  onSuccess,
}: {
  submitLabel?: string;
  onSuccess?: () => void;
}) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    const res = await signIn(email.trim(), password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Login failed");
      return;
    }
    onSuccess?.();
  };

  return (
    <View>
      <FormError message={error} />
      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
      />
      <Field
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        autoCapitalize="none"
        textContentType="password"
      />
      <View style={{ height: spacing.xs }} />
      <Button label={submitLabel} onPress={submit} loading={loading} />
    </View>
  );
}
