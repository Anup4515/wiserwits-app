import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

import { env } from "@/lib/env";
import { storage } from "@/auth/secure-storage";
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

/** Where the student's granted SAF folder lives between launches. */
const SAF_DIR_KEY = "downloads-saf-directory";

/**
 * Ceiling for the Save-to-folder path.
 *
 * SAF can only be written through `writeAsStringAsync`, so the file has to make
 * a base64 round-trip through a JS string (~+33% on top of the raw bytes).
 * That is fine for the documents this app hands out — certificates, report
 * cards, diet plans, notices — but would OOM on a course video, so anything
 * larger falls back to the share sheet. `copyAsync` is not an escape hatch:
 * expo-file-system supports SAF as a copy *source* only; the destination is
 * resolved with `toUri.toFile()`, which a content:// URI is not.
 */
const SAF_MAX_BYTES = 25 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  zip: "application/zip",
  mp4: "video/mp4",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
};

/** `createFileAsync` wants the base name only — Android appends the extension
 *  that matches the MIME type, so passing "a.pdf" would yield "a.pdf.pdf". */
function splitName(filename: string): { base: string; mime: string; known: boolean } {
  const dot = filename.lastIndexOf(".");
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";
  const mime = MIME_BY_EXT[ext];
  return {
    // With an unrecognised extension we keep the whole name and let Android do
    // what it likes with the octet-stream default, rather than silently
    // truncating a meaningful suffix.
    base: mime ? filename.slice(0, dot) : filename,
    mime: mime ?? "application/octet-stream",
    known: !!mime,
  };
}

async function writeIntoFolder(dirUri: string, cacheUri: string, filename: string): Promise<void> {
  const { base, mime } = splitName(filename);
  const target = await FileSystem.StorageAccessFramework.createFileAsync(dirUri, base, mime);
  const b64 = await FileSystem.readAsStringAsync(cacheUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await FileSystem.writeAsStringAsync(target, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Lazy, guarded access to `react-native-blob-util`.
 *
 * It is a NATIVE module, and its entry point reads `getConstants()` off the
 * native binding at IMPORT time (`fs.js`). In Expo Go that binding is null, so a
 * static `import` throws while the module is still being evaluated — and since
 * `download.ts` is imported by the home tab and `<AuthedImage>`, that crashed the
 * whole app at launch rather than at the point of use. Loading it lazily behind a
 * try/catch (the same shape `lib/razorpay.ts` uses for its native module) keeps
 * Expo Go usable: `load()` returns null there, `saveToMediaStore` reports
 * "fallback", and downloads route through the SAF / share-sheet tiers below.
 */
interface MediaStoreModule {
  MediaCollection: {
    copyToMediaStore: (
      meta: { name: string; parentFolder: string; mimeType: string },
      collection: string,
      path: string,
    ) => Promise<unknown>;
  };
}

let blobUtil: MediaStoreModule | null | undefined;

function loadBlobUtil(): MediaStoreModule | null {
  if (blobUtil !== undefined) return blobUtil;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-blob-util") as
      | MediaStoreModule
      | { default: MediaStoreModule };
    blobUtil = ("default" in mod ? mod.default : mod) ?? null;
  } catch {
    blobUtil = null;
  }
  return blobUtil;
}

/** Android 10 (API 29) is where MediaStore gained the Downloads collection. */
const ANDROID_Q = 29;

/**
 * Android 10+: drop the file straight into the system Downloads collection.
 *
 * This is what every other app does — `MediaStore` writes to public Downloads
 * with NO runtime permission and NO folder picker, so the student just taps
 * Download and the file is there. It supersedes the SAF path below, which is
 * now only reached on Android 9 and older (MediaStore has no Downloads
 * collection before API 29).
 *
 * We still download through `expo-file-system` first rather than letting the
 * library fetch: the file sits behind the authenticated /api/files proxy, and
 * the existing path already attaches the Bearer token, re-checks the HTTP
 * status and rejects an HTML sign-in page. Handing the URL to a background
 * downloader would lose all three and happily save the login page as a PDF.
 */
async function saveToMediaStore(cacheUri: string, filename: string): Promise<true | "fallback"> {
  if (Platform.OS !== "android" || Number(Platform.Version) < ANDROID_Q) return "fallback";
  // Absent in Expo Go — fall through to the SAF / share-sheet tiers.
  const lib = loadBlobUtil();
  if (!lib) return "fallback";
  const { mime } = splitName(filename);
  try {
    await lib.MediaCollection.copyToMediaStore(
      { name: filename, parentFolder: "", mimeType: mime },
      "Download",
      // The library wants a bare filesystem path, not a file:// URI.
      cacheUri.replace(/^file:\/\//, ""),
    );
  } catch {
    return "fallback";
  }
  Alert.alert("Saved", `"${filename}" was saved to your Downloads folder.`);
  return true;
}

/**
 * Android 9 and older: write into a folder the student picks once (the picker
 * opens on Downloads). The grant is persisted, so the picker appears on the
 * first download only. Android 10+ never reaches this — `saveToMediaStore()`
 * handles it with no prompt at all.
 *
 * Returns "fallback" when the share sheet should handle it instead — the file
 * is too large to base64, the student declined the folder prompt, or SAF
 * errored. The caller still has a downloaded file either way, so no path here
 * loses the download.
 */
async function saveToFolder(cacheUri: string, filename: string): Promise<true | "fallback"> {
  const info = await FileSystem.getInfoAsync(cacheUri);
  if (info.exists && info.size > SAF_MAX_BYTES) return "fallback";

  const SAF = FileSystem.StorageAccessFramework;

  async function grantFolder(): Promise<string | null> {
    const perm = await SAF.requestDirectoryPermissionsAsync(
      SAF.getUriForDirectoryInRoot("Download"),
    );
    if (!perm.granted) return null;
    await storage.setItem(SAF_DIR_KEY, perm.directoryUri);
    return perm.directoryUri;
  }

  let dir = await storage.getItem(SAF_DIR_KEY);
  if (!dir) {
    dir = await grantFolder();
    if (!dir) return "fallback";
  }

  try {
    await writeIntoFolder(dir, cacheUri, filename);
  } catch {
    // A stored grant goes stale when the folder is deleted or the permission is
    // revoked in system settings. Drop it and ask once more before giving up.
    await storage.removeItem(SAF_DIR_KEY);
    const retryDir = await grantFolder();
    if (!retryDir) return "fallback";
    try {
      await writeIntoFolder(retryDir, cacheUri, filename);
    } catch {
      return "fallback";
    }
  }

  Alert.alert("Saved", `"${filename}" was saved to your downloads folder.`);
  return true;
}

/**
 * Guards against issuing overlapping share requests from JS.
 *
 * expo-sharing's Android module keeps ONE `pendingPromise` and clears it only
 * in `OnActivityResult`. If that callback never arrives — the chooser dismissed
 * in a way that delivers no result, or the activity recreated while the sheet
 * was up — the flag stays set for the rest of the process and EVERY later
 * `shareAsync` rejects with "Another share request is being processed now".
 * Nothing in JS can reset it; only relaunching the app does. So we avoid
 * stacking our own calls, and report the state honestly when it happens rather
 * than blaming the download, which by then has already succeeded.
 */
let sharePending = false;

/** True for expo-sharing's "a share is already in flight" rejection. */
function isShareInProgress(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /another share request/i.test(msg);
}

/**
 * Download a remote file and put it somewhere the student can actually find it.
 *
 * Android tries three routes, best first:
 *   1. MediaStore  — Android 10+. Lands in Downloads with no permission and no
 *                    prompt, the way Chrome and every other app behaves.
 *   2. SAF         — Android 9 and older, which has no Downloads collection.
 *                    Costs a one-time folder grant, then saves silently.
 *   3. Share sheet — last resort (SAF declined, or a file too large to base64).
 *
 * iOS always uses the share sheet. Routing away from it on Android also avoids
 * expo-sharing's one-shot `pendingPromise`, which could wedge every later
 * download until the app was relaunched.
 *
 * Surfaces its own alerts on failure and returns whether it succeeded.
 * `onProgress` reports 0–1 for large files (e.g. course videos).
 */
export async function downloadAndSave(
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

    if (Platform.OS === "android") {
      const name = safeName(filename);
      // MediaStore first (no prompt, Android 10+); SAF only for older devices.
      if ((await saveToMediaStore(result.uri, name)) === true) return true;
      if ((await saveToFolder(result.uri, name)) === true) return true;
    }

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Saved", "The file has been downloaded to the app.");
      return true;
    }

    if (sharePending) {
      Alert.alert(
        "Share sheet already open",
        "Finish or close the open share sheet, then try again.",
      );
      return false;
    }

    // The file is on disk from here on, so a share failure is never a download
    // failure — say so, instead of the misleading "Download failed" this used
    // to raise through the outer catch.
    sharePending = true;
    try {
      await Sharing.shareAsync(result.uri);
    } catch (e) {
      if (isShareInProgress(e)) {
        Alert.alert(
          "Can't open the share sheet",
          "The file downloaded, but Android still has an earlier share open. " +
            "Close the app completely and reopen it, then tap download again.",
        );
      } else {
        Alert.alert(
          "Couldn't share the file",
          e instanceof Error ? e.message : "The file downloaded but couldn't be opened.",
        );
      }
      return false;
    } finally {
      sharePending = false;
    }
    return true;
  } catch (e) {
    Alert.alert("Download failed", e instanceof Error ? e.message : "Please try again.");
    return false;
  }
}
