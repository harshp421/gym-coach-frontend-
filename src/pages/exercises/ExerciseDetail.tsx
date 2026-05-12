import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { exercisesApi } from "../../lib/endpoints/exercises"
import { useQuery } from "../../hooks/useQuery"

function ExerciseDetail() {
    const { slug = "" } = useParams<{ slug: string }>()
    const { state, call: fetchExercise } = useQuery(exercisesApi.get)

    useEffect(() => {
        if (!slug) return
        fetchExercise(slug).catch(() => {})
    }, [slug, fetchExercise])

    const ex = state.data?.exercise

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="max-w-3xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
                <Link to="/dashboard" className="text-xl font-black tracking-tight">
                    GC
                </Link>
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                >
                    ← Back
                </button>
            </header>

            <section className="max-w-3xl mx-auto px-6 sm:px-10 pb-24">
                {state.loading && !ex && (
                    <p className="mt-6 text-neutral-500">Loading…</p>
                )}

                {state.error && !state.loading && (
                    <ErrorBox
                        message={
                            state.error.userMessage ||
                            state.error.message ||
                            "Couldn't load this exercise."
                        }
                    />
                )}

                {ex && (
                    <>
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                            {ex.category}
                        </span>
                        <h1 className="mt-3 text-5xl sm:text-6xl font-black tracking-tight leading-[1.02]">
                            {ex.name}.
                        </h1>

                        <div className="mt-6 flex flex-wrap gap-2">
                            <Tag>
                                <span className="font-medium">Primary</span>{" "}
                                {ex.primaryMuscles.join(", ")}
                            </Tag>
                            {ex.secondaryMuscles.length > 0 && (
                                <Tag>
                                    <span className="font-medium">Secondary</span>{" "}
                                    {ex.secondaryMuscles.join(", ")}
                                </Tag>
                            )}
                            {ex.equipment && (
                                <Tag>
                                    <span className="font-medium">Equipment</span>{" "}
                                    {ex.equipment}
                                </Tag>
                            )}
                            <Tag>
                                <span className="font-medium">Level</span> {ex.level}
                            </Tag>
                            {ex.mechanic && (
                                <Tag>
                                    <span className="font-medium">Mechanic</span>{" "}
                                    {ex.mechanic}
                                </Tag>
                            )}
                        </div>

                        {ex.imageUrls.length > 0 && (
                            <div className="mt-8 grid grid-cols-2 gap-3">
                                {ex.imageUrls.slice(0, 4).map((url) => (
                                    <img
                                        key={url}
                                        src={url}
                                        alt={ex.name}
                                        className="w-full aspect-square object-cover rounded-2xl bg-neutral-100"
                                        loading="lazy"
                                    />
                                ))}
                            </div>
                        )}

                        {ex.instructions.length > 0 && (
                            <div className="mt-10">
                                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                                    How to do it
                                </h2>
                                <ol className="mt-3 flex flex-col gap-3 text-base text-neutral-800 leading-relaxed">
                                    {ex.instructions.map((step, i) => (
                                        <li
                                            key={i}
                                            className="flex gap-3 rounded-2xl bg-white border border-neutral-200 p-4"
                                        >
                                            <span className="shrink-0 size-7 inline-flex items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold tabular-nums">
                                                {i + 1}
                                            </span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    )
}

function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-xs text-neutral-700 capitalize">
            {children}
        </span>
    )
}

function ErrorBox({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
            {message}
        </div>
    )
}

export default ExerciseDetail
