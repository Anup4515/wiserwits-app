import { useNavigation, useRouter, type Href } from "expo-router";

/** Tabs that host their own nested stack (hub + sub-screens). */
const STACK_TABS = /^\/\(tabs\)\/(academics|health)(?:\/([\w-]+))?\/?$/;

type TabNavigation = {
  navigate: (name: string, params: object) => void;
  getState: () => { routeNames: string[] } | undefined;
};

/**
 * Open a screen inside the Academics/Health tab from ANOTHER tab (Home) with a
 * fresh stack holding just that screen, so back returns to where the student
 * came from.
 *
 * A plain `router.push("/(tabs)/academics/attendance")` pushes onto whatever
 * that tab's stack already holds, and the stack outlives leaving the tab. Open
 * Calendar from Home, go back, open Attendance, and the stack is
 * [Calendar, Attendance], so back walked through Calendar before reaching Home.
 * Passing nested `state` makes the stack reset to exactly this screen instead.
 *
 * Outside the tab navigator (Explore-all, Feed, Insights) this falls back to
 * `router.push`: from a root-level screen that pushes a fresh tabs instance, so
 * the stale stack never comes into play there.
 */
export function useOpenInTab() {
  const router = useRouter();
  const navigation = useNavigation() as unknown as TabNavigation;
  return (href: Href) => {
    const m = typeof href === "string" ? href.match(STACK_TABS) : null;
    if (!m || !navigation.getState()?.routeNames.includes(m[1])) {
      router.push(href);
      return;
    }
    resetTabTo(navigation, m[1], m[2] ?? "index");
  };
}

/** Focus `tab` with its nested stack reset to a single `screen`. */
export function resetTabTo(navigation: TabNavigation, tab: string, screen: string) {
  navigation.navigate(tab, { state: { routes: [{ name: screen }] } });
}
