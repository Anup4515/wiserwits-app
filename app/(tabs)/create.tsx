import { Redirect } from "expo-router";

/**
 * Placeholder for the center (+) tab. Its tab press is intercepted in
 * `(tabs)/_layout.tsx` to open the `/quick-actions` modal, so this screen is
 * never actually shown; if it ever is (deep link), bounce home.
 */
export default function CreateTab() {
  return <Redirect href="/(tabs)" />;
}
