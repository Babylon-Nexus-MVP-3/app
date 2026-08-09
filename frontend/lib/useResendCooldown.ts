import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/constants/api";

/*
  "Resend the code" with a countdown, shared by every code-entry screen.

  Each screen used to own a copy of the timer, the interval cleanup and the
  success/error strings. They agreed on 60 seconds by coincidence rather than
  by construction, and any screen added later started by copying one of them.
*/

/** Seconds a user must wait between resends. */
export const RESEND_COOLDOWN_SECONDS = 60;

export interface ResendState {
  /** Seconds remaining; 0 when a resend is allowed. */
  cooldown: number;
  /** True while the request is in flight. */
  resending: boolean;
  /** Confirmation to show after a successful resend. */
  message: string | null;
  /** Error from the last attempt. */
  error: string | null;
  /** Disabled state for the button — in flight or still counting down. */
  disabled: boolean;
  resend: () => Promise<void>;
}

/*
  `path` is the auth route to POST to (e.g. "/auth/resend-verification"), and
  `body` whatever that route needs. Unauthenticated by design — these screens
  run before the user has a token.
*/
export function useResendCooldown(path: string, body: Record<string, unknown>): ResendState {
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // The body is an object literal at most call sites, so it is serialised for
  // the dependency comparison rather than compared by reference.
  const bodyKey = JSON.stringify(body);

  const resend = useCallback(async () => {
    setResending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyKey,
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        setError(
          res.status === 429
            ? "Too many requests. Please wait a few minutes and try again."
            : (data.error ?? "Failed to resend code.")
        );
        return;
      }
      setMessage("Code resent. Check your email.");
      startCooldown();
    } catch {
      setError("No connection — check your internet and try again.");
    } finally {
      setResending(false);
    }
  }, [path, bodyKey, startCooldown]);

  return {
    cooldown,
    resending,
    message,
    error,
    disabled: resending || cooldown > 0,
    resend,
  };
}
