import { View } from "react-native";
import { Stack } from "expo-router";
import { HeaderBackButton } from "@/components/BackButton";
import { colors } from "@/theme";

export const unstable_settings = { anchor: "index", initialRouteName: "index" };

export default function HealthLayout() {
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
      <Stack.Screen name="index" options={{ title: "Health", headerShown: false }} />
      <Stack.Screen name="bmi" options={{ title: "Body mass index" }} />
      <Stack.Screen name="consultations" options={{ title: "Consultations" }} />
      <Stack.Screen name="diet" options={{ title: "Diet plans" }} />
      <Stack.Screen name="labs" options={{ title: "Lab reports" }} />
    </Stack>
  );
}
