import { Stack } from "expo-router";
import { colors } from "@/theme";

/**
 * Anchor the stack to the hub (`index`) — same rationale as Academics: a deep
 * push straight to a sub-screen (e.g. Home/Explore → Health BMI) still gets a
 * working back chevron to the Health hub.
 */
export const unstable_settings = { initialRouteName: "index" };

/**
 * Health is a hub tab (mirrors Academics): the tab shows a list of health
 * screens that push onto this nested Stack. Headers are navy with white back
 * chevrons.
 */
export default function HealthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { fontWeight: "700" },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Health", headerShown: false }} />
      <Stack.Screen name="bmi" options={{ title: "Body mass index" }} />
      <Stack.Screen name="consultations" options={{ title: "Consultations" }} />
      <Stack.Screen name="diet" options={{ title: "Diet plans" }} />
      <Stack.Screen name="labs" options={{ title: "Lab reports" }} />
    </Stack>
  );
}
