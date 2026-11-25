// Bundles the smallest working "print a relative time" snippet for each library
// (minified, tree-shaken, gzipped) and prints the result. Run: npm install && npm run compare
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const meta = (name) => JSON.parse(readFileSync(new URL(`./node_modules/${name}/package.json`, import.meta.url)));
const version = (name) => meta(name).version;
const deps = (name) => Object.keys(meta(name).dependencies ?? {}).length;

const cases = [
  { name: "relago", pkg: null, code: `import relago from "../dist/index.js"; console.log(relago(Date.now() - 5e6));` },
  { name: "relago (Norwegian)", pkg: null, code: `import relago from "../dist/index.js"; console.log(relago(Date.now() - 5e6, { locale: "nb" }));` },
  { name: "tiny-relative-date", pkg: "tiny-relative-date", code: `import relativeDate from "tiny-relative-date"; console.log(relativeDate(Date.now() - 5e6));` },
  { name: "timeago.js", pkg: "timeago.js", code: `import { format } from "timeago.js"; console.log(format(Date.now() - 5e6));` },
  { name: "timeago.js (Norwegian)", pkg: "timeago.js", code: `import { format, register } from "timeago.js"; import nb from "timeago.js/lib/lang/nb_NO"; register("nb", nb); console.log(format(Date.now() - 5e6, "nb"));` },
  { name: "dayjs + relativeTime", pkg: "dayjs", code: `import dayjs from "dayjs"; import rt from "dayjs/plugin/relativeTime"; dayjs.extend(rt); console.log(dayjs(Date.now() - 5e6).fromNow());` },
  { name: "dayjs + relativeTime (Norwegian)", pkg: "dayjs", code: `import dayjs from "dayjs"; import rt from "dayjs/plugin/relativeTime"; import "dayjs/locale/nb"; dayjs.extend(rt); dayjs.locale("nb"); console.log(dayjs(Date.now() - 5e6).fromNow());` },
  { name: "date-fns formatDistanceToNow", pkg: "date-fns", code: `import { formatDistanceToNow } from "date-fns"; console.log(formatDistanceToNow(Date.now() - 5e6, { addSuffix: true }));` },
  { name: "date-fns formatDistanceToNow (Norwegian)", pkg: "date-fns", code: `import { formatDistanceToNow } from "date-fns"; import { nb } from "date-fns/locale/nb"; console.log(formatDistanceToNow(Date.now() - 5e6, { addSuffix: true, locale: nb }));` },
  { name: "javascript-time-ago", pkg: "javascript-time-ago", code: `import TimeAgo from "javascript-time-ago"; import en from "javascript-time-ago/locale/en"; TimeAgo.addDefaultLocale(en); console.log(new TimeAgo("en").format(Date.now() - 5e6));` },
  { name: "luxon toRelative", pkg: "luxon", code: `import { DateTime } from "luxon"; console.log(DateTime.fromMillis(Date.now() - 5e6).toRelative());` },
  { name: "moment fromNow", pkg: "moment", code: `import moment from "moment"; console.log(moment(Date.now() - 5e6).fromNow());` },
  { name: "moment fromNow (Norwegian)", pkg: "moment", code: `import moment from "moment"; import "moment/locale/nb"; moment.locale("nb"); console.log(moment(Date.now() - 5e6).fromNow());` },
];

const rows = [];
const log = console.log;
for (const c of cases) {
  const out = await build({
    stdin: { contents: c.code, resolveDir: import.meta.dirname, loader: "js" },
    bundle: true, minify: true, format: "esm", platform: "browser", write: false, logLevel: "silent",
  });
  const code = out.outputFiles[0].contents;
  // Run the bundle to prove it actually works and to show what it prints.
  const lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try {
    await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  } catch (e) {
    lines.push("ERROR " + e.message);
  }
  console.log = log;
  const output = lines.join(" ");
  rows.push({
    library: c.name,
    version: c.pkg ? version(c.pkg) : "local",
    deps: c.pkg ? deps(c.pkg) : 0,
    "min (B)": code.length,
    "min+gzip (B)": gzipSync(code).length,
    prints: output,
  });
}
console.table(rows);
