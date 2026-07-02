import { useState } from "react";
import { AuthScaffold } from "@/components/AuthScaffold";
import { Button, Field, FormError } from "@/components/ui";
import * as authApi from "@/api/auth";
import { useRouter } from "expo-router";

/**
 * Password reset via OTP (reuses /api/auth/reset-password/* , plan §5):
 *   email -> code -> new password -> back to sign in.
 */
type Step = "email" | "code" | "password";

export default function ResetPassword() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setError(null);
    if (!email.trim()) return setError("Enter your email.");
    setLoading(true);
    const res = await authApi.resetRequestOtp(email.trim());
    setLoading(false);
    if (res.error) return setError(res.error);
    setStep("code");
  };

  const verifyOtp = async () => {
    setError(null);
    setLoading(true);
    const res = await authApi.resetVerifyOtp(email.trim(), code.trim());
    setLoading(false);
    if (res.error || !res.ticket) {
      return setError(res.error ?? "Invalid code");
    }
    setTicket(res.ticket);
    setStep("password");
  };

  const complete = async () => {
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    const res = await authApi.resetComplete({ email: email.trim(), password, ticket });
    setLoading(false);
    if (res.error) return setError(res.error);
    router.replace("/(auth)/login");
  };

  const sub =
    step === "email"
      ? "We'll email you a verification code."
      : step === "code"
        ? `Enter the code sent to ${email}.`
        : "Choose a new password.";

  return (
    <AuthScaffold headline="Reset password" sub={sub}>
      <FormError message={error} />

      {step === "email" && (
        <>
          <Field
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button label="Send code" onPress={requestOtp} loading={loading} />
        </>
      )}

      {step === "code" && (
        <>
          <Field
            label="Verification code"
            icon="keypad-outline"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="6-digit code"
          />
          <Button label="Verify" onPress={verifyOtp} loading={loading} />
        </>
      )}

      {step === "password" && (
        <>
          <Field
            label="New password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 8 characters"
          />
          <Button label="Update password" onPress={complete} loading={loading} />
        </>
      )}
    </AuthScaffold>
  );
}
