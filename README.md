# @wyattjoh/astro-cache

Astro integration providing disk-backed **SWR** (stale-while-revalidate) and **memo** caching utilities powered by [flat-cache](https://github.com/jaredwray/flat-cache) and [stale-while-revalidate-cache](https://github.com/nicolo-ribaudo/stale-while-revalidate-cache).

## Installation

```bash
npm install @wyattjoh/astro-cache
# or
bun add @wyattjoh/astro-cache
# or
pnpm add @wyattjoh/astro-cache
```

Requires `astro` ^5.0.0 as a peer dependency.

## Setup

Add the integration to your `astro.config.ts`:

```ts
import { defineConfig } from "astro/config";
import astroCache from "@wyattjoh/astro-cache";

export default defineConfig({
  integrations: [astroCache()],
});
```

The integration registers the following environment variables via Astro's `env` schema (all server-only, with sensible defaults):

| Variable                       | Type     | Default                            | Description                                |
| ------------------------------ | -------- | ---------------------------------- | ------------------------------------------ |
| `ASTRO_CACHE_DIR`              | `string` | `node_modules/.cache/astro-cache`  | Directory for flat-cache disk persistence  |
| `ASTRO_CACHE_MIN_TIME_TO_STALE`| `number` | `1800000` (30 min)                 | SWR: min ms before data is considered stale |
| `ASTRO_CACHE_MAX_TIME_TO_LIVE` | `number` | `604800000` (7 days)               | SWR: max ms before data must be refetched  |

## API

Import the cache utilities from `@wyattjoh/astro-cache/cache`:

```ts
import { swr, memo, clearAllCaches } from "@wyattjoh/astro-cache/cache";
```

### `swr(fn, options)`

Wraps an async function with SWR caching. Stale data is served instantly while fresh data is fetched in the background. Backed by flat-cache for disk persistence.

```ts
const getUser = swr(
  async (id: string) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  },
  { name: "users", max: 100 }
);

const user = await getUser("123");
```

**Options:**
- `name` (required) — unique cache identifier
- `max` — LRU size limit (0 = unlimited)

### `memo(fn, options)`

Wraps an async function with a simple cache backed by flat-cache. Use for non-serializable data (e.g. `ArrayBuffer`) or cases where SWR is unnecessary.

```ts
const getConfig = memo(
  async () => {
    const res = await fetch("/api/config");
    return res.json();
  },
  { name: "config" }
);

const config = await getConfig();
```

**Options:**
- `name` (required) — unique cache identifier
- `max` — LRU size limit (0 = unlimited)
- `ttl` — time-to-live in ms (defaults to `ASTRO_CACHE_MIN_TIME_TO_STALE`)
- `persist` — write to disk (default: `true`)

### `clearAllCaches()`

Clears all caches created by `swr` and `memo`.

```ts
clearAllCaches();
```

Both `swr` and `memo` return functions with a `.clear()` method to clear individual caches.

## License

MIT
