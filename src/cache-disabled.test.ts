import { describe, expect, mock, test } from "bun:test";

mock.module("astro:env/server", () => ({
  ASTRO_CACHE_ENABLED: false,
  ASTRO_CACHE_DIR: "/tmp/unused",
  ASTRO_CACHE_MIN_TIME_TO_STALE: 1000 * 60 * 30,
  ASTRO_CACHE_MAX_TIME_TO_LIVE: 1000 * 60 * 60 * 24 * 7,
}));

const { swr, memo, clearAllCaches } = await import("./cache");

describe("cache disabled", () => {
  describe("swr", () => {
    test("always calls the underlying function", async () => {
      let calls = 0;
      const fn = async () => ++calls;
      const cached = swr(fn, { name: "disabled-swr" });

      const first = await cached();
      const second = await cached();

      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(calls).toBe(2);
    });

    test("clear() is a no-op", () => {
      const fn = async () => "value";
      const cached = swr(fn, { name: "disabled-swr-clear" });

      // Should not throw
      cached.clear();
    });
  });

  describe("memo", () => {
    test("always calls the underlying function", async () => {
      let calls = 0;
      const fn = async () => ++calls;
      const cached = memo(fn, { name: "disabled-memo" });

      const first = await cached();
      const second = await cached();

      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(calls).toBe(2);
    });

    test("clear() is a no-op", () => {
      const fn = async () => "value";
      const cached = memo(fn, { name: "disabled-memo-clear" });

      // Should not throw
      cached.clear();
    });
  });

  describe("clearAllCaches", () => {
    test("does not throw when caching is disabled", () => {
      clearAllCaches();
    });
  });
});
