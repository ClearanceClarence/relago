import { describe, expect, it, vi, afterEach } from "vitest";
import relago, { nextUpdate } from "../src/index";
import { D, H, M, S } from "./helpers";

// Local wall-clock times. Month is 1-based here for readability.
const local = (mo: number, d: number, h = 0, mi = 0, s = 0) => new Date(2026, mo - 1, d, h, mi, s).getTime();
const NOON = local(6, 15, 12); // Monday June 15, 2026, 12:00

const plain = (date: number, now = NOON, extra = {}) => relago(date, { now, locale: "en", ...extra });
const cal = (date: number, now = NOON, extra = {}) => plain(date, now, { calendar: true, ...extra });

describe("test environment", () => {
  it("runs in a zone with daylight saving time", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Europe/Oslo");
    expect(new Date(2026, 0, 1).getTimezoneOffset()).not.toBe(new Date(2026, 6, 1).getTimezoneOffset());
  });
});

describe("calendar: past", () => {
  it("late last night is yesterday, not a number of hours", () => {
    expect(plain(local(6, 14, 23))).toBe("13 hours ago");
    expect(cal(local(6, 14, 23))).toBe("yesterday");
  });

  it("earlier today stays in hours", () => {
    expect(cal(local(6, 15, 9))).toBe("3 hours ago");
    expect(cal(local(6, 15, 0, 30))).toBe(plain(local(6, 15, 0, 30)));
  });

  it("the whole previous day is yesterday", () => {
    expect(cal(local(6, 14, 0, 0, 1))).toBe("yesterday");
    expect(cal(local(6, 14, 12))).toBe("yesterday");
    expect(cal(local(6, 14, 23, 59, 59))).toBe("yesterday");
  });

  it("counts calendar days, not 24-hour blocks", () => {
    const now = local(6, 15, 1); // 1 AM
    expect(plain(local(6, 13, 23, 30), now)).toBe("yesterday"); // 25.5 hours ago
    expect(cal(local(6, 13, 23, 30), now)).toBe("2 days ago");
    expect(cal(local(6, 14, 23), now)).toBe("yesterday"); // 2 hours ago, but a different day
  });

  it("less than an hour away stays in minutes even across midnight", () => {
    const now = local(6, 15, 0, 10);
    expect(cal(local(6, 14, 23, 30), now)).toBe("40 minutes ago");
    expect(cal(local(6, 14, 23, 59, 50), now)).toBe("10 minutes ago");
    expect(cal(now - 20 * S, now)).toBe("20 seconds ago");
    expect(cal(now, now)).toBe("now");
  });

  it.each([
    [13, "2 days ago"],
    [10, "5 days ago"],
    [9, "6 days ago"],
    [8, "last week"],
    [1, "2 weeks ago"],
  ])("June %d -> %s", (day, expected) => {
    expect(cal(local(6, day, 23, 59))).toBe(expected);
    expect(cal(local(6, day, 0, 1))).toBe(expected);
  });

  it("rolls up into months and years from the day count", () => {
    expect(cal(local(5, 10, 23))).toBe("last month");
    expect(cal(local(3, 15, 8))).toBe("3 months ago");
    expect(cal(new Date(2025, 4, 1).getTime())).toBe("last year");
    expect(cal(new Date(2023, 5, 15).getTime())).toBe("3 years ago");
  });
});

describe("calendar: future", () => {
  it("early tomorrow morning is tomorrow", () => {
    expect(plain(local(6, 16, 0, 30))).toBe("in 13 hours");
    expect(cal(local(6, 16, 0, 30))).toBe("tomorrow");
    expect(cal(local(6, 16, 23, 59))).toBe("tomorrow");
  });

  it("later today stays in hours", () => {
    expect(cal(local(6, 15, 23))).toBe("in 11 hours");
    expect(cal(local(6, 15, 15))).toBe("in 3 hours");
  });

  it("counts calendar days ahead", () => {
    expect(cal(local(6, 17, 0, 1))).toBe("in 2 days");
    expect(cal(local(6, 21, 23))).toBe("in 6 days");
    expect(cal(local(6, 22, 1))).toBe("next week");
    expect(cal(local(7, 20, 1))).toBe("next month");
  });

  it("less than an hour away stays in minutes even across midnight", () => {
    const now = local(6, 15, 23, 40);
    expect(cal(local(6, 16, 0, 10), now)).toBe("in 30 minutes");
  });
});

describe("calendar: options", () => {
  it("is off by default", () => {
    expect(plain(local(6, 14, 23))).toBe("13 hours ago");
    expect(plain(local(6, 14, 23), NOON, { calendar: false })).toBe("13 hours ago");
  });

  it("combines with numeric, style, article, and locale", () => {
    const d = local(6, 14, 23);
    expect(cal(d, NOON, { numeric: "always" })).toBe("1 day ago");
    expect(cal(d, NOON, { numeric: "always", article: true })).toBe("a day ago");
    expect(cal(local(6, 12, 23), NOON, { style: "narrow" })).toBe("3d ago");
    expect(relago(d, { now: NOON, locale: "nb", calendar: true })).toBe("i går");
    expect(relago(local(6, 16, 1), { now: NOON, locale: "nb", calendar: true })).toBe("i morgen");
    expect(relago(local(6, 13, 23), { now: NOON, locale: "nb", calendar: true })).toBe("i forgårs");
  });

  it("agrees with the default mode at midday offsets of whole days", () => {
    for (let n = 1; n < 400; n += 3) {
      expect(cal(local(6, 15 - n, 12))).toBe(plain(local(6, 15 - n, 12)));
      expect(cal(local(6, 15 + n, 12))).toBe(plain(local(6, 15 + n, 12)));
    }
  });
});

describe("calendar: daylight saving time", () => {
  it("handles the 23-hour day in spring", () => {
    // Clocks go forward on March 29, 2026.
    expect(cal(local(3, 29, 0, 30), local(3, 30, 0, 30))).toBe("yesterday");
    expect(cal(local(3, 28, 12), local(3, 29, 12))).toBe("yesterday");
    expect(cal(local(3, 28, 12), local(3, 30, 12))).toBe("2 days ago");
  });

  it("handles the 25-hour day in fall", () => {
    // Clocks go back on October 25, 2026.
    const start = local(10, 25, 0, 0, 30);
    const end = local(10, 25, 23, 59);
    expect(end - start).toBeGreaterThan(24.9 * H);
    expect(plain(start, end)).toBe("yesterday");
    expect(cal(start, end)).toBe("23 hours ago"); // same calendar day, so never "yesterday"
    expect(cal(end, start)).toBe("in 23 hours");
    expect(cal(local(10, 25, 12), local(10, 26, 12))).toBe("yesterday");
    expect(cal(local(10, 24, 23, 59), local(10, 26, 0, 1))).toBe("2 days ago");
  });
});

describe("calendar: nextUpdate", () => {
  afterEach(() => vi.useRealTimers());

  it("accepts the options object as its second argument", () => {
    expect(nextUpdate(NOON - 5 * M, { now: NOON })).toBe(30 * S);
    expect(nextUpdate(NOON - 5 * M, { now: NOON })).toBe(nextUpdate(NOON - 5 * M, NOON));
    expect(nextUpdate(NOON - 5 * M, { now: new Date(NOON), locale: "nb", style: "short" })).toBe(30 * S);
  });

  it("uses the current time when options has no now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOON);
    expect(nextUpdate(NOON - 5 * M, {})).toBe(30 * S);
    expect(nextUpdate(NOON - 5 * M, { calendar: true })).toBe(30 * S);
  });

  it("wakes up at midnight when that comes first", () => {
    const now = local(6, 15, 23, 50);
    const date = local(6, 14, 12, 10);
    const o = { now, calendar: true };
    expect(nextUpdate(date, now)).toBe(20 * M);
    expect(nextUpdate(date, o)).toBe(10 * M);
    expect(cal(date, now)).toBe("yesterday");
    expect(cal(date, now + 10 * M - 1)).toBe("yesterday");
    expect(cal(date, now + 10 * M)).toBe("2 days ago");
  });

  it("is never later than the plain delay", () => {
    for (let ms = 3 * M; ms < 60 * D; ms += 7 * H + 13 * M) {
      for (const sign of [-1, 1]) {
        const d = NOON + sign * ms;
        expect(nextUpdate(d, { now: NOON, calendar: true })).toBeLessThanOrEqual(nextUpdate(d, NOON));
      }
    }
  });

  it("never sleeps through a label change", () => {
    // Walk forward in time using nextUpdate and compare with labels sampled every 10 minutes.
    const starts = [local(6, 14, 23), local(6, 15, 11, 30), local(6, 10, 3), local(6, 16, 0, 30), local(6, 19, 18), local(6, 15, 12, 40)];
    for (const date of starts) {
      let now = NOON;
      const end = NOON + 12 * D;
      let shown = cal(date, now);
      let wake = now + nextUpdate(date, { now, calendar: true });
      for (; now < end; now += 10 * M) {
        while (wake <= now) {
          shown = cal(date, wake);
          wake += nextUpdate(date, { now: wake, calendar: true });
        }
        expect(shown, `date ${new Date(date).toISOString()} at ${new Date(now).toISOString()}`).toBe(cal(date, now));
      }
    }
  });
});
