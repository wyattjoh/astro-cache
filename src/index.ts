import type { AstroIntegration } from "astro";
import { envField } from "astro/config";

const DEFAULT_CACHE_DIR = "node_modules/.cache/astro-cache";
const DEFAULT_MIN_TIME_TO_STALE = 1000 * 60 * 30; // 30 minutes
const DEFAULT_MAX_TIME_TO_LIVE = 1000 * 60 * 60 * 24 * 7; // 7 days

/** Options for the `astroCache` integration. */
interface AstroCacheOptions {
  /**
   * Enable caching during `astro dev`.
   *
   * When `false` (the default), `swr()` and `memo()` become transparent
   * passthroughs in dev mode so you always see fresh data. Caching is always
   * active during `build` and `preview` regardless of this setting.
   */
  devCaching?: boolean;
}

/**
 * Astro integration that registers disk-backed caching environment variables
 * and enables the `swr`, `memo`, and `clearAllCaches` utilities exported from
 * `@wyattjoh/astro-cache/cache`.
 *
 * @param options - Optional configuration for the integration.
 * @returns An Astro integration to add to the `integrations` array.
 */
export default function astroCache(
  options?: AstroCacheOptions
): AstroIntegration {
  return {
    name: "@wyattjoh/astro-cache",
    hooks: {
      "astro:config:setup": ({ command, updateConfig }) => {
        const enabled = command !== "dev" || options?.devCaching === true;

        updateConfig({
          vite: {
            ssr: {
              noExternal: ["@wyattjoh/astro-cache"],
            },
          },
          env: {
            schema: {
              ASTRO_CACHE_ENABLED: envField.boolean({
                context: "server",
                access: "secret",
                default: enabled,
              }),
              ASTRO_CACHE_DIR: envField.string({
                context: "server",
                access: "secret",
                default: DEFAULT_CACHE_DIR,
              }),
              ASTRO_CACHE_MIN_TIME_TO_STALE: envField.number({
                context: "server",
                access: "secret",
                default: DEFAULT_MIN_TIME_TO_STALE,
              }),
              ASTRO_CACHE_MAX_TIME_TO_LIVE: envField.number({
                context: "server",
                access: "secret",
                default: DEFAULT_MAX_TIME_TO_LIVE,
              }),
            },
          },
        });
      },
    },
  };
}
