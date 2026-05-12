import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { workoutsApi } from "../../lib/endpoints/workouts"
import { sessionsApi } from "../../lib/endpoints/sessions"
import {
    detectSessionInProgress,
    planEditApi,
    type PlanResponse,
} from "../../lib/endpoints/plan-edit"
import { useQuery } from "../../hooks/useQuery"
import { useCachedQuery } from "../../hooks/useCachedQuery"
import { cache, invalidatePrefix } from "../../lib/cache"
import { confirm } from "../../stores/confirmStore"
import { toast } from "../../stores/toastStore"
import BottomNav from "../../components/BottomNav"
import {
    SPLIT_LABEL,
    type Goal,
    type PlanDay,
    type PlanExercise,
    type WorkoutPlan,
} from "../../schemas/workout"
import type {
    WorkoutSessionListItem,
    WorkoutSessionWithSets,
} from "../../schemas/session"
import { WEEKDAY_SHORT, nextFreeWeekday, todayWeekdayIndex } from "./weekday"
import Spinner from "../../components/ui/Spinner"
import Skeleton from "../../components/ui/Skeleton"
import DayEditor from "./components/DayEditor"
import ExercisePicker from "./components/ExercisePicker"

type DayStatus = "idle" | "in_progress" | "done_today"
// Add-exercise lives inline inside DayEditor now; PlanView only opens the
// modal for swap, so the picker state is just the swap target.
type PickerState = { kind: "swap"; target: PlanExercise } | null

const GOALS: Goal[] = ["cut", "maintain", "bulk", "recomp"]

function PlanView() {
    const { state: planState, refetch: refetchPlan } = useCachedQuery(
        "workouts:plan",
        () => workoutsApi.getPlan(),
    )
    const { state: activeState } = useCachedQuery(
        "workouts:sessions:active",
        () => sessionsApi.getActive(),
        { ttl: 15_000 },
    )
    const { state: recentState } = useCachedQuery(
        "workouts:sessions:list:limit=20",
        () => sessionsApi.listRecent({ limit: 20 }),
        { ttl: 30_000 },
    )

    const { state: genState, call: generate } = useQuery(workoutsApi.generatePlan)
    const { state: aiGenState, call: aiGenerate } = useQuery(
        workoutsApi.aiGeneratePlan,
    )
    const { state: emptyState, call: createEmpty } = useQuery(
        planEditApi.createEmptyPlan,
    )

    const [editing, setEditing] = useState(false)
    const [conflictSession, setConflictSession] = useState<string | null>(null)
    const [picker, setPicker] = useState<PickerState>(null)

    const plan = planState.data?.plan ?? null
    const active = activeState.data?.session ?? null
    const recent = recentState.data?.items ?? []

    // Push the freshest plan straight into the cache after a mutation so
    // the UI reflects the change without a follow-up GET. Also invalidate
    // sibling caches that depend on plan structure.
    const handleAfterMutation = (res: PlanResponse) => {
        cache.set("workouts:plan", { plan: res.plan })
        invalidatePrefix("workouts:today")
        invalidatePrefix("workouts:sessions:")
    }

    const handleConflict = (sessionId: string) => {
        setConflictSession(sessionId)
    }

    const handleGenerate = async () => {
        try {
            await generate()
            invalidatePrefix("workouts:")
            await refetchPlan()
            toast.success("Plan regenerated")
        } catch (err) {
            const conflict = detectSessionInProgress(err)
            if (conflict) handleConflict(conflict.sessionId)
        }
    }

    const handleAIGenerate = async () => {
        try {
            await aiGenerate()
            invalidatePrefix("workouts:")
            await refetchPlan()
            toast.success("AI plan ready")
        } catch (err) {
            const conflict = detectSessionInProgress(err)
            if (conflict) handleConflict(conflict.sessionId)
        }
    }

    const handleBuildFromScratch = async () => {
        try {
            const res = await createEmpty({})
            handleAfterMutation(res)
            setEditing(true)
            toast.success("Empty plan ready — start adding days")
        } catch (err) {
            const conflict = detectSessionInProgress(err)
            if (conflict) handleConflict(conflict.sessionId)
        }
    }

    /**
     * Same blank-plan path as `handleBuildFromScratch`, but used when an
     * active plan already exists — confirm before archiving it. Server-side
     * `/plan/empty` archives + creates atomically; we just need to warn.
     */
    const handleStartNewPlan = async () => {
        const ok = await confirm({
            title: "Start a new blank plan?",
            body: "Your current plan will be archived. Logged sessions stay in your history.",
            confirmLabel: "New plan",
            destructive: true,
        })
        if (!ok) return
        await handleBuildFromScratch()
    }

    if (planState.loading) {
        return (
            <Shell title="Plan">
                <PlanSkeleton />
            </Shell>
        )
    }

    if (planState.error && !plan) {
        return (
            <Shell title="Plan">
                <ErrorBox
                    message={
                        planState.error.userMessage ||
                        planState.error.message ||
                        "Couldn't load plan."
                    }
                />
            </Shell>
        )
    }

    if (!plan) {
        return (
            <Shell title="Plan">
                <EmptyState
                    onGenerate={handleGenerate}
                    onAIGenerate={handleAIGenerate}
                    onBuildEmpty={handleBuildFromScratch}
                    generating={genState.loading}
                    aiGenerating={aiGenState.loading}
                    creatingEmpty={emptyState.loading}
                    error={
                        genState.error?.userMessage ||
                        genState.error?.message ||
                        aiGenState.error?.userMessage ||
                        aiGenState.error?.message ||
                        emptyState.error?.userMessage ||
                        emptyState.error?.message ||
                        null
                    }
                />
            </Shell>
        )
    }

    return (
        <Shell title={editing ? "Edit plan" : "Plan"}>
            {conflictSession && (
                <ConflictBanner
                    sessionId={conflictSession}
                    onDismiss={() => setConflictSession(null)}
                />
            )}

            {editing ? (
                <PlanEditor
                    plan={plan}
                    onDone={() => setEditing(false)}
                    onAfterMutation={handleAfterMutation}
                    onConflict={handleConflict}
                    onSwapExercise={(pe) =>
                        setPicker({ kind: "swap", target: pe })
                    }
                />
            ) : (
                <PlanReader
                    plan={plan}
                    active={active}
                    recent={recent}
                    onEdit={() => setEditing(true)}
                    onRegenerate={handleGenerate}
                    onAIRegenerate={handleAIGenerate}
                    onStartNewPlan={handleStartNewPlan}
                    regenerating={genState.loading}
                    aiRegenerating={aiGenState.loading}
                    creatingNew={emptyState.loading}
                    regenerateError={
                        genState.error?.userMessage ||
                        genState.error?.message ||
                        aiGenState.error?.userMessage ||
                        aiGenState.error?.message ||
                        null
                    }
                />
            )}

            {picker?.kind === "swap" && (
                <ExercisePicker
                    swappingFrom={picker.target}
                    onClose={() => setPicker(null)}
                    onSelect={async (ex) => {
                        try {
                            const res = await planEditApi.updateExercise(
                                picker.target.id,
                                ex.origin === "user"
                                    ? { userExerciseId: ex.id }
                                    : { exerciseId: ex.id },
                            )
                            handleAfterMutation(res)
                        } catch (err) {
                            const c = detectSessionInProgress(err)
                            if (c) {
                                handleConflict(c.sessionId)
                                return
                            }
                            throw err
                        }
                    }}
                />
            )}
        </Shell>
    )
}

// ---------------------------------------------------------------------------
// Read mode (existing, light cleanup)
// ---------------------------------------------------------------------------

function PlanReader({
    plan,
    active,
    recent,
    onEdit,
    onRegenerate,
    onAIRegenerate,
    onStartNewPlan,
    regenerating,
    aiRegenerating,
    creatingNew,
    regenerateError,
}: {
    plan: WorkoutPlan
    active: WorkoutSessionWithSets | null
    recent: WorkoutSessionListItem[]
    onEdit: () => void
    onRegenerate: () => void
    onAIRegenerate: () => void
    onStartNewPlan: () => void
    regenerating: boolean
    aiRegenerating: boolean
    creatingNew: boolean
    regenerateError: string | null
}) {
    const busy = regenerating || aiRegenerating || creatingNew
    const today = todayWeekdayIndex()
    const anyHints = plan.days.some((d) => d.weekdayHint !== null)
    const sortedDays = [...plan.days].sort((a, b) => a.dayIndex - b.dayIndex)
    const planTitle = plan.name?.trim() || SPLIT_LABEL[plan.splitType]

    return (
        <>
            <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Your week
                </span>
                <h1 className="mt-3 text-5xl sm:text-6xl font-black tracking-tight leading-[1.02]">
                    {planTitle}.
                </h1>
                <p className="mt-3 text-neutral-500">
                    {plan.daysPerWeek} day
                    {plan.daysPerWeek === 1 ? "" : "s"} a week ·{" "}
                    <span className="capitalize">{plan.goal}</span>
                    {plan.name && plan.splitType !== "custom" && (
                        <span className="text-neutral-400">
                            {" "}
                            · {SPLIT_LABEL[plan.splitType]}
                        </span>
                    )}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                        to="/workouts/today"
                        className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                    >
                        Today's workout
                        <span aria-hidden className="text-base">→</span>
                    </Link>
                    <button
                        type="button"
                        onClick={onEdit}
                        className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-sm font-semibold hover:border-neutral-900 transition-colors"
                    >
                        Edit plan
                    </button>
                    <button
                        type="button"
                        onClick={onAIRegenerate}
                        disabled={busy}
                        className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-sm font-semibold hover:border-neutral-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {aiRegenerating && <Spinner size="sm" />}
                        {aiRegenerating ? "Rebuilding with AI…" : "Rebuild with AI ✨"}
                    </button>
                    <button
                        type="button"
                        onClick={onRegenerate}
                        disabled={busy}
                        className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-sm font-semibold hover:border-neutral-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {regenerating && <Spinner size="sm" />}
                        {regenerating ? "Regenerating…" : "Quick regenerate"}
                    </button>
                    <button
                        type="button"
                        onClick={onStartNewPlan}
                        disabled={busy}
                        className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-sm font-semibold hover:border-neutral-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {creatingNew && <Spinner size="sm" />}
                        {creatingNew ? "Starting…" : "+ New plan"}
                    </button>
                </div>

                {regenerateError && <ErrorBox message={regenerateError} />}
            </div>

            <p className="mt-6 text-sm text-neutral-500 max-w-md">
                {anyHints
                    ? "Tap a day to open the session."
                    : "Days are flexible — do them in order at your pace, or tap one to start."}
            </p>

            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedDays.map((day) => (
                    <DayCard
                        key={day.id}
                        day={day}
                        isToday={
                            day.weekdayHint !== null &&
                            day.weekdayHint === today
                        }
                        status={dayStatus(day, active, recent)}
                    />
                ))}
            </ul>
        </>
    )
}

function dayStatus(
    day: PlanDay,
    active: WorkoutSessionWithSets | null,
    recent: WorkoutSessionListItem[],
): DayStatus {
    if (active && active.planDayId === day.id) return "in_progress"
    const todayIso = new Date().toISOString().slice(0, 10)
    const doneToday = recent.some(
        (s) =>
            s.planDayId === day.id &&
            s.completedAt !== null &&
            s.completedAt.slice(0, 10) === todayIso,
    )
    return doneToday ? "done_today" : "idle"
}

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

function PlanEditor({
    plan,
    onDone,
    onAfterMutation,
    onConflict,
    onSwapExercise,
}: {
    plan: WorkoutPlan
    onDone: () => void
    onAfterMutation: (res: PlanResponse) => void
    onConflict: (sessionId: string) => void
    onSwapExercise: (pe: PlanExercise) => void
}) {
    const [name, setName] = useState(plan.name ?? "")
    const [notes, setNotes] = useState(plan.notes ?? "")
    const [goal, setGoal] = useState<Goal>(plan.goal)
    const [savingMeta, setSavingMeta] = useState(false)
    const [metaError, setMetaError] = useState<string | null>(null)

    const [addingDay, setAddingDay] = useState(false)
    const [addError, setAddError] = useState<string | null>(null)
    const [reordering, setReordering] = useState(false)

    useEffect(() => {
        setName(plan.name ?? "")
        setNotes(plan.notes ?? "")
        setGoal(plan.goal)
    }, [plan.id, plan.name, plan.notes, plan.goal])

    const metaDirty =
        (name.trim() || null) !== (plan.name ?? null) ||
        notes.trim() !== (plan.notes ?? "") ||
        goal !== plan.goal

    const handleSaveMeta = async () => {
        if (!metaDirty) return
        setMetaError(null)
        setSavingMeta(true)
        try {
            const res = await planEditApi.updatePlan({
                name: name.trim() === "" ? null : name.trim(),
                notes: notes.trim() === "" ? null : notes.trim(),
                goal,
            })
            onAfterMutation(res)
        } catch (err) {
            const c = detectSessionInProgress(err)
            if (c) {
                onConflict(c.sessionId)
                return
            }
            setMetaError(err instanceof Error ? err.message : "Couldn't save")
        } finally {
            setSavingMeta(false)
        }
    }

    const handleAddDay = async () => {
        setAddError(null)
        setAddingDay(true)
        try {
            const res = await planEditApi.createDay({
                name: `Day ${plan.days.length + 1}`,
                // Pre-fill a sensible weekday so the UI never has to fall
                // back to "Any day". User can change it from the editor.
                weekdayHint: nextFreeWeekday(plan.days),
            })
            onAfterMutation(res)
        } catch (err) {
            const c = detectSessionInProgress(err)
            if (c) {
                onConflict(c.sessionId)
                return
            }
            setAddError(err instanceof Error ? err.message : "Couldn't add day")
        } finally {
            setAddingDay(false)
        }
    }

    const reorderDayTo = async (dayId: string, newIndex: number) => {
        const ordered = [...plan.days].sort((a, b) => a.dayIndex - b.dayIndex)
        if (newIndex < 0 || newIndex >= ordered.length) return
        const fromIndex = ordered.findIndex((d) => d.id === dayId)
        if (fromIndex === -1 || fromIndex === newIndex) return

        const moved = ordered.splice(fromIndex, 1)[0]!
        ordered.splice(newIndex, 0, moved)

        setReordering(true)
        try {
            const body = ordered.map((d, i) => ({ dayId: d.id, dayIndex: i }))
            const res = await planEditApi.reorderDays(body)
            onAfterMutation(res)
        } catch (err) {
            const c = detectSessionInProgress(err)
            if (c) {
                onConflict(c.sessionId)
                return
            }
        } finally {
            setReordering(false)
        }
    }

    const sortedDays = [...plan.days].sort((a, b) => a.dayIndex - b.dayIndex)

    return (
        <>
            <header className="flex items-start justify-between gap-3">
                <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                        Editing
                    </span>
                    <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight leading-[1.05]">
                        Make it yours.
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={onDone}
                    className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                >
                    Done
                </button>
            </header>

            <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Plan
                </div>

                <label className="mt-3 block text-xs font-medium text-neutral-500">
                    Name
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={SPLIT_LABEL[plan.splitType]}
                        disabled={savingMeta}
                        className="mt-1 block w-full min-h-11 px-3 text-base rounded-lg bg-stone-50 border border-neutral-200 focus:border-neutral-900 outline-none disabled:opacity-50"
                    />
                </label>

                <label className="mt-3 block text-xs font-medium text-neutral-500">
                    Goal
                    <select
                        value={goal}
                        onChange={(e) => setGoal(e.target.value as Goal)}
                        disabled={savingMeta}
                        className="mt-1 block w-full min-h-11 px-3 text-base rounded-lg bg-stone-50 border border-neutral-200 focus:border-neutral-900 outline-none disabled:opacity-50 capitalize"
                    >
                        {GOALS.map((g) => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="mt-3 block text-xs font-medium text-neutral-500">
                    Notes
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Optional — block focus, intent, etc."
                        disabled={savingMeta}
                        className="mt-1 block w-full px-3 py-2 text-base rounded-lg bg-stone-50 border border-neutral-200 focus:border-neutral-900 outline-none resize-none disabled:opacity-50"
                    />
                </label>

                {metaError && (
                    <div
                        role="alert"
                        className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                    >
                        {metaError}
                    </div>
                )}

                {metaDirty && (
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={handleSaveMeta}
                            disabled={savingMeta}
                            className="inline-flex items-center gap-2 min-h-10 px-4 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                        >
                            {savingMeta && <Spinner size="sm" />}
                            {savingMeta ? "Saving…" : "Save plan info"}
                        </button>
                    </div>
                )}
            </section>

            <ul className="mt-6 flex flex-col gap-3">
                {sortedDays.map((day, i) => (
                    <li key={day.id}>
                        <DayEditor
                            day={day}
                            canMoveUp={i > 0}
                            canMoveDown={i < sortedDays.length - 1}
                            onMoveUp={() => reorderDayTo(day.id, i - 1)}
                            onMoveDown={() => reorderDayTo(day.id, i + 1)}
                            onAfterMutation={onAfterMutation}
                            onConflict={onConflict}
                            onSwapExercise={onSwapExercise}
                            disabled={reordering}
                        />
                    </li>
                ))}
            </ul>

            <div className="mt-6 flex justify-center">
                <button
                    type="button"
                    onClick={handleAddDay}
                    disabled={addingDay}
                    className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-sm font-semibold hover:border-neutral-900 transition-colors disabled:opacity-50"
                >
                    {addingDay && <Spinner size="sm" />}
                    {addingDay ? "Adding…" : "+ Add day"}
                </button>
            </div>

            {addError && <ErrorBox message={addError} />}
        </>
    )
}

// ---------------------------------------------------------------------------
// Conflict banner
// ---------------------------------------------------------------------------

function ConflictBanner({
    sessionId,
    onDismiss,
}: {
    sessionId: string
    onDismiss: () => void
}) {
    return (
        <div
            role="alert"
            className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3"
        >
            <div className="text-sm text-amber-900">
                <strong>Session in progress.</strong> Finish or abandon it before
                editing the plan.
            </div>
            <div className="flex items-center gap-3">
                <Link
                    to={`/workouts/sessions/${sessionId}`}
                    className="inline-flex items-center gap-1.5 min-h-9 px-4 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                    Resume
                    <span aria-hidden>→</span>
                </Link>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    className="size-8 inline-flex items-center justify-center rounded-full text-amber-900/70 hover:bg-amber-100"
                >
                    ×
                </button>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Read-mode day card (unchanged from before)
// ---------------------------------------------------------------------------

function DayCard({
    day,
    isToday,
    status,
}: {
    day: PlanDay
    isToday: boolean
    status: DayStatus
}) {
    // Null hints fall back to a weekday derived from dayIndex so the card
    // always shows a real day label (Mon, Tue, …) instead of "Any day".
    const weekday =
        WEEKDAY_SHORT[day.weekdayHint ?? day.dayIndex % 7] ?? "—"

    return (
        <li>
            <Link
                to={`/workouts/day/${day.dayIndex}`}
                className={`block rounded-2xl border p-5 transition-colors h-full ${
                    isToday
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white border-neutral-200 hover:border-neutral-900"
                }`}
            >
                <div className="flex items-center justify-between gap-3">
                    <span
                        className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
                            isToday ? "text-neutral-300" : "text-neutral-500"
                        }`}
                    >
                        Day {day.dayIndex + 1} · {weekday}
                    </span>
                    <StatusBadge status={status} isToday={isToday} />
                </div>
                <div className="mt-2 text-2xl font-black tracking-tight">
                    {day.name}
                </div>
                <div
                    className={`mt-3 text-xs tabular-nums ${
                        isToday ? "text-neutral-300" : "text-neutral-500"
                    }`}
                >
                    {day.exercises.length} exercise
                    {day.exercises.length === 1 ? "" : "s"}
                </div>
                <div
                    className={`mt-4 text-xs font-medium ${
                        isToday ? "text-white" : "text-neutral-900"
                    }`}
                >
                    {status === "in_progress"
                        ? "Resume →"
                        : status === "done_today"
                          ? "Review →"
                          : "Open →"}
                </div>
            </Link>
        </li>
    )
}

function StatusBadge({
    status,
    isToday,
}: {
    status: DayStatus
    isToday: boolean
}) {
    if (status === "in_progress") {
        return (
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-normal ${
                    isToday
                        ? "bg-white text-neutral-900"
                        : "bg-neutral-900 text-white"
                }`}
            >
                ● in progress
            </span>
        )
    }
    if (status === "done_today") {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-normal border border-emerald-200">
                ✓ done
            </span>
        )
    }
    if (isToday) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white text-neutral-900 text-[10px] font-bold tracking-normal">
                today
            </span>
        )
    }
    return null
}

// ---------------------------------------------------------------------------
// Shell + skeleton + empty state
// ---------------------------------------------------------------------------

function Shell({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="max-w-3xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
                <Link to="/dashboard" className="text-xl font-black tracking-tight">
                    GC
                </Link>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    {title}
                </span>
            </header>
            <section className="max-w-3xl mx-auto px-6 sm:px-10 pb-32 lg:pb-24">
                {children}
            </section>
            <BottomNav />
        </main>
    )
}

function PlanSkeleton() {
    return (
        <div>
            <Skeleton width={120} height={12} />
            <Skeleton className="mt-3" width="60%" height={56} />
            <Skeleton className="mt-3" width="40%" height={20} />
            <div className="mt-6 flex gap-3">
                <Skeleton width={160} height={48} rounded="full" />
                <Skeleton width={180} height={48} rounded="full" />
            </div>
            <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                    <li key={i}>
                        <div className="rounded-2xl bg-white border border-neutral-200 p-5">
                            <Skeleton width={120} height={11} />
                            <Skeleton className="mt-3" width="50%" height={28} />
                            <Skeleton className="mt-3" width="30%" height={12} />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function EmptyState({
    onGenerate,
    onAIGenerate,
    onBuildEmpty,
    generating,
    aiGenerating,
    creatingEmpty,
    error,
}: {
    onGenerate: () => void
    onAIGenerate: () => void
    onBuildEmpty: () => void
    generating: boolean
    aiGenerating: boolean
    creatingEmpty: boolean
    error: string | null
}) {
    const busy = generating || aiGenerating || creatingEmpty
    return (
        <div className="mt-8">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                No plan yet
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                Let's build your week.
            </h1>
            <p className="mt-3 text-neutral-500 max-w-md">
                Let an AI coach design it, take a quick rule-based plan, or
                build your own from scratch.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={onAIGenerate}
                    disabled={busy}
                    className="inline-flex items-center gap-2 min-h-14 px-7 rounded-full bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {aiGenerating && <Spinner size="sm" />}
                    {aiGenerating ? "Designing your plan…" : "Build with AI"}
                    {!aiGenerating && <span aria-hidden className="text-lg">✨</span>}
                </button>
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={busy}
                    className="inline-flex items-center gap-2 min-h-14 px-7 rounded-full border border-neutral-300 font-semibold hover:border-neutral-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {generating && <Spinner size="sm" />}
                    {generating ? "Generating…" : "Quick plan"}
                </button>
                <button
                    type="button"
                    onClick={onBuildEmpty}
                    disabled={busy}
                    className="inline-flex items-center gap-2 min-h-14 px-7 rounded-full border border-neutral-300 font-semibold hover:border-neutral-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {creatingEmpty && <Spinner size="sm" />}
                    {creatingEmpty ? "Starting…" : "Build from scratch"}
                </button>
            </div>

            {error && <ErrorBox message={error} />}
        </div>
    )
}

function ErrorBox({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
            {message}
        </div>
    )
}

export default PlanView
