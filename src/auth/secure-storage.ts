import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Cross-platform key/value storage for tokens.
 *
 * Native (iOS/Android): `expo-secure-store` (Keychain / Keystore).
 * Web: `localStorage` — SecureStore has no web implementation. The browser has
 * no secure-element equivalent, so this is intended for dev/Expo-web only;
 * production auth runs on native where tokens are stored securely.
 */

const isWeb = Platform.OS === "web";

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
