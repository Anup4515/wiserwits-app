import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

import { env } from "@/lib/env";
import { getActiveStudentId, getSessionFor } from "@/auth/token-store";

/**
 * Resolve a stored file reference to an absolute URL the device can fetch.
 * Full URLs pass through; a leading-slash path is same-origin (our API); any
 * other relative path is joined onto the API base as a best effort. Mirrors the
 * web `legacyUploadUrl`, minus the separate legacy-uploads origin (mobile hits
 * everything through the API host).
 */
export function resolveFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = env.apiBaseUrl.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

/** Attach the active account's Bearer token, but only for our own host — never
 * leak it to a third-party CDN the file might live on. */
async function authHeadersFor(url: string): Promise<Record<string, string>> {
  if (!url.startsWith(env.apiBaseUrl)) return {};
  const id = await getActiveStudentId();
  const session = id != null ? await getSessionFor(id) : null;
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

/** A filesystem-safe file name derived from a label/url, keeping the extension. */
function safeName(name: string, fallback = "download"): string {
  const base = (name.split("?")[0].split("/").pop() || fallback).trim();
  const cleaned = base.replace(/[^\w.\-]+/g, "_");
  return cleaned || fallback;
}

/**
 * Download a remote file into the app cache and hand it to the OS share sheet,
 * so the student can save it (Files / Photos) or open it in another app for
 * offline use. Surfaces its own alerts on failure and returns whether it
 * succeeded. `onProgress` reports 0–1 for large files (e.g. course videos).
 */
export async function downloadAndShare(
  url: string,
  filename: string,
  onProgress?: (fraction: number) => void,
): Promise<boolean> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    Alert.alert("Unavailable", "Downloads aren't supported on this device.");
    return false;
  }
  const target = dir + safeName(filename);
  try {
    const headers = await authHeadersFor(url);
    const dl = FileSystem.createDownloadResumable(
      url,
      target,
      { headers },
      onProgress
        ? (p) =>
            onProgress(
              p.totalBytesExpectedToWrite > 0
                ? p.totalBytesWritten / p.totalBytesExpectedToWrite
                : 0,
            )
        : undefined,
    );
    const result = await dl.downloadAsync();
    if (!result?.uri) {
      Alert.alert("Download failed", "The file couldn't be saved. Please try again.");
      return false;
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri);
    } else {
      Alert.alert("Saved", "The file has been downloaded to the app.");
    }
    return true;
  } catch (e) {
    Alert.alert("Download failed", e instanceof Error ? e.message : "Please try again.");
    return false;
  }
}
