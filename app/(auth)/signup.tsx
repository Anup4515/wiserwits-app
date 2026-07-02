import { useState } from "react";
import { AuthScaffold } from "@/components/AuthScaffold";
import { Button, Field, FormError } from "@/components/ui";
import * as authApi from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "expo-router";

/**
 * Self sign-up via OTP (reuses existing /api/auth/signup/* endpoints, plan §5):
 *   details -> code -> password -> auto sign-in -> onboarding.
 */
type Step = "details" | "code" | "password";

export default function Signup() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    const res = await authApi.signupRequestOtp({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    });
    setLoading(false);
    if (res.error) return setError(res.error);
    setStep("code");
  };

  const verifyOtp = async () => {
    setError(null);
    setLoading(true);
    const res = await authApi.signupVerifyOtp(email.trim(), code.trim());
    setLoading(false);
    if (res.error || !res.ticket) {
      return setError(res.error ?? "Invalid code");
    }
    setTicket(res.ticket);
    setStep("password");
  };

  const complete = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const res = await authApi.signupComplete({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      ticket,
    });
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    const signedIn = await signIn(email.trim(), password);
    setLoading(false);
    router.replace(signedIn.ok ? "/onboarding" : "/(auth)/login");
  };

  const sub =
    step === "details"
      ? "We'll email you a verification code."
      : step === "code"
        ? `Enter the code sent to ${email}.`
        : "Set a password to finish.";

  return (
    <AuthScaffold headline="Create your account" sub={sub}>
      <FormError message={error} />

      {step === "details" && (
        <>
          <Field label="First name" icon="person-outline" value={firstName} onChangeText={setFirstName} />
          <Field label="Last name" icon="person-outline" value={lastName} onChangeText={setLastName} />
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
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 8 characters"
          />
          <Button label="Create account" onPress={complete} loading={loading} />
        </>
      )}
    </AuthScaffold>
  );
}
