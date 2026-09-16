import { Pressable, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";

export const unstable_settings = { anchor: "index", initialRouteName: "index" };

export default function AcademicsLayout() {
  const router = useRouter();
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
        headerLeft: () => (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
          </Pressable>
        ),
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
