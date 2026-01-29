import { afterAll, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cacheDir = mkdtempSync(join(tmpdir(), "cache-test-"));

mock.module("astro:env/server", () => ({
  ASTRO_CACHE_DIR: cacheDir,
  ASTRO_CACHE_MIN_TIME_TO_STALE: 1000 * 60 * 30, // 30 minutes
  ASTRO_CACHE_MAX_TIME_TO_LIVE: 1000 * 60 * 60 * 24 * 7, // 7 days
}));

const { swr, memo, clearAllCaches } = await import("./cache");

afterAll(() => {
  rmSync(cacheDir, { recursive: true, force: true });
});

describe("swr", () => {
  test("returns the value from the fetcher", async () => {
    const fn = mock(async (id: string) => ({ id, name: `Item ${id}` }));
    const cached = swr(fn, { name: "swr-basic" });

    const result = await cached("1");

    expect(result).toEqual({ id: "1", name: "Item 1" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("serves cached value on subsequent calls", async () => {
    let callCount = 0;
    const fn = async (id: string) => {
      callCount++;
      return { id, n: callCount };
    };
    const cached = swr(fn, { name: "swr-subsequent" });

    const first = await cached("a");
    const second = await cached("a");

    // Both calls return the same value; fetcher called once for the initial
    // miss and at most once more for a background revalidation.
    expect(second).toEqual(first);
    expect(callCount).toBeLessThanOrEqual(2);
  });

  test("caches different keys independently", async () => {
    const fn = mock(async (id: string) => ({ id }));
    const cached = swr(fn, { name: "swr-keys" });

    await cached("x");
    await cached("y");

    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("derives key from zero arguments", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      return calls;
    };
    const cached = swr(fn, { name: "swr-zero-args" });

    const first = await cached();
    const second = await cached();

    expect(first).toBe(1);
    expect(second).toBe(first);
  });

  test("clear() resets the cache", async () => {
    let calls = 0;
    const fn = async () => ++calls;
    const cached = swr(fn, { name: "swr-clear" });

    await cached();
    expect(calls).toBe(1);

    cached.clear();

    await cached();
    // After clearing, the fetcher must be called again.
    expect(calls).toBe(2);
  });
});

describe("memo", () => {
  test("returns the value from the fetcher", async () => {
    const fn = mock(async (id: string) => ({ id }));
    const cached = memo(fn, { name: "memo-basic" });

    const result = await cached("1");

    expect(result).toEqual({ id: "1" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("serves cached value without re-calling the fetcher", async () => {
    const fn = mock(async (id: string) => ({ id }));
    const cached = memo(fn, { name: "memo-hit" });

    await cached("a");
    await cached("a");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("caches different keys independently", async () => {
    const fn = mock(async (id: string) => ({ id }));
    const cached = memo(fn, { name: "memo-keys" });

    await cached("x");
    await cached("y");
    await cached("x");

    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("derives key from zero arguments", async () => {
    const fn = mock(async () => 42);
    const cached = memo(fn, { name: "memo-zero-args" });

    const first = await cached();
    const second = await cached();

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("derives key from multiple arguments via JSON.stringify", async () => {
    const fn = mock(async (a: string, b: number) => `${a}-${b}`);
    const cached = memo(fn, { name: "memo-multi-args" });

    await cached("x", 1);
    await cached("x", 1);
    await cached("x", 2);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("clear() resets the cache", async () => {
    const fn = mock(async () => "value");
    const cached = memo(fn, { name: "memo-clear" });

    await cached();
    expect(fn).toHaveBeenCalledTimes(1);

    cached.clear();

    await cached();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("persist: false does not throw", async () => {
    const fn = mock(async () => "ok");
    const cached = memo(fn, { name: "memo-no-persist", persist: false });

    const result = await cached();
    expect(result).toBe("ok");
  });
});

describe("clearAllCaches", () => {
  test("clears all registered caches", async () => {
    const fnA = mock(async () => "a");
    const fnB = mock(async () => "b");
    const cachedA = swr(fnA, { name: "clear-all-swr" });
    const cachedB = memo(fnB, { name: "clear-all-memo" });

    await cachedA();
    await cachedB();
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);

    clearAllCaches();

    await cachedA();
    await cachedB();
    expect(fnA).toHaveBeenCalledTimes(2);
    expect(fnB).toHaveBeenCalledTimes(2);
  });

  test("after clearing, swr returns fresh data (not stale)", async () => {
    let version = 1;
    const fn = async () => ({ version: version++ });
    const cached = swr(fn, { name: "clear-all-fresh-swr" });

    const before = await cached();
    expect(before).toEqual({ version: 1 });

    clearAllCaches();

    const after = await cached();
    // Must be a new fetch with the updated version, not the stale value.
    expect(after).toEqual({ version: 2 });
  });

  test("after clearing, memo returns fresh data (not stale)", async () => {
    let version = 1;
    const fn = async () => ({ version: version++ });
    const cached = memo(fn, { name: "clear-all-fresh-memo" });

    const before = await cached();
    expect(before).toEqual({ version: 1 });

    clearAllCaches();

    const after = await cached();
    expect(after).toEqual({ version: 2 });
  });
});
