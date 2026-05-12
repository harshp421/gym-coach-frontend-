// Tiny in-memory query cache with stale-while-revalidate semantics.
// Kept on purpose: react-query is heavy for our needs, and our access
// patterns are simple (string keys, manual invalidation on mutations).

type Entry = { data: unknown; fetchedAt: number }

const store = new Map<string, Entry>()
const listeners = new Map<string, Set<() => void>>()

function notify(key: string) {
    listeners.get(key)?.forEach((cb) => cb())
}

export const cache = {
    get<T>(key: string): T | undefined {
        return store.get(key)?.data as T | undefined
    },

    set<T>(key: string, data: T): void {
        store.set(key, { data, fetchedAt: Date.now() })
        notify(key)
    },

    /** Returns ms since the cached value was set, or null if missing. */
    age(key: string): number | null {
        const entry = store.get(key)
        return entry ? Date.now() - entry.fetchedAt : null
    },

    /**
     * Drop one or many cache entries. Pass a string for an exact key, or
     * a predicate for prefix/regex-style matching.
     */
    invalidate(key: string | ((k: string) => boolean)): void {
        if (typeof key === "string") {
            if (store.delete(key)) notify(key)
            return
        }
        for (const k of [...store.keys()]) {
            if (key(k)) {
                store.delete(k)
                notify(k)
            }
        }
    },

    /** Clear everything. Call this on login/logout transitions. */
    clear(): void {
        const keys = [...store.keys()]
        store.clear()
        keys.forEach(notify)
    },

    subscribe(key: string, cb: () => void): () => void {
        let set = listeners.get(key)
        if (!set) {
            set = new Set()
            listeners.set(key, set)
        }
        set.add(cb)
        return () => {
            set!.delete(cb)
            if (set!.size === 0) listeners.delete(key)
        }
    },
}

/**
 * Convenience: invalidate everything matching a prefix. Pairs nicely with
 * mutation handlers.
 *
 *   await sessionsApi.create(...)
 *   invalidatePrefix("workouts:sessions")
 */
export function invalidatePrefix(prefix: string): void {
    cache.invalidate((k) => k.startsWith(prefix))
}
