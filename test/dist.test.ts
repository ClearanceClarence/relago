import { createRequire } from "node:module";
import { existsSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { NOW, H } from "./helpers";

// Checks the files that actually get published. Skipped until `npm run build` has run.
const built = existsSync(new URL("../dist/index.js", import.meta.url));

describe.skipIf(!built)("built package", () => {
  it("ESM build exposes default and named exports", async () => {
    // Kept in a variable so the type-checker does not need dist/ to exist.
    const file = "../dist/index.js";
    const mod = await import(/* @vite-ignore */ file);
    expect(mod.default).toBe(mod.relago);
    expect(mod.relago(NOW - 5 * H, { now: NOW, locale: "en" })).toBe("5 hours ago");
    expect(mod.nextUpdate(NOW - 5 * H, NOW)).toBe(30 * 60 * 1000);
  });

  it("CommonJS build exposes default and named exports", () => {
    const mod = createRequire(import.meta.url)("../dist/index.cjs");
    expect(mod.default).toBe(mod.relago);
    expect(mod.relago(NOW + 4 * H, { now: NOW, locale: "en" })).toBe("in 4 hours");
    expect(typeof mod.nextUpdate).toBe("function");
  });

  it("ships type definitions for both formats", () => {
    for (const f of ["index.d.ts", "index.d.cts"]) {
      const text = readFileSync(new URL(`../dist/${f}`, import.meta.url), "utf8");
      expect(text).toContain("RelagoOptions");
      expect(text).toContain("nextUpdate");
    }
  });

  it("stays under 1 kB gzipped with no imports", () => {
    const url = new URL("../dist/index.js", import.meta.url);
    const code = readFileSync(url);
    expect(statSync(url).size).toBeGreaterThan(0);
    expect(gzipSync(code).length).toBeLessThan(1024);
    expect(code.toString()).not.toMatch(/\b(require|import)\s*\(|from\s*["']/);
  });
});
