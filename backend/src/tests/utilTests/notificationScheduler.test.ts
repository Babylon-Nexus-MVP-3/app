import { isRunDue, sydneyClock } from "../../service/notificationScheduler.service";

describe("notification scheduler clock", () => {
  it("reads the Sydney date and hour, not UTC", () => {
    // 2026-10-14 21:30 UTC is 2026-10-15 08:30 in Sydney (AEDT, UTC+11).
    expect(sydneyClock(new Date("2026-10-14T21:30:00Z"))).toEqual({
      dateKey: "2026-10-15",
      hour: 8,
    });
  });

  it("is not due before 08:00 Sydney", () => {
    expect(isRunDue(new Date("2026-10-14T20:59:00Z"), null)).toBe(false); // 07:59 AEDT
  });

  it("is due at or after 08:00 Sydney, even if the 08:00 minute was missed", () => {
    expect(isRunDue(new Date("2026-10-14T21:00:00Z"), null)).toBe(true); // 08:00
    expect(isRunDue(new Date("2026-10-15T01:00:00Z"), null)).toBe(true); // 12:00
  });

  it("runs once per Sydney day", () => {
    expect(isRunDue(new Date("2026-10-15T01:00:00Z"), "2026-10-15")).toBe(false);
    expect(isRunDue(new Date("2026-10-15T21:00:00Z"), "2026-10-15")).toBe(true); // next day 08:00
  });
});
