import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import {
  getCachedVouchProfile,
  loadVouchProfile,
  subscribeVouchProfile,
  type CachedProfile,
  type VouchProfileData,
} from "@/lib/vouchProfileCache";

/*
  The one way any screen reads the logged-in user's vouch profile.

  Four screens used to fetch GET /vouch/profile/me themselves, each with its own
  module-level `lastKnownStrength` cache and its own idea of how to turn the
  percentage back into "steps remaining". The caches could disagree and the step
  arithmetic had drifted — one screen still assumed five steps worth 20% each.
  Now there is a single cache and the derived numbers come straight off the
  server response.
*/

export interface VouchProfileState {
  /** Raw profile document, or null before the first successful load. */
  profile: VouchProfileData | null;
  /** 0–100. Null until the server has answered — never assume 0. */
  profileStrength: number | null;
  /** Per-step completion from the server. Empty until loaded. */
  stepsDone: boolean[];
  /** How many steps are still outstanding. Null until loaded. */
  stepsLeft: number | null;
  /** True only at 100%. Null until loaded, so callers can avoid a locked flash. */
  isComplete: boolean | null;
  /** False until the first response lands. */
  isKnown: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

type FetchWithAuth = (url: string, options?: RequestInit) => Promise<Response>;

/*
  Saves one wizard step and reports what happened.

  Returns null on success, or a message to show the user. Each step used to do
  its own thing here — step 1 caught network errors but never checked res.ok,
  step 2 didn't even await the request — so a rejected save (403 unverified
  mobile, 429 rate limit, 500) looked exactly like a successful one and the
  wizard navigated on regardless.

  On success it reloads the shared cache before returning, so the screen the
  wizard navigates to renders the post-save state straight away. Clearing it
  instead made that screen start from nothing and flash 0% before the refetch.
*/
export async function saveVouchProfileStep(
  fetchWithAuth: FetchWithAuth,
  payload: Record<string, unknown>
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetchWithAuth(`${API_BASE_URL}/vouch/profile`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return "No connection — check your internet and try again.";
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}) as { error?: string });
    if (res.status === 429) {
      return "Too many saves right now. Please wait a moment and try again.";
    }
    return data.error ?? "We couldn't save your details. Please try again.";
  }

  await loadVouchProfile(fetchWithAuth, { fresh: true });
  return null;
}

export function useVouchProfile(): VouchProfileState {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<CachedProfile | null>(getCachedVouchProfile());
  const [loading, setLoading] = useState(getCachedVouchProfile() === null);

  // A load started anywhere — the launch gate, sign-in, another screen —
  // lands here too, so every mounted screen shows the same state.
  useEffect(() => {
    setData(getCachedVouchProfile());
    return subscribeVouchProfile(setData);
  }, []);

  const load = useCallback(() => loadVouchProfile(fetchWithAuth), [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // Only the very first load shows a spinner. A refocus refetches quietly
      // rather than blinking the screen.
      if (getCachedVouchProfile() === null) setLoading(true);
      load().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  return {
    profile: data?.profile ?? null,
    profileStrength: data?.profileStrength ?? null,
    stepsDone: data?.stepsDone ?? [],
    stepsLeft: data?.stepsLeft ?? null,
    isComplete: data?.isComplete ?? null,
    isKnown: data !== null,
    loading,
    refresh: load,
  };
}
