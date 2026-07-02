import { View } from "react-native";
import { Link } from "expo-router";
import { AuthScaffold } from "@/components/AuthScaffold";
import { Button } from "@/components/ui";
import { spacing } from "@/theme";

/**
 * Welcome / Sign-in entry (mock 1). Neutral, dual-audience copy (§9a).
 */
export default function Welcome() {
  return (
    <AuthScaffold
      headline={"Growth, attendance\n& marks — at a glance."}
      sub="The daily check-in for a student's school life."
    >
      <Link href="/(auth)/login" asChild>
        <Button label="Sign in" onPress={() => {}} />
      </Link>
      <View style={{ height: spacing.md }} />
      <Link href="/(auth)/signup" asChild>
        <Button label="Create account" variant="secondary" onPress={() => {}} />
      </Link>
    </AuthScaffold>
  );
}
