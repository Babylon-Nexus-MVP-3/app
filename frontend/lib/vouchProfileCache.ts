/*
  The process-wide cache behind useVouchProfile.

  It lives in its own module — importing nothing that depends on AuthContext —
  so that AuthContext can fill it on sign-in and clear it on sign-out without
  importing the hook, which would create a cycle (the hook depends on
  AuthContext for fetchWithAuth). The fetcher is passed in instead.
*/

import { API_BASE_URL } from "@/constants/api";

export interface VouchProfileData {
  /** Raw VouchProfile fields — idNumber, idExpiry, references, and so on. */
  [key: string]: unknown;
  idNumber?: string;
}

export interface CachedProfile {
  profile: VouchProfileData;
  profileStrength: number;
  stepsDone: boolean[];
  stepsLeft: number;
  isComplete: boolean;
}

type FetchWithAuth = (url: string, options?: RequestInit) => Promise<Response>;

/*
  Shared across every consumer and kept between mounts, so returning to a screen
  renders the last known state immediately instead of flashing locked copy while
  the refetch is in flight.
*/
let cache: CachedProfile | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(next: CachedProfile | null) => void>();

export function getCachedVouchProfile(): CachedProfile | null {
  return cache;
}

export function setCachedVouchProfile(next: CachedProfile | null) {
  cache = next;
  listeners.forEach((l) => l(next));
}

/** Mounted hooks subscribe so a load started anywhere updates every screen. */
export function subscribeVouchProfile(listener: (next: CachedProfile | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Drops the cache — called on sign-out so the next user never sees stale state. */
export function clearVouchProfileCache() {
  setCachedVouchProfile(null);
}

/*
  Fetches GET /vouch/profile/me into the cache. Concurrent callers share one
  request: the launch gate, sign-in and the screen that mounts underneath them
  all ask at once, and three identical requests would race to write the cache.

  Pass `fresh` after a write: a request already in flight may have left before
  the write landed, so it is waited out and a new one sent.

  Never throws — a failed load keeps whatever was cached.
*/
export async function loadVouchProfile(
  fetchWithAuth: FetchWithAuth,
  { fresh = false }: { fresh?: boolean } = {}
): Promise<void> {
  if (inFlight) {
    if (!fresh) return inFlight;
    await inFlight;
    if (inFlight) return inFlight;
  }
  inFlight = (async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/profile/me`);
      if (!res.ok) return;
      const body = await res.json();
      if (body?.profileStrength === undefined) return;
      setCachedVouchProfile({
        profile: body,
        profileStrength: body.profileStrength,
        stepsDone: body.stepsDone ?? [],
        stepsLeft: body.stepsLeft ?? 0,
        isComplete: body.isComplete ?? body.profileStrength === 100,
      });
    } catch {
      // Keep whatever was cached — a failed refresh shouldn't blank the screen.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Resolves when `promise` settles or after `ms`, whichever comes first. */
export function settleWithin(promise: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    promise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      }
    );
  });
}
