import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

import { env } from "@/lib/env";
import { getActiveStudentId, getSessionFor } from "@/auth/token-store";

/**
 * Resolve a stored file reference to an absolute URL the device can fetch.
 *
 * Uploads are stored as a BARE relative path — `diet_plans/<file>`,
 * `lab_reports/<file>`, `course_videos/<file>` — and are served back only
 * through the authenticated `/api/files/<relPath>` proxy. This used to join the
 * path onto the API base without that prefix, producing
 * `https://host/diet_plans/<file>`, which isn't a route: the request fell
 * through to the login redirect, so every consultant-shared file "downloaded"
 * as an HTML sign-in page. The web helper it claims to mirror
 * (`legacyUploadUrl`) always adds `/api/files/`; this one dropped it.
 *
 * Three shapes reach here, and each needs different handling:
 *   - `https://…`        report-card PDFs, which the API returns as an absolute
 *                        public URL on the partner portal → pass through
 *   - `/api/files/…`     profile images, stored WITH the prefix already → don't
 *                        add a second one
 *   - `diet_plans/…`     everything else → route through the proxy
 */
export function resolveFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = env.apiBaseUrl.replace(/\/+$/, "");
  const rel = path.replace(/^\/+/, "");
  if (rel.startsWith("api/files/")) return `${base}/${rel}`;
  return `${base}/api/files/${rel}`;
}

/**
 * Attach the active account's Bearer token, but only for our own host — never
 * leak it to a third-party CDN the file might live on.
 *
 * Exported because `/api/files/*` is an AUTHENTICATED proxy: anything that
 * fetches it outside the api client — `downloadAndShare` here, `<AuthedImage>`
 * for the profile photo — has to attach these itself, or the request comes back
 * 401 (and, through an ngrok dev tunnel, as the interstitial HTML page).
 */
export async function authHeadersFor(url: string): Promise<Record<string, string>> {
  if (!url.startsWith(env.apiBaseUrl)) return {};
  const id = await getActiveStudentId();
  const session = id != null ? await getSessionFor(id) : null;
  return {
    // Same header the api client sends: skips ngrok's free-tier browser-warning
    // page in dev (ignored by any non-ngrok host).
    "ngrok-skip-browser-warning": "true",
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
  };
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

    // `downloadAsync` writes whatever the server returned and resolves happily —
    // an error body is still "a file". Two ways that bites:
    //   - a non-2xx (404 for a moved file, 403 for a revoked one) is saved as
    //     the error page itself;
    //   - a redirect to /login is FOLLOWED, so the status is 200 and the file
    //     is a ~45 KB HTML sign-in page saved as "<name>.pdf". The student then
    //     gets the share sheet and a document that opens as gibberish.
    // Every caller here fetches a real binary (report PDF, diet plan, course
    // media), so an HTML body always means an error page, never the payload.
    const contentType =
      result.headers?.["content-type"] ?? result.headers?.["Content-Type"] ?? "";
    const httpFailed = result.status < 200 || result.status >= 300;
    const gotHtml = /text\/html/i.test(contentType);
    if (httpFailed || gotHtml) {
      // Don't leave the error page sitting in the cache under a real-looking name.
      await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
      Alert.alert(
        "Download failed",
        gotHtml
          ? "That file isn't available right now. Please try again, or sign in and retry."
          : `The file couldn't be downloaded (error ${result.status}).`,
      );
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
