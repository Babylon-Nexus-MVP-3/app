import { runOverdueInvoiceEscalations } from "./notification.service";

let schedulerHandle: NodeJS.Timeout | null = null;
let lastRunDateKey: string | null = null;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Runs overdue escalation notifications daily at 8:00 local server time.
 * Avoids duplicate same-day runs via in-memory day key.
 */
export function startNotificationScheduler(): void {
  if (process.env.NODE_ENV === "test") return;
  if (schedulerHandle) return;

  schedulerHandle = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const today = dateKey(now);

    if (hour === 8 && minute === 0 && lastRunDateKey !== today) {
      try {
        await runOverdueInvoiceEscalations(now);
        lastRunDateKey = today;
      } catch (err) {
        console.error("Failed to run notification scheduler", err);
      }
    }
  }, 60 * 1000);
}

/** Runs notification persistence without letting failures break project or invoice workflows. */
export async function notifySafely(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch {
    // intentionally silent — invoice state is already committed
  }
}
