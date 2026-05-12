import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { PlanDay, PlanExercise } from "../../../schemas/workout"
import ExercisePicker from "./ExercisePicker"
import { WEEKDAY_LONG, todayWeekdayIndex } from "../weekday"
import { sessionsApi } from "../../../lib/endpoints/sessions"
import {
    detectSessionInProgress,
    planEditApi,
} from "../../../lib/endpoints/plan-edit"
import { useQuery } from "../../../hooks/useQuery"
import { useCachedQuery } from "../../../hooks/useCachedQuery"
import { cache, invalidatePrefix } from "../../../lib/cache"
import { useSessionStore } from "../../../stores/sessionStore"
import Spinner from "../../../components/ui/Spinner"

type Props = {
    day: PlanDay
    onRefresh: () => void
    /** Show "Day N of M" eyebrow when caller knows total days. */
    totalDays?: number
}

/**
 * Renders one day's session: header + exercise list + the swap modal +
 * the Start/Resume CTA wired to the workout-logging API.
 */
function DaySession({ day, onRefresh, totalDays }: Props) {
    const navigate = useNavigate()
    const [swapping, setSwapping] = useState<PlanExercise | null>(null)

    const setActive = useSessionStore((s) => s.setActive)
    const cachedActive = useSessionStore((s) => s.activeSession)

    const { state: activeState } = useCachedQuery(
        "workouts:sessions:active",
        () => sessionsApi.getActive(),
        { ttl: 15_000 },
    )
    const { state: createState, call: createSession } = useQuery(
        sessionsApi.create,
    )

    // Mirror cached active into sessionStore (single source of truth for
    // resume across pages + survives reload).
    useEffect(() => {
        if (activeState.data) setActive(activeState.data.session)
    }, [activeState.data, setActive])

    const active = activeState.data?.session ?? cachedActive
    const activeIsThisDay = !!active && active.planDayId === day.id
    const activeIsAnotherDay = !!active && active.planDayId !== day.id

    const effectiveWeekday = day.weekdayHint ?? day.dayIndex % 7
    const isToday = effectiveWeekday === todayWeekdayIndex()
    const weekdayLabel = WEEKDAY_LONG[effectiveWeekday] ?? "—"

    const handleStart = async () => {
        try {
            const res = await createSession(day.id)
            invalidatePrefix("workouts:sessions:")
            navigate(`/workouts/sessions/${res.session.id}`)
        } catch {
            // shown via createState.error
        }
    }

    const handleResume = () => {
        if (active) navigate(`/workouts/sessions/${active.id}`)
    }

    return (
        <>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                {totalDays
                    ? `Day ${day.dayIndex + 1} of ${totalDays}`
                    : `Day ${day.dayIndex + 1}`}
                {" · "}
                <span className="text-neutral-700">{weekdayLabel}</span>
                {isToday && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[10px] tracking-normal normal-case font-bold">
                        today
                    </span>
                )}
            </span>

            <h1 className="mt-3 text-5xl sm:text-6xl font-black tracking-tight leading-[1.02]">
                {day.name}.
            </h1>
            <p className="mt-3 text-neutral-500">
                {day.exercises.length} exercise
                {day.exercises.length === 1 ? "" : "s"}
                {" · "}
                <span className="text-neutral-700 font-medium">let's lift.</span>
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                {activeIsThisDay ? (
                    <button
                        type="button"
                        onClick={handleResume}
                        className="inline-flex items-center gap-2 min-h-14 px-7 rounded-full bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
                    >
                        Resume session
                        <span aria-hidden className="text-lg">→</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleStart}
                        disabled={createState.loading || activeIsAnotherDay}
                        className="inline-flex items-center gap-2 min-h-14 px-7 rounded-full bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {createState.loading && <Spinner size="sm" />}
                        {createState.loading ? "Starting…" : "Start session"}
                        {!createState.loading && (
                            <span aria-hidden className="text-lg">→</span>
                        )}
                    </button>
                )}
                {activeIsAnotherDay && active && (
                    <button
                        type="button"
                        onClick={handleResume}
                        className="text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-4"
                    >
                        Finish your other session first →
                    </button>
                )}
            </div>

            {createState.error && (
                <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    {createState.error.userMessage || createState.error.message}
                </div>
            )}

            <ul className="mt-8 rounded-2xl bg-white border border-neutral-200 divide-y divide-neutral-200">
                {day.exercises.map((ex) => (
                    <ExerciseListItem
                        key={ex.id}
                        ex={ex}
                        onSwap={() => setSwapping(ex)}
                    />
                ))}
            </ul>

            {swapping && (
                <ExercisePicker
                    swappingFrom={swapping}
                    onClose={() => setSwapping(null)}
                    onSelect={async (ex) => {
                        try {
                            const res = await planEditApi.updateExercise(
                                swapping.id,
                                ex.origin === "user"
                                    ? { userExerciseId: ex.id }
                                    : { exerciseId: ex.id },
                            )
                            // Push the fresh plan into cache so the parent
                            // accordion / day view reflects it immediately.
                            cache.set("workouts:plan", { plan: res.plan })
                            invalidatePrefix("workouts:today")
                            invalidatePrefix("workouts:sessions:")
                            onRefresh()
                        } catch (err) {
                            // Re-throw the user-facing message; ExercisePicker
                            // surfaces it inline. The session_in_progress
                            // case becomes a generic "finish your session
                            // first" message — DaySession isn't the right
                            // place to deep-link, the session is what the
                            // user is currently inside.
                            const c = detectSessionInProgress(err)
                            if (c) {
                                throw new Error(
                                    "Finish your session before swapping exercises.",
                                )
                            }
                            throw err
                        }
                    }}
                />
            )}
        </>
    )
}

function ExerciseListItem({
    ex,
    onSwap,
}: {
    ex: PlanExercise
    onSwap: () => void
}) {
    return (
        <li className="px-5 py-4 flex items-start gap-4">
            <Link
                to={`/exercises/${ex.exercise.slug}`}
                className="shrink-0"
                aria-label={`Open ${ex.exercise.name}`}
            >
                <ExerciseThumbnail
                    images={ex.exercise.imageUrls}
                    alt={ex.exercise.name}
                />
            </Link>

            <div className="min-w-0 flex-1">
                <Link
                    to={`/exercises/${ex.exercise.slug}`}
                    className="text-base font-semibold hover:underline underline-offset-4 decoration-neutral-300"
                >
                    {ex.exercise.name}
                </Link>
                <div className="mt-1 text-xs text-neutral-500">
                    {ex.exercise.primaryMuscles.join(", ")}
                    {ex.exercise.equipment ? ` · ${ex.exercise.equipment}` : ""}
                </div>
                <div className="mt-2 text-sm text-neutral-700 tabular-nums font-medium">
                    {ex.targetSets} × {ex.targetRepsMin}–{ex.targetRepsMax}
                    {ex.targetRpe !== null && (
                        <span className="text-neutral-400">
                            {" "}
                            @ RPE {ex.targetRpe}
                        </span>
                    )}
                    {ex.restSeconds !== null && (
                        <span className="text-neutral-400">
                            {" "}
                            · {ex.restSeconds}s rest
                        </span>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={onSwap}
                className="shrink-0 text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-4"
            >
                Swap
            </button>
        </li>
    )
}

function ExerciseThumbnail({
    images,
    alt,
}: {
    images: string[]
    alt: string
}) {
    const [failed, setFailed] = useState(false)
    const src = images[0]

    if (!src || failed) {
        return (
            <div
                aria-hidden
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center text-neutral-300 text-2xl font-black"
            >
                {alt.charAt(0).toUpperCase()}
            </div>
        )
    }

    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover bg-white border border-neutral-200"
        />
    )
}

export default DaySession
