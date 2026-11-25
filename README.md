# relago

**Relative time in under 1 kB. Every language included.**

[![npm](https://img.shields.io/npm/v/relago)](https://www.npmjs.com/package/relago)
[![size](https://img.shields.io/bundlephobia/minzip/relago?label=min%2Bgzip)](https://bundlephobia.com/package/relago)
[![CI](https://github.com/ClearanceClarence/relago/actions/workflows/ci.yml/badge.svg)](https://github.com/ClearanceClarence/relago/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/relago)](./LICENSE)

```js
import relago from "relago";

relago(comment.createdAt);                       // "5 minutes ago"
relago(event.startsAt);                          // "in 4 hours"
relago(post.publishedAt, { locale: "nb" });      // "for 3 døgn siden"
relago(message.sentAt, { style: "narrow" });     // "5h ago"
relago(lastNight, { calendar: true });           // "yesterday"
```

You wanted to print "5 minutes ago". You should not have to install a date library, import a locale file per language, and set up a timer that fires every second to do it.

relago is a thin layer over `Intl.RelativeTimeFormat`, the translation data your browser and Node already ship. The library adds the part the platform leaves out: picking the right unit, rounding sensibly, calendar days, and knowing when the text needs to change.

## Why relago

- **Under 1 kB.** 664 bytes gzipped for the formatter, 868 for the whole library. A test fails the build if it ever passes 1 kB.
- **Every language, no locale files.** Norwegian, Japanese, Arabic, and the rest work with one option. Adding a language to your app adds zero bytes.
- **Zero dependencies.** Nothing to audit, nothing to break.
- **Past and future.** `3 days ago` and `in 3 days` from the same call.
- **Calendar days when you want them.** With `calendar: true`, 11 PM last night reads `yesterday`, not `13 hours ago`.
- **Three styles.** `5 minutes ago`, `5 min. ago`, or `5m ago`.
- **Natural English.** Optional `an hour ago` instead of `1 hour ago`.
- **Live timestamps without polling.** `nextUpdate()` tells you the exact moment the text will change, so you re-render once instead of every second.
- **Tested hard.** 118 tests, 100% coverage, daylight saving changes included. TypeScript types, ESM and CommonJS.

## How it compares

The cost of printing one relative time, bundled with esbuild, minified and gzipped:

| Library                          | English   | + Norwegian | Other languages            |
| -------------------------------- | --------: | ----------: | -------------------------- |
| **relago**                       | **0.7 kB** | **0.7 kB** | **built in, all of them**  |
| timeago.js 4.3                   | 0.7 kB    | 0.9 kB      | import a file per language |
| tiny-relative-date 2.0           | 1.1 kB    | n/a         | 7 languages                |
| date-fns 4.4 `formatDistanceToNow` | 3.5 kB  | 4.6 kB      | import a file per language |
| Day.js 1.11 + `relativeTime`     | 4.0 kB    | 4.5 kB      | import a file per language |
| javascript-time-ago 2.6          | 10.1 kB   | n/a         | import a file per language |
| Moment 2.31 `fromNow`            | 20.8 kB   | 21.5 kB     | import a file per language |
| Luxon 3.7 `toRelative`           | 22.0 kB   | 22.0 kB     | built in                   |

Measured November 2026. "n/a" means not measured (tiny-relative-date has no Norwegian file). Reproduce it yourself:

```sh
npm run build
npm run compare
```

The honest reading: timeago.js is just as small for English. relago pulls ahead when you need more than one language, short or narrow labels, calendar days, or precise re-render timing. The full date libraries do far more than relative time, and that is exactly the weight you skip when relative time is all you need.

### When to pick something else

- You need to support browsers older than Safari 14 or Chrome 71.
- You want hand-tuned wording like "about 1 hour ago" or "less than a minute ago". relago uses the platform's wording as is.
- You already ship Day.js, date-fns, or Luxon for other date work. Use what you have.

## Install

```sh
npm install relago
```

## Quick start

```js
import relago from "relago";

relago(Date.now() - 5 * 60 * 1000);           // "5 minutes ago"
relago(Date.now() - 3 * 24 * 60 * 60 * 1000); // "3 days ago"
relago(Date.now() + 4 * 60 * 60 * 1000);      // "in 4 hours"
```

CommonJS works too:

```js
const { relago, nextUpdate } = require("relago");
```

## What you can pass in

```js
relago(new Date(2026, 0, 1));          // a Date
relago(1767225600000);                 // a timestamp in milliseconds
relago("2026-01-01T00:00:00Z");        // an ISO 8601 string
relago("2026-01-01T12:00:00+02:00");   // time zone offsets are respected
```

Timestamps are in **milliseconds**. If your backend sends Unix seconds (PHP's `time()`, MySQL's `UNIX_TIMESTAMP()`), multiply first:

```js
relago(post.created_at * 1000);
```

Anything that is not a valid date throws a `RangeError`:

```js
relago("not a date"); // RangeError: relago: invalid date
relago(null);         // RangeError: relago: invalid date
```

## Output reference

All examples below use `locale: "en"`.

| Distance   | Past             | Future          |
| ---------- | ---------------- | --------------- |
| 0 seconds  | `now`            | `now`           |
| 10 seconds | `10 seconds ago` | `in 10 seconds` |
| 1 minute   | `1 minute ago`   | `in 1 minute`   |
| 45 minutes | `45 minutes ago` | `in 45 minutes` |
| 1 hour     | `1 hour ago`     | `in 1 hour`     |
| 5 hours    | `5 hours ago`    | `in 5 hours`    |
| 1 day      | `yesterday`      | `tomorrow`      |
| 3 days     | `3 days ago`     | `in 3 days`     |
| 1 week     | `last week`      | `next week`     |
| 2 weeks    | `2 weeks ago`    | `in 2 weeks`    |
| 1 month    | `last month`     | `next month`    |
| 3 months   | `3 months ago`   | `in 3 months`   |
| 1 year     | `last year`      | `next year`     |
| 2 years    | `2 years ago`    | `in 2 years`    |

## Options

```ts
relago(date, {
  locale,   // string | string[]             default: the runtime's locale
  numeric,  // "auto" | "always"             default: "auto"
  style,    // "long" | "short" | "narrow"   default: "long"
  article,  // boolean                       default: false
  calendar, // boolean                       default: false
  now,      // Date | number | string        default: the current time
});
```

### `locale`

Any BCP 47 language tag, or a list of fallbacks.

```js
const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000;

relago(fiveHoursAgo, { locale: "en" }); // "5 hours ago"
relago(fiveHoursAgo, { locale: "nb" }); // "for 5 timer siden"
relago(fiveHoursAgo, { locale: "sv" }); // "för 5 timmar sedan"
relago(fiveHoursAgo, { locale: "de" }); // "vor 5 Stunden"
relago(fiveHoursAgo, { locale: "fr" }); // "il y a 5 heures"
relago(fiveHoursAgo, { locale: "es" }); // "hace 5 horas"
relago(fiveHoursAgo, { locale: "pl" }); // "5 godzin temu"
relago(fiveHoursAgo, { locale: "ja" }); // "5 時間前"

relago(fiveHoursAgo, { locale: ["nb", "en"] }); // first supported one wins
```

Leave it out to follow the user's browser or the server's default locale. To follow the page language instead:

```js
relago(date, { locale: document.documentElement.lang });
```

### `numeric`

`"auto"` (the default) uses a word where the language has one. `"always"` keeps the number.

```js
const day = 24 * 60 * 60 * 1000;

relago(Date.now() - day);                         // "yesterday"
relago(Date.now() - day, { numeric: "always" });  // "1 day ago"

relago(Date.now() + day);                         // "tomorrow"
relago(Date.now() + day, { numeric: "always" });  // "in 1 day"

relago(Date.now() - 7 * day);                         // "last week"
relago(Date.now() - 7 * day, { numeric: "always" });  // "1 week ago"

relago(Date.now());                         // "now"
relago(Date.now(), { numeric: "always" });  // "in 0 seconds"
```

### `style`

| Distance      | `long`          | `short`      | `narrow`   |
| ------------- | --------------- | ------------ | ---------- |
| 5 minutes ago | `5 minutes ago` | `5 min. ago` | `5m ago`   |
| 5 hours ago   | `5 hours ago`   | `5 hr. ago`  | `5h ago`   |
| 3 days ago    | `3 days ago`    | `3 days ago` | `3d ago`   |
| 2 weeks ago   | `2 weeks ago`   | `2 wk. ago`  | `2w ago`   |
| 3 months ago  | `3 months ago`  | `3 mo. ago`  | `3mo ago`  |
| in 4 hours    | `in 4 hours`    | `in 4 hr.`   | `in 4h`    |

```js
relago(date, { style: "narrow" });               // "5h ago"
relago(date, { style: "short", locale: "nb" });  // "for 5 t siden"
```

`narrow` is a good fit for tables, chat bubbles, and mobile lists.

### `article`

Says "a" or "an" instead of "1". English only, and only with the `long` style; other locales and styles ignore it.

```js
const hour = 60 * 60 * 1000;
const a = { article: true };

relago(Date.now() - hour);      // "1 hour ago"
relago(Date.now() - hour, a);   // "an hour ago"
relago(Date.now() + hour, a);   // "in an hour"
relago(Date.now() - 60000, a);  // "a minute ago"
relago(Date.now() - 5 * hour, a);  // "5 hours ago" (unchanged)
relago(Date.now() - 24 * hour, a); // "yesterday"   (unchanged)
```

Combine it with `numeric: "always"` to cover days and longer:

```js
const o = { article: true, numeric: "always" };

relago(Date.now() - 24 * hour, o);      // "a day ago"
relago(Date.now() + 7 * 24 * hour, o);  // "in a week"
relago(Date.now() - 35 * 24 * hour, o); // "a month ago"
```

### `calendar`

By default, distances are measured in elapsed time: "yesterday" means about 24 hours ago. With `calendar: true`, days are counted by the calendar instead, so "yesterday" always means the previous calendar day.

Say it is Monday at 12:00:

| The date                | Default        | `calendar: true` |
| ----------------------- | -------------- | ---------------- |
| Sunday 23:00            | `13 hours ago` | `yesterday`      |
| Sunday 00:05            | `yesterday`    | `yesterday`      |
| Monday 09:00            | `3 hours ago`  | `3 hours ago`    |
| Tuesday 00:30           | `in 13 hours`  | `tomorrow`       |
| Monday 23:00            | `in 11 hours`  | `in 11 hours`    |

And if it is Monday at 01:00:

| The date                | Default        | `calendar: true` |
| ----------------------- | -------------- | ---------------- |
| Sunday 23:00            | `2 hours ago`  | `yesterday`      |
| Saturday 23:30          | `yesterday`    | `2 days ago`     |
| Monday 00:20            | `40 minutes ago` | `40 minutes ago` |

```js
relago(date, { calendar: true });
relago(date, { calendar: true, locale: "nb" });                      // "i går", "i morgen", "i forgårs"
relago(date, { calendar: true, numeric: "always" });                 // "1 day ago"
relago(date, { calendar: true, numeric: "always", article: true });  // "a day ago"
```

The rules:

- Anything less than an hour away still reads as minutes or seconds, even across midnight. Something posted at 23:50 reads `20 minutes ago` at 00:10, not `yesterday`.
- On the same calendar day you always get hours.
- On a different calendar day you get the calendar-day count, which then rolls up into weeks, months, and years as usual.
- "Calendar day" follows the local time zone of wherever the code runs: the visitor's zone in a browser, the server's zone in Node.
- Daylight saving changes are handled: a 23-hour or 25-hour day still counts as one day.

### `now`

Compare against something other than the current time. Useful for tests, server rendering, and "time between two events".

```js
relago("2026-06-15T10:00:00Z", { now: "2026-06-15T12:00:00Z" }); // "2 hours ago"

// How long before the deadline was this submitted?
relago(submittedAt, { now: deadline }); // "3 days ago"
```

## Live updates

`nextUpdate(date, options?)` returns the number of milliseconds until the label will change, so you can re-render exactly when needed instead of running a timer every second.

```js
import relago, { nextUpdate } from "relago";

nextUpdate(Date.now() - 5 * 60 * 1000);      // 30000    ("5 minutes ago" lasts 30 more seconds)
nextUpdate(Date.now() - 5 * 60 * 60 * 1000); // 1800000  ("5 hours ago" lasts 30 more minutes)
```

Pass the same options you give `relago`. This matters with `calendar: true`, where labels also change at midnight:

```js
const options = { calendar: true, locale: "nb" };

el.textContent = relago(date, options);
setTimeout(render, nextUpdate(date, options));
```

For a fixed comparison time, pass it directly or as `now`:

```js
nextUpdate(date, someOtherDate);
nextUpdate(date, { now: someOtherDate });
```

The result is always at least 1000 and never more than 2147483647 (the largest delay `setTimeout` accepts, about 24.8 days).

## Recipes

### Plain JavaScript

```js
import relago, { nextUpdate } from "relago";

function live(el, date) {
  el.textContent = relago(date);
  setTimeout(() => live(el, date), nextUpdate(date));
}

live(document.querySelector("#posted"), "2026-06-15T10:00:00Z");
```

### Every `<time>` element on the page

```html
<time datetime="2026-06-15T10:00:00Z">June 15, 2026</time>
```

```js
import relago from "relago";

for (const el of document.querySelectorAll("time[datetime]")) {
  el.title = el.textContent;                // keep the exact date as a tooltip
  el.textContent = relago(el.dateTime);
}
```

### React

```jsx
import { useEffect, useState } from "react";
import relago, { nextUpdate } from "relago";

export function TimeAgo({ date, ...options }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => tick((n) => n + 1), nextUpdate(date, options));
    return () => clearTimeout(id);
  });

  return <time dateTime={new Date(date).toISOString()}>{relago(date, options)}</time>;
}

// <TimeAgo date={comment.createdAt} locale="nb" calendar />
```

### Vue

```vue
<script setup>
import { onUnmounted, ref } from "vue";
import relago, { nextUpdate } from "relago";

const props = defineProps({ date: { type: [String, Number, Date], required: true } });
const label = ref("");
let timer;

function update() {
  label.value = relago(props.date);
  timer = setTimeout(update, nextUpdate(props.date));
}

update();
onUnmounted(() => clearTimeout(timer));
</script>

<template>
  <time>{{ label }}</time>
</template>
```

### Countdown to a deadline

```js
const deadline = "2027-01-01T00:00:00Z";

relago(deadline, { now: "2026-06-15T12:00:00Z" });                   // "in 7 months"
relago(deadline, { now: "2026-06-15T12:00:00Z", style: "short" });   // "in 7 mo."
relago(deadline, { now: "2026-12-31T20:00:00Z" });                   // "in 4 hours"
```

### Relative for recent dates, absolute for old ones

```js
function smartDate(date, locale) {
  const week = 7 * 24 * 60 * 60 * 1000;
  return Math.abs(Date.now() - new Date(date)) < week
    ? relago(date, { locale })
    : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(date));
}

smartDate(twoHoursAgo, "en");  // "2 hours ago"
smartDate(lastChristmas, "en"); // "Dec 25, 2025"
```

### TypeScript

```ts
import relago, { type RelagoOptions, type DateInput } from "relago";

const options: RelagoOptions = { locale: "nb", style: "short" };
const format = (d: DateInput) => relago(d, options);
```

## How units are picked

| Distance        | Unit    |
| --------------- | ------- |
| under 1 minute  | seconds |
| under 1 hour    | minutes |
| under 1 day     | hours   |
| under 1 week    | days    |
| under ~1 month  | weeks   |
| under 1 year    | months  |
| beyond          | years   |

Values are rounded to the nearest whole unit, and a value that would round up to a full next unit rolls over. You get `1 hour ago`, never `60 minutes ago`.

Good to know:

- By default, distances are measured in elapsed time, not calendar days. `yesterday` means roughly 24 hours ago (23.5 to 36 hours), so something from 11 PM last night reads as `13 hours ago` at noon. Use [`calendar: true`](#calendar) if you want it to read `yesterday`.
- A month is counted as 30.44 days and a year as 365.25 days.
- The exact wording comes from the runtime's language data, so it can differ slightly between browser versions.

## Switching from another library

```js
// Moment
moment(date).fromNow();
// Day.js (with the relativeTime plugin)
dayjs(date).fromNow();
// date-fns
formatDistanceToNow(date, { addSuffix: true });
// timeago.js
format(date);

// relago
relago(date);
```

Closest match to Moment and Day.js wording ("an hour ago", "a day ago"):

```js
relago(date, { article: true, numeric: "always" });
```

With a language:

```js
// Before: import the locale file, register it, then format
import "dayjs/locale/nb";
dayjs.locale("nb");
dayjs(date).fromNow();

// After
relago(date, { locale: "nb" });
```

## Browser and Node support

Works anywhere `Intl.RelativeTimeFormat` exists: Chrome 71+, Edge 79+, Firefox 65+, Safari 14+, and Node 14+.

## Development

```sh
npm install
npm test          # run the tests
npm run coverage  # tests with a coverage report (100% required)
npm run build     # build dist/
npm run check     # type-check, build, and test: what CI and publishing run
```

## License

MIT
