import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../lib/api"
import { cache } from "../lib/cache"

export type CachedQueryState<T> = {
    /** The cached value, if any. */
    data: T | null
    /** Last fetch error, cleared on the next successful fetch. */
    error: ApiError | null
    /** True only on first load when there's no cached data. */
    loading: boolean
    /** True whenever a fetch is in flight, including background revalidations. */
    isFetching: boolean
}

export type UseCachedQueryReturn<T> = {
    state: CachedQueryState<T>
    refetch: () => Promise<T>
}

const DEFAULT_TTL_MS = 60_000

/**
 * useQuery's read-side cousin. Read once, share across pages, revalidate
 * stale entries quietly in the background.
 *
 *   const { state, refetch } = useCachedQuery(
 *       `workouts:sessions:${id}`,
 *       () => sessionsApi.get(id),
 *       { ttl: 30_000 },
 *   )
 *
 * Pass `null` as the key to disable. Mutations should call
 * `cache.invalidate(...)` from `lib/cache.ts` directly to drop entries.
 */
export function useCachedQuery<T>(
    key: string | null,
    fetcher: () => Promise<T>,
    options: { ttl?: number; enabled?: boolean } = {},
): UseCachedQueryReturn<T> {
    const { ttl = DEFAULT_TTL_MS, enabled = true } = options

    const [data, setData] = useState<T | null>(() =>
        key ? (cache.get<T>(key) ?? null) : null,
    )
    const [error, setError] = useState<ApiError | null>(null)
    const [isFetching, setIsFetching] = useState(false)

    // Latest fetcher in a ref so refetch's identity stays stable.
    const fetcherRef = useRef(fetcher)
    useEffect(() => {
        fetcherRef.current = fetcher
    }, [fetcher])

    // Subscribe to cache changes for this key (other components / mutations
    // can update the same data; we want to re-render).
    useEffect(() => {
        if (!key) return
        setData(cache.get<T>(key) ?? null)
        return cache.subscribe(key, () => {
            setData(cache.get<T>(key) ?? null)
        })
    }, [key])

    const refetch = useCallback(async (): Promise<T> => {
        if (!key) throw new Error("useCachedQuery: key is null")
        setIsFetching(true)
        try {
            const result = await fetcherRef.current()
            cache.set(key, result)
            setError(null)
            return result
        } catch (err) {
            const apiErr =
                err instanceof ApiError
                    ? err
                    : new ApiError(
                          -1,
                          err instanceof Error ? err.message : "Unknown error",
                      )
            setError(apiErr)
            throw apiErr
        } finally {
            setIsFetching(false)
        }
    }, [key])

    // Mount + when stale: fire a background fetch.
    useEffect(() => {
        if (!enabled || !key) return
        const age = cache.age(key)
        const stale = age === null || age > ttl
        if (!stale) return
        refetch().catch(() => {
            // Error is captured into state already; nothing to do here.
        })
    }, [enabled, key, ttl, refetch])

    return {
        state: {
            data,
            error,
            loading: data === null && isFetching,
            isFetching,
        },
        refetch,
    }
}
