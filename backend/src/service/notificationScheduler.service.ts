import { runOverdueInvoiceEscalations } from "./notification.service";

let schedulerHandle: NodeJS.Timeout | null = null;
let lastRunDateKey: string | null = null;

// Escalations go to Australian construction teams, so 08:00 means Sydney time,
// not the server's clock (UTC on EC2).
const TIME_ZONE = "Australia/Sydney";
const RUN_HOUR = 8;

const sydneyParts = new Intl.DateTimeFormat("en-AU", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

/** Sydney calendar date ("YYYY-MM-DD") and hour (0–23) for an instant. */
export function sydneyClock(d: Date): { dateKey: string; hour: number } {
  const parts = Object.fromEntries(sydneyParts.formatToParts(d).map((p) => [p.type, p.value]));
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

/** True when the daily run is due: at or after 08:00 Sydney and not yet run today. */
export function isRunDue(now: Date, lastRun: string | null): boolean {
  const { dateKey, hour } = sydneyClock(now);
  return hour >= RUN_HOUR && lastRun !== dateKey;
}

/**
 * Runs overdue escalation notifications once a day from 08:00 Sydney time.
 *
 * Checks every minute and runs on the first tick at or after 08:00 rather than
 * only during the 08:00 minute, so a late tick or a restart mid-morning still
 * runs that day. A second run is harmless: each invoice records which
 * milestones it has already escalated (escalationsSent).
 */
export function startNotificationScheduler(): void {
  if (process.env.NODE_ENV === "test") return;
  if (schedulerHandle) return;

  schedulerHandle = setInterval(async () => {
    const now = new Date();
    if (!isRunDue(now, lastRunDateKey)) return;

    const { dateKey } = sydneyClock(now);
    lastRunDateKey = dateKey; // claim the day before awaiting, so ticks can't overlap
    try {
      await runOverdueInvoiceEscalations(now);
    } catch (err) {
      lastRunDateKey = null; // retry on the next tick
      console.error("Failed to run notification scheduler", err);
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
