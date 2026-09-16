import { Pressable, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";

export const unstable_settings = { anchor: "index", initialRouteName: "index" };

export default function HealthLayout() {
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
      <Stack.Screen name="index" options={{ title: "Health", headerShown: false }} />
      <Stack.Screen name="bmi" options={{ title: "Body mass index" }} />
      <Stack.Screen name="consultations" options={{ title: "Consultations" }} />
      <Stack.Screen name="diet" options={{ title: "Diet plans" }} />
      <Stack.Screen name="labs" options={{ title: "Lab reports" }} />
    </Stack>
  );
}
