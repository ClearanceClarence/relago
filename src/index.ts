export type DateInput = Date | number | string;

export interface RelagoOptions {
  /** BCP 47 locale(s), e.g. "en", "nb", ["nb", "en"]. Defaults to the runtime locale. */
  locale?: string | string[];
  /** The moment to compare against. Defaults to the current time. */
  now?: DateInput;
  /** "auto" gives "yesterday" / "tomorrow" / "now"; "always" gives "1 day ago". Default "auto". */
  numeric?: "auto" | "always";
  /** "long": "3 days ago", "short": "3 days ago" / "3 d. ago", "narrow": "3d ago". Default "long". */
  style?: "long" | "short" | "narrow";
  /**
   * Say "an hour ago" / "in a minute" instead of "1 hour ago" / "in 1 minute".
   * English only, long style only; other locales are left untouched. Default false.
   */
  article?: boolean;
  /**
   * Count days by the calendar instead of by elapsed time, so "yesterday" always means the
   * previous calendar day (in the runtime's local time zone). Anything less than an hour
   * away still reads as minutes or seconds. Default false.
   */
  calendar?: boolean;
}

type Unit = Intl.RelativeTimeFormatUnit;

// [unit, seconds in unit, switch to the next unit at this many of the current one]
const STEPS: [Unit, number, number][] = [
  ["second", 1, 60],
  ["minute", 60, 60],
  ["hour", 3600, 24],
  ["day", 86400, 7],
  ["week", 604800, 4.35],
  ["month", 2629800, 12],
  ["year", 31557600, Infinity],
];

const cache = new Map<string, Intl.RelativeTimeFormat>();

function formatter(o: RelagoOptions): Intl.RelativeTimeFormat {
  const key = `${o.locale ?? ""}|${o.numeric ?? "auto"}|${o.style ?? "long"}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.RelativeTimeFormat(o.locale, {
      numeric: o.numeric ?? "auto",
      style: o.style ?? "long",
    });
    cache.set(key, f);
  }
  return f;
}

function toMs(input: DateInput): number {
  const ms = input instanceof Date ? input.getTime() : input == null ? NaN : new Date(input).getTime();
  if (Number.isNaN(ms)) throw new RangeError("relago: invalid date");
  return ms;
}

/** Index of the unit to use for a distance given in seconds. The last unit has no upper limit. */
const pick = (abs: number): number => STEPS.findIndex(([, size, limit]) => Math.round(abs / size) < limit);

/** Local calendar day as a whole number, safe across daylight saving changes. */
const dayOf = (ms: number): number => {
  const d = new Date(ms);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5;
};

/**
 * Format a date relative to now: "3 days ago", "in 4 hours", "yesterday".
 * Works in both directions; past and future are detected automatically.
 */
export function relago(date: DateInput, options: RelagoOptions = {}): string {
  const now = toMs(options.now ?? Date.now());
  const then = toMs(date);
  let seconds = (then - now) / 1000;

  // Calendar mode kicks in once the distance would be shown in hours or more.
  if (options.calendar && pick(Math.abs(seconds)) > 1) {
    const days = dayOf(then) - dayOf(now);
    // Same day: stay in hours (a 25-hour day must not read as "yesterday").
    seconds = days ? days * 86400 : Math.max(-84000, Math.min(84000, seconds));
  }

  const abs = Math.abs(seconds);
  const [unit, size] = STEPS[pick(abs)];
  const value = Math.round(abs / size);

  const f = formatter(options);
  // `|| 0` turns -0 into 0 so "always" never prints "-0 seconds ago".
  const text = f.format((seconds < 0 ? -value : value) || 0, unit);

  const useArticle =
    options.article && value === 1 && (options.style ?? "long") === "long" && /^en\b/.test(f.resolvedOptions().locale);
  return useArticle ? text.replace("1", unit === "hour" ? "an" : "a") : text;
}

/**
 * Milliseconds until the output of `relago(date)` will next change.
 * Handy for live-updating UIs: `setTimeout(render, nextUpdate(date))`.
 * Always between 1000 and 2147483647 (the largest delay `setTimeout` accepts).
 *
 * The second argument is either the moment to compare against, or the same options
 * object you pass to `relago` (needed for `calendar`, where labels also change at midnight).
 */
export function nextUpdate(date: DateInput, nowOrOptions?: DateInput | RelagoOptions): number {
  const o: RelagoOptions =
    nowOrOptions instanceof Date || typeof nowOrOptions != "object" ? { now: nowOrOptions } : nowOrOptions;
  // Worked out in whole milliseconds so the half-unit marks are hit exactly.
  const now = toMs(o.now ?? Date.now());
  const diff = toMs(date) - now;
  const abs = Math.abs(diff);
  const i = pick(abs / 1000);
  const size = STEPS[i][1] * 1000;

  // Labels flip at half-unit marks. Past dates move away from now, future dates move toward it.
  const phase = (abs + size / 2) % size;
  let wait: number;
  if (diff <= 0) {
    wait = Math.ceil(size - phase);
  } else {
    // A future date can also drop into the smaller unit before reaching the next mark.
    const floor = i ? (Math.ceil(STEPS[i - 1][2]) - 0.5) * STEPS[i - 1][1] * 1000 : 0;
    // Half values round up, so a future label only flips just after the mark: add 1 ms.
    wait = Math.floor(Math.min(phase || size, abs - floor)) + 1;
  }
  if (o.calendar) {
    const d = new Date(now);
    wait = Math.min(wait, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now);
  }
  return Math.max(1000, Math.min(wait, 2 ** 31 - 1));
}

export default relago;
