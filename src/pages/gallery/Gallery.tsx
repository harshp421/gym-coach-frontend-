import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import type { Exercise } from "../../schemas/workout"
import { galleryApi } from "../../lib/endpoints/exercises"
import { toast } from "../../stores/toastStore"
import BackButton from "../../components/BackButton"
import ExerciseCard from "./components/ExerciseCard"
import AddToPlanSheet from "./components/AddToPlanSheet"

const FILTERS: Array<{ key: string | null; label: string }> = [
    { key: null, label: "All" },
    { key: "chest", label: "Chest" },
    { key: "lats", label: "Back" },
    { key: "shoulders", label: "Shoulders" },
    { key: "biceps", label: "Biceps" },
    { key: "triceps", label: "Triceps" },
    { key: "quadriceps", label: "Quads" },
    { key: "hamstrings", label: "Hamstrings" },
    { key: "glutes", label: "Glutes" },
    { key: "abdominals", label: "Core" },
]

const PAGE_SIZE = 12

function Gallery() {
    const [muscle, setMuscle] = useState<string | null>(null)
    const [items, setItems] = useState<Exercise[]>([])
    const [nextOffset, setNextOffset] = useState<number | null>(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [addingFor, setAddingFor] = useState<Exercise | null>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)

    // Reset + load page 1 whenever the filter changes.
    useEffect(() => {
        let cancelled = false
        setItems([])
        setNextOffset(0)
        setError(null)
        setLoading(true)
        galleryApi
            .feed({ muscle: muscle ?? undefined, offset: 0, limit: PAGE_SIZE })
            .then((res) => {
                if (cancelled) return
                setItems(res.items)
                setNextOffset(res.nextOffset)
            })
            .catch((err) => {
                if (cancelled) return
                setError(err?.userMessage || err?.message || "Couldn't load the feed")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [muscle])

    // Append the next page.
    const loadMore = useCallback(async () => {
        if (loading || nextOffset === null) return
        setLoading(true)
        try {
            const res = await galleryApi.feed({
                muscle: muscle ?? undefined,
                offset: nextOffset,
                limit: PAGE_SIZE,
            })
            setItems((prev) => [...prev, ...res.items])
            setNextOffset(res.nextOffset)
        } catch (err) {
            const msg =
                (err as { userMessage?: string; message?: string })?.userMessage ||
                (err as Error)?.message ||
                "Couldn't load more"
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }, [loading, nextOffset, muscle])

    // Infinite scroll sentinel.
    useEffect(() => {
        const el = sentinelRef.current
        if (!el) return
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) loadMore()
            },
            { rootMargin: "300px" },
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [loadMore])

    // Optimistic like toggle. Rollback on error.
    const toggleLike = useCallback(async (target: Exercise) => {
        const wasLiked = target.likedByMe === true
        setItems((prev) =>
            prev.map((e) =>
                e.id === target.id ? { ...e, likedByMe: !wasLiked } : e,
            ),
        )
        try {
            if (wasLiked) await galleryApi.unlike(target.id)
            else await galleryApi.like(target.id)
        } catch (err) {
            setItems((prev) =>
                prev.map((e) =>
                    e.id === target.id ? { ...e, likedByMe: wasLiked } : e,
                ),
            )
            const msg =
                (err as { userMessage?: string; message?: string })?.userMessage ||
                (err as Error)?.message ||
                "Couldn't update like"
            toast.error(msg)
        }
    }, [])

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            {/* Header */}
            <header className="max-w-[480px] mx-auto px-4 sm:px-6 pt-6 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BackButton to="/dashboard" />
                    <Link to="/dashboard" className="text-xl font-black tracking-tight">
                        GC
                    </Link>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Discover
                </span>
            </header>

            {/* Filter bar */}
            <div className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur border-b border-neutral-200">
                <div className="max-w-[480px] mx-auto px-4 sm:px-6 py-3 overflow-x-auto">
                    <div className="flex gap-2 w-max">
                        {FILTERS.map((f) => {
                            const active = (muscle ?? null) === f.key
                            return (
                                <button
                                    key={f.label}
                                    type="button"
                                    onClick={() => setMuscle(f.key)}
                                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                        active
                                            ? "bg-neutral-900 text-white border-neutral-900"
                                            : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Feed */}
            <section className="max-w-[480px] mx-auto px-4 sm:px-6 py-6 pb-24">
                {error && items.length === 0 && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                {!error && items.length === 0 && loading && (
                    <CardSkeletons count={3} />
                )}

                {!error && items.length === 0 && !loading && (
                    <div className="text-center py-16 text-sm text-neutral-500">
                        Nothing matches that filter yet.
                    </div>
                )}

                {items.length > 0 && (
                    <ul className="flex flex-col gap-6">
                        {items.map((ex) => (
                            <li key={ex.id}>
                                <ExerciseCard
                                    exercise={ex}
                                    onToggleLike={() => toggleLike(ex)}
                                    onAddToPlan={() => setAddingFor(ex)}
                                />
                            </li>
                        ))}
                    </ul>
                )}

                {/* Sentinel triggers loadMore when in view */}
                <div ref={sentinelRef} className="h-1" aria-hidden />

                {loading && items.length > 0 && (
                    <div className="mt-6 text-center text-xs text-neutral-400">
                        Loading more…
                    </div>
                )}

                {!loading && nextOffset === null && items.length > 0 && (
                    <div className="mt-6 text-center text-xs text-neutral-400">
                        You've reached the end.
                    </div>
                )}
            </section>

            {addingFor && (
                <AddToPlanSheet
                    exercise={addingFor}
                    onClose={() => setAddingFor(null)}
                />
            )}
        </main>
    )
}

function CardSkeletons({ count }: { count: number }) {
    return (
        <ul className="flex flex-col gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <li
                    key={i}
                    className="bg-white border border-neutral-200 rounded-2xl overflow-hidden"
                >
                    <div className="aspect-square bg-neutral-100 animate-pulse" />
                    <div className="px-3 py-2 flex gap-3">
                        <div className="h-7 w-7 rounded-full bg-neutral-100 animate-pulse" />
                        <div className="h-7 w-7 rounded-full bg-neutral-100 animate-pulse" />
                    </div>
                    <div className="px-4 pb-4 space-y-2">
                        <div className="h-4 w-3/4 bg-neutral-100 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-neutral-100 rounded animate-pulse" />
                    </div>
                </li>
            ))}
        </ul>
    )
}

export default Gallery
