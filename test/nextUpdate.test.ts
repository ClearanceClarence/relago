import { describe, expect, it, vi, afterEach } from "vitest";
import relago, { nextUpdate } from "../src/index";
import { at, D, H, M, NOW, S } from "./helpers";

const MAX = 2 ** 31 - 1;
const label = (d: Date, now: number) => relago(d, { now, locale: "en", numeric: "always" });

describe("nextUpdate", () => {
  afterEach(() => vi.useRealTimers());

  it("returns the delay until the label changes (past)", () => {
    expect(nextUpdate(at(-5 * M), NOW)).toBe(30 * S);
    expect(nextUpdate(at(-(5 * M + 20 * S)), NOW)).toBe(10 * S);
    expect(nextUpdate(at(-5 * H), NOW)).toBe(30 * M);
    expect(nextUpdate(at(-3 * D), NOW)).toBe(12 * H);
  });

  it("returns the delay until the label changes (future)", () => {
    expect(nextUpdate(at(5 * M), NOW)).toBe(30 * S + 1);
    expect(nextUpdate(at(5 * M), undefined)).toBeGreaterThanOrEqual(1000);
    expect(nextUpdate(at(4 * H + 10 * M), NOW)).toBe(40 * M + 1);
  });

  it("handles a future date sitting exactly on a half-unit mark", () => {
    const d = at(5 * M + 30 * S);
    expect(label(d, NOW)).toBe("in 6 minutes");
    expect(nextUpdate(d, NOW)).toBe(M + 1);
    expect(label(d, NOW + M + 1)).toBe("in 4 minutes");
    expect(label(d, NOW + 1)).toBe("in 5 minutes");
  });

  it("never returns less than one second", () => {
    expect(nextUpdate(at(0), NOW)).toBe(1000);
    expect(nextUpdate(at(-10 * S), NOW)).toBe(1000);
    expect(nextUpdate(at(10 * S), NOW)).toBe(1000);
    expect(nextUpdate(at(-(5 * M + 29.9 * S)), NOW)).toBe(1000);
  });

  it("never exceeds the setTimeout maximum", () => {
    expect(nextUpdate(at(500 * D), NOW)).toBe(MAX);
    expect(nextUpdate(at(-500 * D), NOW)).toBe(MAX);
    expect(nextUpdate(at(-36525 * D), NOW)).toBe(MAX);
  });

  it("always returns a whole number within range", () => {
    for (let ms = -900 * D; ms <= 900 * D; ms += 5 * D + 3 * H + 7 * M + 11 * S) {
      const wait = nextUpdate(at(ms), NOW);
      expect(Number.isInteger(wait)).toBe(true);
      expect(wait).toBeGreaterThanOrEqual(1000);
      expect(wait).toBeLessThanOrEqual(MAX);
    }
  });

  it("the label is stable until the delay passes, then changes", () => {
    // Sweeps minutes through months in both directions with an awkward step so
    // offsets land at many different positions inside each unit.
    let checked = 0;
    for (let ms = 2 * M; ms < 330 * D; ms = Math.round(ms * 1.37) + 7 * S) {
      for (const sign of [-1, 1]) {
        const d = at(sign * ms);
        const wait = nextUpdate(d, NOW);
        if (wait === MAX || wait === 1000) continue;
        const before = label(d, NOW);
        expect(label(d, NOW + wait - 5), `${sign * ms} just before`).toBe(before);
        expect(label(d, NOW + wait), `${sign * ms} after`).not.toBe(before);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });

  it("handles a future date crossing down into a smaller unit", () => {
    // "in 1 week" becomes "in 6 days" at 6.5 days, long before the next week mark.
    const d = at(9 * D + 5 * H);
    const wait = nextUpdate(d, NOW);
    expect(label(d, NOW)).toBe("in 1 week");
    expect(wait).toBe(2 * D + 17 * H + 1);
    expect(label(d, NOW + wait)).toBe("in 6 days");
  });

  it("accepts Date, timestamp, and ISO string", () => {
    expect(nextUpdate(NOW - 5 * M, NOW)).toBe(30 * S);
    expect(nextUpdate(new Date(NOW - 5 * M), new Date(NOW))).toBe(30 * S);
    expect(nextUpdate("2026-06-15T11:55:00Z", "2026-06-15T12:00:00Z")).toBe(30 * S);
  });

  it("defaults now to the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(nextUpdate(NOW - 5 * M)).toBe(30 * S);
  });

  it("throws on invalid input", () => {
    expect(() => nextUpdate("nope")).toThrow(RangeError);
    expect(() => nextUpdate(NOW, "nope")).toThrow(RangeError);
  });

  it("drives a live-updating loop correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const date = NOW - 58 * M;
    const seen: string[] = [];
    const render = () => {
      seen.push(relago(date, { locale: "en" }));
      if (seen.length < 4) setTimeout(render, nextUpdate(date));
    };
    render();
    vi.advanceTimersByTime(3 * H);
    expect(seen).toEqual(["58 minutes ago", "59 minutes ago", "1 hour ago", "2 hours ago"]);
  });
});
