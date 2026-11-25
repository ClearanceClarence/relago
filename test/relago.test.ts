import { describe, expect, it, vi, afterEach } from "vitest";
import relago, { relago as named } from "../src/index";
import { at, D, H, M, NOW, S } from "./helpers";

const en = (offset: number, extra = {}) => relago(at(offset), { now: NOW, locale: "en", ...extra });

describe("exports", () => {
  it("has matching default and named exports", () => {
    expect(named).toBe(relago);
  });
});

describe("past", () => {
  it.each([
    [-10 * S, "10 seconds ago"],
    [-45 * S, "45 seconds ago"],
    [-1 * M, "1 minute ago"],
    [-5 * M, "5 minutes ago"],
    [-1 * H, "1 hour ago"],
    [-5 * H, "5 hours ago"],
    [-1 * D, "yesterday"],
    [-3 * D, "3 days ago"],
    [-7 * D, "last week"],
    [-14 * D, "2 weeks ago"],
    [-35 * D, "last month"],
    [-90 * D, "3 months ago"],
    [-400 * D, "last year"],
    [-800 * D, "2 years ago"],
    [-36525 * D, "100 years ago"],
  ])("%d ms -> %s", (offset, expected) => {
    expect(en(offset)).toBe(expected);
  });
});

describe("future", () => {
  it.each([
    [10 * S, "in 10 seconds"],
    [1 * M, "in 1 minute"],
    [45 * M, "in 45 minutes"],
    [1 * H, "in 1 hour"],
    [4 * H, "in 4 hours"],
    [1 * D, "tomorrow"],
    [3 * D, "in 3 days"],
    [7 * D, "next week"],
    [14 * D, "in 2 weeks"],
    [35 * D, "next month"],
    [180 * D, "in 6 months"],
    [400 * D, "next year"],
    [1830 * D, "in 5 years"],
  ])("%d ms -> %s", (offset, expected) => {
    expect(en(offset)).toBe(expected);
  });
});

describe("now", () => {
  it("treats the same instant as now", () => {
    expect(en(0)).toBe("now");
    expect(en(0, { numeric: "always" })).toBe("in 0 seconds");
  });

  it("rounds sub-second differences to now, with no negative zero", () => {
    expect(en(-400)).toBe("now");
    expect(en(400)).toBe("now");
    expect(en(-400, { numeric: "always" })).toBe("in 0 seconds");
  });
});

describe("unit boundaries", () => {
  // Each pair is the last value in one unit and the first value in the next.
  it.each([
    [59.4 * S, "59 seconds ago", 59.5 * S, "1 minute ago"],
    [59.4 * M, "59 minutes ago", 59.5 * M, "1 hour ago"],
    [23.4 * H, "23 hours ago", 23.5 * H, "yesterday"],
    [6.4 * D, "6 days ago", 6.5 * D, "last week"],
    [31 * D, "4 weeks ago", 32 * D, "last month"],
    [349 * D, "11 months ago", 351 * D, "last year"],
  ])("%d -> %s, %d -> %s", (before, a, after, b) => {
    expect(en(-before)).toBe(a);
    expect(en(-after)).toBe(b);
  });

  it("never shows a full next unit in the smaller unit", () => {
    const banned = /\b(60 seconds|60 minutes|24 hours|7 days|12 months)\b/;
    for (let ms = 0; ms < 800 * D; ms += 41 * M + 13 * S) {
      expect(en(-ms, { numeric: "always" })).not.toMatch(banned);
      expect(en(ms, { numeric: "always" })).not.toMatch(banned);
    }
  });

  it("is symmetric between past and future", () => {
    for (const ms of [30 * S, 5 * M, 3 * H, 2 * D, 3 * 7 * D, 100 * D, 900 * D]) {
      const past = en(-ms, { numeric: "always" }).replace(" ago", "");
      const future = en(ms, { numeric: "always" }).replace("in ", "");
      expect(past).toBe(future);
    }
  });
});

describe("numeric option", () => {
  it("auto (default) uses words where the language has them", () => {
    expect(en(-1 * D)).toBe("yesterday");
    expect(en(1 * D)).toBe("tomorrow");
    expect(en(-7 * D)).toBe("last week");
    expect(en(35 * D)).toBe("next month");
  });

  it("always keeps the number", () => {
    const o = { numeric: "always" as const };
    expect(en(-1 * D, o)).toBe("1 day ago");
    expect(en(1 * D, o)).toBe("in 1 day");
    expect(en(-7 * D, o)).toBe("1 week ago");
    expect(en(400 * D, o)).toBe("in 1 year");
  });
});

describe("style option", () => {
  it("long is the default", () => {
    expect(en(-5 * H)).toBe(en(-5 * H, { style: "long" }));
  });

  it("short", () => {
    const o = { style: "short" as const };
    expect(en(-5 * M, o)).toBe("5 min. ago");
    expect(en(4 * H, o)).toBe("in 4 hr.");
    expect(en(-90 * D, o)).toBe("3 mo. ago");
  });

  it("narrow", () => {
    const o = { style: "narrow" as const };
    expect(en(-5 * M, o)).toBe("5m ago");
    expect(en(4 * H, o)).toBe("in 4h");
    expect(en(-3 * D, o)).toBe("3d ago");
  });
});

describe("article option", () => {
  const a = { article: true };

  it("replaces 1 with a/an in English", () => {
    expect(en(-1 * S, a)).toBe("a second ago");
    expect(en(-1 * M, a)).toBe("a minute ago");
    expect(en(-1 * H, a)).toBe("an hour ago");
    expect(en(1 * M, a)).toBe("in a minute");
    expect(en(1 * H, a)).toBe("in an hour");
  });

  it("covers days and longer when numeric is always", () => {
    const o = { ...a, numeric: "always" as const };
    expect(en(-1 * D, o)).toBe("a day ago");
    expect(en(7 * D, o)).toBe("in a week");
    expect(en(-35 * D, o)).toBe("a month ago");
    expect(en(400 * D, o)).toBe("in a year");
  });

  it("leaves other values alone", () => {
    expect(en(-5 * H, a)).toBe("5 hours ago");
    expect(en(-11 * H, a)).toBe("11 hours ago");
    expect(en(-21 * H, a)).toBe("21 hours ago");
    expect(en(-10 * S, a)).toBe("10 seconds ago");
    expect(en(-1 * D, a)).toBe("yesterday");
    expect(en(0, a)).toBe("now");
  });

  it("works for regional English", () => {
    expect(relago(at(-1 * H), { now: NOW, locale: "en-GB", article: true })).toBe("an hour ago");
  });

  it("is ignored for short and narrow styles", () => {
    expect(en(-1 * H, { ...a, style: "short" })).toBe("1 hr. ago");
    expect(en(-1 * H, { ...a, style: "narrow" })).toBe("1h ago");
  });

  it("is ignored for other languages", () => {
    expect(relago(at(-1 * H), { now: NOW, locale: "nb", article: true })).toBe("for 1 time siden");
    expect(relago(at(-1 * H), { now: NOW, locale: "de", article: true })).toBe("vor 1 Stunde");
  });

  it("is off by default", () => {
    expect(en(-1 * H)).toBe("1 hour ago");
    expect(en(-1 * H, { article: false })).toBe("1 hour ago");
  });
});

describe("locales", () => {
  it.each([
    ["nb", "for 5 timer siden", "om 4 timer", "i går"],
    ["sv", "för 5 timmar sedan", "om 4 timmar", "i går"],
    ["da", "for 5 timer siden", "om 4 timer", "i går"],
    ["de", "vor 5 Stunden", "in 4 Stunden", "gestern"],
    ["fr", "il y a 5 heures", "dans 4 heures", "hier"],
    ["es", "hace 5 horas", "dentro de 4 horas", "ayer"],
    ["pl", "5 godzin temu", "za 4 godziny", "wczoraj"],
  ])("%s", (locale, past, future, yesterday) => {
    const o = { now: NOW, locale };
    expect(relago(at(-5 * H), o)).toBe(past);
    expect(relago(at(4 * H), o)).toBe(future);
    expect(relago(at(-1 * D), o)).toBe(yesterday);
  });

  it("accepts a fallback list", () => {
    expect(relago(at(-5 * H), { now: NOW, locale: ["nb", "en"] })).toBe("for 5 timer siden");
  });

  it("uses the runtime locale when none is given", () => {
    const expected = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-5, "hour");
    expect(relago(at(-5 * H), { now: NOW })).toBe(expected);
  });

  it("throws on a malformed locale tag", () => {
    expect(() => relago(at(0), { now: NOW, locale: "not a locale" })).toThrow(RangeError);
  });

  it("keeps separate formatters per option set", () => {
    // Guards the internal cache: alternating options must not leak into each other.
    for (let i = 0; i < 3; i++) {
      expect(relago(at(-5 * H), { now: NOW, locale: "en" })).toBe("5 hours ago");
      expect(relago(at(-5 * H), { now: NOW, locale: "nb" })).toBe("for 5 timer siden");
      expect(relago(at(-5 * H), { now: NOW, locale: "en", style: "narrow" })).toBe("5h ago");
      expect(relago(at(-1 * D), { now: NOW, locale: "en", numeric: "always" })).toBe("1 day ago");
      expect(relago(at(-1 * D), { now: NOW, locale: "en" })).toBe("yesterday");
    }
  });
});

describe("input types", () => {
  it("accepts Date, timestamp, and ISO string for the date", () => {
    expect(relago(new Date(NOW - 2 * H), { now: NOW, locale: "en" })).toBe("2 hours ago");
    expect(relago(NOW - 2 * H, { now: NOW, locale: "en" })).toBe("2 hours ago");
    expect(relago("2026-06-15T10:00:00Z", { now: NOW, locale: "en" })).toBe("2 hours ago");
  });

  it("accepts Date, timestamp, and ISO string for now", () => {
    const d = NOW - 2 * H;
    expect(relago(d, { now: new Date(NOW), locale: "en" })).toBe("2 hours ago");
    expect(relago(d, { now: NOW, locale: "en" })).toBe("2 hours ago");
    expect(relago(d, { now: "2026-06-15T12:00:00Z", locale: "en" })).toBe("2 hours ago");
  });

  it("respects time zone offsets in ISO strings", () => {
    expect(relago("2026-06-15T12:00:00+02:00", { now: NOW, locale: "en" })).toBe("2 hours ago");
  });

  it("does not mutate the date passed in", () => {
    const d = new Date(NOW - 2 * H);
    const before = d.getTime();
    relago(d, { now: NOW });
    expect(d.getTime()).toBe(before);
  });

  it.each([["not a date"], [NaN], [Infinity], [new Date("nope")], [null], [undefined]])(
    "throws RangeError for %s",
    (bad) => {
      expect(() => relago(bad as never)).toThrow(RangeError);
      expect(() => relago(bad as never)).toThrow("relago: invalid date");
    },
  );

  it("throws for an invalid now", () => {
    expect(() => relago(NOW, { now: "nope" })).toThrow(RangeError);
  });

  it("treats now: undefined as the current time", () => {
    expect(relago(Date.now() - 2 * H, { now: undefined, locale: "en" })).toBe("2 hours ago");
  });
});

describe("real clock", () => {
  afterEach(() => vi.useRealTimers());

  it("defaults to the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(relago(NOW - 3 * D, { locale: "en" })).toBe("3 days ago");
    expect(relago(NOW + 4 * H, { locale: "en" })).toBe("in 4 hours");
    vi.setSystemTime(NOW + 2 * D);
    expect(relago(NOW - 3 * D, { locale: "en" })).toBe("5 days ago");
  });

  it("works with no options at all", () => {
    expect(typeof relago(Date.now() - 5 * M)).toBe("string");
    expect(relago(Date.now() - 5 * M)).toMatch(/5/);
  });
});
