import { Image, type ImageProps } from "expo-image";
import { useEffect, useState, type ReactNode } from "react";

import { refreshActiveTokens } from "@/api/client";
import { authHeadersFor } from "@/lib/download";

/**
 * An <Image> for files served by the AUTHENTICATED `/api/files/*` proxy
 * (profile photos today).
 *
 * A plain `<Image source={{ uri }}>` hands the URL to the native image loader,
 * which sends NO Authorization header — the proxy answers 401 and the image
 * renders as an empty box (the profile photo showed as a blank white circle for
 * exactly this reason). So resolve the headers first, then render.
 *
 * The Bearer token can also expire while a screen sits open: the native loader
 * can't retry through the api client, so a failure refreshes the token once and
 * remounts the image (`key={attempt}`, since expo-image would otherwise reuse
 * the failed request for the same URL).
 */
type Props = Omit<ImageProps, "source"> & {
  /** Absolute URL — run the stored path through `resolveFileUrl` first. */
  uri: string;
  /** Shown while the headers resolve and if the image ultimately fails. */
  fallback?: ReactNode;
};

export function AuthedImage({ uri, fallback = null, ...rest }: Props) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setHeaders(null);
    setFailed(false);
    authHeadersFor(uri).then((h) => {
      if (alive) setHeaders(h);
    });
    return () => {
      alive = false;
    };
  }, [uri, attempt]);

  async function onError() {
    if (attempt > 0) {
      setFailed(true);
      return;
    }
    // First failure: most likely an expired access token. Refresh and remount.
    await refreshActiveTokens();
    setAttempt(1);
  }

  if (failed || !headers) return <>{fallback}</>;

  return <Image key={attempt} source={{ uri, headers }} onError={onError} {...rest} />;
}
