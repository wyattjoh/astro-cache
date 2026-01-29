import type { AstroIntegration } from "astro";
import { envField } from "astro/config";

const DEFAULT_CACHE_DIR = "node_modules/.cache/astro-cache";
const DEFAULT_MIN_TIME_TO_STALE = 1000 * 60 * 30; // 30 minutes
const DEFAULT_MAX_TIME_TO_LIVE = 1000 * 60 * 60 * 24 * 7; // 7 days

export default function astroCache(): AstroIntegration {
  return {
    name: "@wyattjoh/astro-cache",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({
          vite: {
            ssr: {
              noExternal: ["@wyattjoh/astro-cache"],
            },
          },
          env: {
            schema: {
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
