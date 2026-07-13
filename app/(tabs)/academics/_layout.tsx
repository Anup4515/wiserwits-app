import { Stack } from "expo-router";
import { colors } from "@/theme";

/**
 * Anchor the stack to the hub (`index`). Without this, navigating STRAIGHT to a
 * sub-screen (e.g. Home's "Attendance" tile) makes that screen the only entry
 * in the stack — so there's no back chevron to return to the Academics hub.
 * With `index` as the anchor, the hub always sits beneath, so every sub-screen
 * gets a working back button.
 */
export const unstable_settings = { initialRouteName: "index" };

/**
 * Academics is a hub (plan §7): the tab shows a list of academic screens that
 * push onto this nested Stack. Headers are navy with white back chevrons.
 */
export default function AcademicsLayout() {
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
      <Stack.Screen name="index" options={{ title: "Academics", headerShown: false }} />
      <Stack.Screen name="attendance" options={{ title: "Attendance" }} />
      <Stack.Screen name="exams" options={{ title: "Exams & Marks" }} />
      <Stack.Screen name="marks" options={{ title: "Marks" }} />
      <Stack.Screen name="report" options={{ title: "Report Card" }} />
      <Stack.Screen name="timetable" options={{ title: "Timetable" }} />
      <Stack.Screen name="calendar" options={{ title: "Calendar" }} />
    </Stack>
  );
}
