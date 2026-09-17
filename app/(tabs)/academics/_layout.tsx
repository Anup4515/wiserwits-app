import { View } from "react-native";
import { Stack } from "expo-router";
import { HeaderBackButton } from "@/components/BackButton";
import { colors } from "@/theme";

export const unstable_settings = { anchor: "index", initialRouteName: "index" };

export default function AcademicsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerLargeStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { fontWeight: "700" },
        headerBackButtonDisplayMode: "minimal",
        headerBackTitle: "",
        contentStyle: { backgroundColor: colors.bg },
        headerBackground: () => (
          <View style={{ flex: 1, backgroundColor: colors.navy }} />
        ),
        headerLeft: () => <HeaderBackButton />,
        // Our headerLeft doesn't replace the native back arrow, only covers it:
        // it stayed underneath and flashed into view while a screen was
        // popping (the custom button unmounts before the animation ends).
        headerBackVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Academics", headerShown: false }} />
      <Stack.Screen name="notices" options={{ title: "Notices" }} />
      <Stack.Screen name="attendance" options={{ title: "Attendance" }} />
      <Stack.Screen name="exams" options={{ title: "Exams & Marks" }} />
      <Stack.Screen name="marks" options={{ title: "Marks" }} />
      <Stack.Screen name="report" options={{ title: "Report Card" }} />
      <Stack.Screen name="holistic" options={{ title: "Holistic" }} />
      <Stack.Screen name="timetable" options={{ title: "Timetable" }} />
      <Stack.Screen name="calendar" options={{ title: "Calendar" }} />
    </Stack>
  );
}
