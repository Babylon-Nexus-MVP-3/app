/*
  The process-wide cache behind useVouchProfile.

  It lives in its own module — with no imports — so that AuthContext can clear
  it on sign-out without importing the hook, which would create a cycle
  (the hook depends on AuthContext for fetchWithAuth).
*/

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

/*
  Shared across every consumer and kept between mounts, so returning to a screen
  renders the last known state immediately instead of flashing locked copy while
  the refetch is in flight.
*/
let cache: CachedProfile | null = null;

export function getCachedVouchProfile(): CachedProfile | null {
  return cache;
}

export function setCachedVouchProfile(next: CachedProfile) {
  cache = next;
}

/** Drops the cache — called on sign-out so the next user never sees stale state. */
export function clearVouchProfileCache() {
  cache = null;
}
