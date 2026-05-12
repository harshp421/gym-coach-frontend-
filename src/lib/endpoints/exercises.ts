import { api } from "../api"
import { cache } from "../cache"
import type { Exercise, ExerciseLevel, ExerciseMechanic } from "../../schemas/workout"

export type ExerciseListQuery = {
    muscle?: string
    equipment?: string
    level?: ExerciseLevel
    mechanic?: ExerciseMechanic
    category?: string
    q?: string
    limit?: number
    offset?: number
}

export type ExerciseListResult = {
    items: Exercise[]
    total: number
}

// Cache key namespace. Pairs with `invalidatePrefix("exercises:")` already
// wired into the user-exercise mutation paths in MyExercises.
const LIST_PREFIX = "exercises:list:"
const DETAIL_PREFIX = "exercises:detail:"

// Stable key for a query object — JSON.stringify is order-sensitive and
// drops undefined, which would split equivalent queries across cache slots.
function listKey(query: ExerciseListQuery): string {
    const keys = Object.keys(query)
        .filter((k) => {
            const v = (query as Record<string, unknown>)[k]
            return v !== undefined && v !== null && v !== ""
        })
        .sort()
    const parts = keys.map(
        (k) => `${k}=${String((query as Record<string, unknown>)[k])}`,
    )
    return `${LIST_PREFIX}${parts.join("&")}`
}

export const exercisesApi = {
    list: async (query: ExerciseListQuery = {}): Promise<ExerciseListResult> => {
        const key = listKey(query)
        const hit = cache.get<ExerciseListResult>(key)
        if (hit) return hit
        const res = await api.get<ExerciseListResult>("/exercises", { query })
        cache.set(key, res)
        return res
    },

    get: async (slug: string): Promise<{ exercise: Exercise }> => {
        const key = `${DETAIL_PREFIX}${slug}`
        const hit = cache.get<{ exercise: Exercise }>(key)
        if (hit) return hit
        const res = await api.get<{ exercise: Exercise }>("/exercises/{slug}", {
            params: { slug },
        })
        cache.set(key, res)
        return res
    },

    // Synchronous cache peek — components can render last known results
    // instantly while a fresh fetch runs in the background.
    peekList: (query: ExerciseListQuery = {}): ExerciseListResult | null => {
        return cache.get<ExerciseListResult>(listKey(query)) ?? null
    },
}

// ---------------------------------------------------------------------------
// Discover gallery — image-first feed with per-user like state.
// Not cached client-side; like toggles flip state too often for staleness
// to be worth managing in the simple cache.
// ---------------------------------------------------------------------------
export type GalleryQuery = {
    muscle?: string
    equipment?: string
    level?: ExerciseLevel
    mechanic?: ExerciseMechanic
    q?: string
    limit?: number
    offset?: number
}

export type GalleryResult = {
    items: Exercise[]
    total: number
    nextOffset: number | null
}

export const galleryApi = {
    feed: (query: GalleryQuery = {}) =>
        api.get<GalleryResult>("/exercises/gallery", { query }),

    like: (exerciseId: string) =>
        api.post<{ ok: true; likedByMe: true }>("/exercises/{id}/like", {
            params: { id: exerciseId },
        }),

    unlike: (exerciseId: string) =>
        api.delete<{ ok: true; likedByMe: false }>("/exercises/{id}/like", {
            params: { id: exerciseId },
        }),
}
