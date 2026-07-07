import { Tabs, useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, palette } from "@/theme";

/**
 * 5-slot tab bar (plan §7). Phase 1 ships Home + Profile as functional and
 * Insights/Academics as placeholders; the center (+) quick actions land in
 * Phase 3.
 *
 * The tab bar adds the bottom safe-area inset to its height/padding so the icons
 * clear the Android gesture / 3-button nav bar (edge-to-edge is on by default in
 * SDK 55).
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: "#9aa3bd",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          borderTopColor: colors.border,
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Center (+) — intercepts the tab press to open the quick-actions
          modal instead of navigating to a screen (plan §7 / Phase 3). */}
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={styles.plus}>
              <Ionicons name="add" color={colors.textInverse} size={26} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/quick-actions");
          },
        }}
      />
      <Tabs.Screen
        name="academics"
        options={{
          title: "Academics",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  plus: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginTop: -14,
    backgroundColor: palette.primary600,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.primary800,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
