import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { sessionsApi } from "../../lib/endpoints/sessions"
import { workoutsApi } from "../../lib/endpoints/workouts"
import { useQuery } from "../../hooks/useQuery"
import { useCachedQuery } from "../../hooks/useCachedQuery"
import { cache, invalidatePrefix } from "../../lib/cache"
import { confirm } from "../../stores/confirmStore"
import { toast } from "../../stores/toastStore"
import { useSessionStore } from "../../stores/sessionStore"
import type { PlanDay, PlanExercise } from "../../schemas/workout"
import type { LogSetInput, WorkoutSessionWithSets } from "../../schemas/session"
import SetLogger from "./components/SetLogger"
import RestTimer from "./components/RestTimer"
import HistorySheet from "./components/HistorySheet"
import Spinner from "../../components/ui/Spinner"
import Skeleton from "../../components/ui/Skeleton"

function SessionView() {
    const { id = "" } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const setActive = useSessionStore((s) => s.setActive)
    const upsertSetInStore = useSessionStore((s) => s.upsertSet)
    const removeSetInStore = useSessionStore((s) => s.removeSet)
    const clearActive = useSessionStore((s) => s.clearActive)
    const cachedActive = useSessionStore((s) => s.activeSession)

    const sessionKey = id ? `workouts:sessions:${id}` : null
    const { state: sessionState, refetch: refetchSession } = useCachedQuery(
        sessionKey,
        () => sessionsApi.get(id),
        { ttl: 15_000, enabled: !!id },
    )
    const { state: planState } = useCachedQuery(
        "workouts:plan",
        () => workoutsApi.getPlan(),
    )

    const { state: logState, call: logSet } = useQuery(sessionsApi.logSet)
    const { state: deleteState, call: deleteSet } = useQuery(sessionsApi.deleteSet)
    const { state: completeState, call: completeSession } = useQuery(
        sessionsApi.complete,
    )
    const { state: abandonState, call: abandonSession } = useQuery(
        sessionsApi.abandon,
    )

    const [restSeconds, setRestSeconds] = useState<number | null>(null)
    const [restKey, setRestKey] = useState(0)
    const [history, setHistory] = useState<{
        planExerciseId: string
        exerciseName: string
    } | null>(null)
    const [showCompleteForm, setShowCompleteForm] = useState(false)
    const [completionNotes, setCompletionNotes] = useState("")

    // Cached fetch hydrates instantly from memory; sessionStore covers
    // localStorage-survived state across reloads.
    const session: WorkoutSessionWithSets | null =
        sessionState.data?.session ??
        (cachedActive && cachedActive.id === id ? cachedActive : null)

    // Mirror the freshly-fetched session into the store so other pages
    // (DaySession, Dashboard) see the latest in-progress state.
    useEffect(() => {
        if (sessionState.data?.session) {
            setActive(sessionState.data.session)
        }
    }, [sessionState.data, setActive])

    const day: PlanDay | null = useMemo(() => {
        if (!session || !planState.data?.plan) return null
        return (
            planState.data.plan.days.find((d) => d.id === session.planDayId) ??
            null
        )
    }, [session, planState.data])

    const elapsed = useElapsed(session?.startedAt ?? null)

    const handleLog = async (
        planExercise: PlanExercise,
        input: Omit<LogSetInput, "planExerciseId">,
    ) => {
        const res = await logSet(id, {
            planExerciseId: planExercise.id,
            ...input,
        })
        upsertSetInStore(res.setLog)
        // Drop server-derived caches that this write affected.
        if (sessionKey) cache.invalidate(sessionKey)
        cache.invalidate("workouts:sessions:active")
        cache.invalidate(
            `workouts:exercises:${planExercise.id}:history`,
        )
        invalidatePrefix("workouts:sessions:list:")
        // Refetch session — cheap because cache already invalidated.
        refetchSession().catch(() => {})
        if (planExercise.restSeconds && planExercise.restSeconds > 0) {
            setRestSeconds(planExercise.restSeconds)
            setRestKey((k) => k + 1)
        }
    }

    const handleDelete = async (setLogId: string) => {
        const set = session?.sets.find((s) => s.id === setLogId)
        await deleteSet(id, setLogId)
        removeSetInStore(setLogId)
        if (sessionKey) cache.invalidate(sessionKey)
        cache.invalidate("workouts:sessions:active")
        if (set) {
            cache.invalidate(
                `workouts:exercises:${set.planExerciseId}:history`,
            )
        }
        invalidatePrefix("workouts:sessions:list:")
        refetchSession().catch(() => {})
    }

    const handleComplete = async () => {
        try {
            await completeSession(id, completionNotes.trim() || undefined)
            clearActive()
            invalidatePrefix("workouts:sessions:")
            toast.success("Session done — nice work")
            navigate("/dashboard", { replace: true })
        } catch {
            // surfaced via completeState.error
        }
    }

    const handleAbandon = async () => {
        const ok = await confirm({
            title: "Abandon this session?",
            body: "Sets you logged in this session will be deleted.",
            confirmLabel: "Abandon",
            destructive: true,
        })
        if (!ok) return
        try {
            await abandonSession(id)
            clearActive()
            invalidatePrefix("workouts:sessions:")
            toast.info("Session abandoned")
            navigate(-1)
        } catch {
            // surfaced via abandonState.error
        }
    }

    const showFirstLoad = sessionState.loading && !session

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur border-b border-neutral-200">
                <div className="max-w-2xl mx-auto px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
                    <Link
                        to="/dashboard"
                        className="text-xl font-black tracking-tight"
                    >
                        GC
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500 tabular-nums">
                            {elapsed}
                        </span>
                        <button
                            type="button"
                            onClick={handleAbandon}
                            disabled={abandonState.loading}
                            className="text-xs text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                            Abandon
                        </button>
                    </div>
                </div>
            </header>

            <section className="max-w-2xl mx-auto px-6 sm:px-10 py-8 pb-32">
                {showFirstLoad && (
                    <div className="flex flex-col gap-4">
                        <Skeleton width={120} height={11} />
                        <Skeleton width="60%" height={56} />
                        <Skeleton height={180} rounded="2xl" />
                        <Skeleton height={180} rounded="2xl" />
                    </div>
                )}

                {sessionState.error && !session && (
                    <ErrorBox
                        message={
                            sessionState.error.userMessage ||
                            sessionState.error.message ||
                            "Couldn't load this session."
                        }
                    />
                )}

                {session && day && (
                    <>
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                            In progress
                        </span>
                        <h1 className="mt-3 text-5xl sm:text-6xl font-black tracking-tight leading-[1.02]">
                            {day.name}.
                        </h1>
                        <p className="mt-3 text-neutral-500">
                            {day.exercises.length} exercises ·{" "}
                            <span className="text-neutral-700 font-medium">
                                tap Log when you finish a set.
                            </span>
                        </p>

                        <div className="mt-8 flex flex-col gap-4">
                            {day.exercises.map((pe) => (
                                <SetLogger
                                    key={pe.id}
                                    planExercise={pe}
                                    sets={session.sets.filter(
                                        (s) => s.planExerciseId === pe.id,
                                    )}
                                    onLog={(input) => handleLog(pe, input)}
                                    onDelete={handleDelete}
                                    onShowHistory={() =>
                                        setHistory({
                                            planExerciseId: pe.id,
                                            exerciseName: pe.exercise.name,
                                        })
                                    }
                                    disabled={
                                        completeState.loading ||
                                        abandonState.loading
                                    }
                                />
                            ))}
                        </div>

                        {(logState.error ||
                            deleteState.error ||
                            completeState.error ||
                            abandonState.error) && (
                            <ErrorBox
                                message={
                                    (
                                        logState.error ||
                                        deleteState.error ||
                                        completeState.error ||
                                        abandonState.error
                                    )?.userMessage ??
                                    "Something went wrong."
                                }
                            />
                        )}

                        {showCompleteForm ? (
                            <div className="mt-8 rounded-2xl bg-white border border-neutral-200 p-5">
                                <label
                                    htmlFor="session-notes"
                                    className="text-sm font-medium text-neutral-700"
                                >
                                    How'd it go?
                                </label>
                                <textarea
                                    id="session-notes"
                                    value={completionNotes}
                                    onChange={(e) =>
                                        setCompletionNotes(e.target.value)
                                    }
                                    rows={3}
                                    placeholder="Optional — sleep, pump, anything off"
                                    className="mt-2 w-full px-4 py-3 text-base rounded-xl bg-stone-50 border border-neutral-200 focus:border-neutral-900 outline-none transition-colors resize-none"
                                />
                                <div className="mt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCompleteForm(false)}
                                        disabled={completeState.loading}
                                        className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleComplete}
                                        disabled={completeState.loading}
                                        className="inline-flex items-center gap-2 min-h-12 px-6 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                                    >
                                        {completeState.loading && (
                                            <Spinner size="sm" />
                                        )}
                                        {completeState.loading
                                            ? "Saving…"
                                            : "Finish session"}
                                        {!completeState.loading && (
                                            <span aria-hidden>→</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowCompleteForm(true)}
                                className="mt-10 w-full inline-flex items-center justify-center gap-2 min-h-14 px-6 rounded-full bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
                            >
                                Complete session
                                <span aria-hidden className="text-lg">→</span>
                            </button>
                        )}
                    </>
                )}

                {session && !day && planState.data && (
                    <ErrorBox message="The plan day for this session is missing — it may have been archived." />
                )}
            </section>

            {restSeconds !== null && (
                <RestTimer
                    key={restKey}
                    seconds={restSeconds}
                    onDismiss={() => setRestSeconds(null)}
                />
            )}

            {history && (
                <HistorySheet
                    planExerciseId={history.planExerciseId}
                    exerciseName={history.exerciseName}
                    onClose={() => setHistory(null)}
                />
            )}
        </main>
    )
}

function useElapsed(startedAt: string | null) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 30_000)
        return () => window.clearInterval(id)
    }, [])
    if (!startedAt) return "–:––"
    const ms = now - new Date(startedAt).getTime()
    if (Number.isNaN(ms) || ms < 0) return "–:––"
    const totalMin = Math.floor(ms / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
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

export default SessionView
