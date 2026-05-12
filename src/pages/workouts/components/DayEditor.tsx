import { useEffect, useState } from "react"
import type {
    ExerciseLevel,
    PlanDay,
    PlanExercise,
} from "../../../schemas/workout"
import {
    detectSessionInProgress,
    isExerciseHasLogs,
    planEditApi,
    type PlanResponse,
} from "../../../lib/endpoints/plan-edit"
import { WEEKDAY_LONG } from "../weekday"
import { confirm } from "../../../stores/confirmStore"
import Reorderable from "./Reorderable"
import ExerciseEditor from "./ExerciseEditor"
import AddExerciseRow from "./AddExerciseRow"
import Spinner from "../../../components/ui/Spinner"

type Props = {
    day: PlanDay
    canMoveUp: boolean
    canMoveDown: boolean
    onMoveUp: () => void
    onMoveDown: () => void
    onAfterMutation: (response: PlanResponse) => void
    onConflict: (sessionId: string) => void
    /** Tells PlanView to open the ExercisePicker scoped to a swap target. */
    onSwapExercise: (pe: PlanExercise) => void
    /** Cap exercise suggestions at the user's level. */
    levelCap?: ExerciseLevel
    disabled?: boolean
}

function DayEditor({
    day,
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    onAfterMutation,
    onConflict,
    onSwapExercise,
    levelCap,
    disabled,
}: Props) {
    const [name, setName] = useState(day.name)
    const [weekdayHint, setWeekdayHint] = useState<number | null>(
        day.weekdayHint,
    )
    const [savingMeta, setSavingMeta] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [reordering, setReordering] = useState(false)

    useEffect(() => {
        setName(day.name)
        setWeekdayHint(day.weekdayHint)
    }, [day.id, day.name, day.weekdayHint])

    const metaDirty =
        name.trim() !== day.name || weekdayHint !== day.weekdayHint

    const handleSaveMeta = async () => {
        if (!metaDirty) return
        setError(null)
        setSavingMeta(true)
        try {
            const trimmed = name.trim()
            if (!trimmed) {
                setError("Name can't be empty")
                return
            }
            const res = await planEditApi.updateDay(day.id, {
                name: trimmed !== day.name ? trimmed : undefined,
                weekdayHint:
                    weekdayHint !== day.weekdayHint ? weekdayHint : undefined,
            })
            onAfterMutation(res)
        } catch (err) {
            const conflict = detectSessionInProgress(err)
            if (conflict) {
                onConflict(conflict.sessionId)
                return
            }
            setError(err instanceof Error ? err.message : "Couldn't save")
        } finally {
            setSavingMeta(false)
        }
    }

    const handleDeleteDay = async () => {
        const ok = await confirm({
            title: `Delete "${day.name}"?`,
            body: "Its exercises will be removed too. Logged sessions stay in your history.",
            confirmLabel: "Delete day",
            destructive: true,
        })
        if (!ok) return
        setError(null)
        setDeleting(true)
        try {
            const res = await planEditApi.deleteDay(day.id)
            onAfterMutation(res)
        } catch (err) {
            const conflict = detectSessionInProgress(err)
            if (conflict) {
                onConflict(conflict.sessionId)
                return
            }
            if (isExerciseHasLogs(err)) {
                setError(
                    "One of these exercises has logged sets — remove it manually first.",
                )
                return
            }
            setError(err instanceof Error ? err.message : "Couldn't delete day")
        } finally {
            setDeleting(false)
        }
    }

    const reorderExerciseTo = async (peId: string, newPosition: number) => {
        if (newPosition < 0 || newPosition >= day.exercises.length) return
        const ordered = [...day.exercises].sort((a, b) => a.position - b.position)
        const fromIndex = ordered.findIndex((e) => e.id === peId)
        if (fromIndex === -1 || fromIndex === newPosition) return

        const moved = ordered.splice(fromIndex, 1)[0]!
        ordered.splice(newPosition, 0, moved)

        setReordering(true)
        setError(null)
        try {
            const body = ordered.map((e, i) => ({
                planExerciseId: e.id,
                position: i,
            }))
            const res = await planEditApi.reorderExercises(day.id, body)
            onAfterMutation(res)
        } catch (err) {
            const conflict = detectSessionInProgress(err)
            if (conflict) {
                onConflict(conflict.sessionId)
                return
            }
            setError(err instanceof Error ? err.message : "Reorder failed")
        } finally {
            setReordering(false)
        }
    }

    const sortedExercises = [...day.exercises].sort(
        (a, b) => a.position - b.position,
    )

    return (
        <article className="rounded-2xl bg-white border border-neutral-200 p-5">
            <header className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                        Day {day.dayIndex + 1}
                    </span>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Day name"
                        disabled={disabled || savingMeta || deleting}
                        className="mt-1 block w-full text-2xl font-black tracking-tight bg-transparent border-b border-transparent focus:border-neutral-900 outline-none px-0 disabled:opacity-50"
                    />
                </div>
                <Reorderable
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    disabled={disabled || savingMeta || deleting}
                    label="day"
                />
            </header>

            <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-xs font-medium text-neutral-500 inline-flex items-center gap-2">
                    Weekday
                    <select
                        value={weekdayHint === null ? "" : String(weekdayHint)}
                        onChange={(e) =>
                            setWeekdayHint(
                                e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                            )
                        }
                        disabled={disabled || savingMeta || deleting}
                        className="min-h-9 px-2 rounded-lg bg-stone-50 border border-neutral-200 focus:border-neutral-900 outline-none text-sm disabled:opacity-50"
                    >
                        <option value="">Any day</option>
                        {WEEKDAY_LONG.map((w, i) => (
                            <option key={w} value={i}>
                                {w}
                            </option>
                        ))}
                    </select>
                </label>
                {metaDirty && (
                    <button
                        type="button"
                        onClick={handleSaveMeta}
                        disabled={disabled || savingMeta}
                        className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                    >
                        {savingMeta && <Spinner size="sm" />}
                        {savingMeta ? "Saving…" : "Save"}
                    </button>
                )}
            </div>

            {error && (
                <div
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                    {error}
                </div>
            )}

            <div className="mt-5 flex flex-col gap-3">
                {sortedExercises.length === 0 && (
                    <p className="text-sm text-neutral-500">
                        No exercises yet — add one below.
                    </p>
                )}
                {sortedExercises.map((pe, i) => (
                    <ExerciseEditor
                        key={pe.id}
                        pe={pe}
                        canMoveUp={i > 0}
                        canMoveDown={i < sortedExercises.length - 1}
                        onMoveUp={() => reorderExerciseTo(pe.id, i - 1)}
                        onMoveDown={() => reorderExerciseTo(pe.id, i + 1)}
                        onAfterMutation={onAfterMutation}
                        onConflict={onConflict}
                        onSwapClick={() => onSwapExercise(pe)}
                        disabled={disabled || reordering}
                    />
                ))}
            </div>

            <div className="mt-5">
                <AddExerciseRow
                    dayId={day.id}
                    levelCap={levelCap}
                    onAfterMutation={onAfterMutation}
                    onConflict={onConflict}
                    disabled={disabled || savingMeta || deleting}
                />
            </div>

            <div className="mt-5 flex justify-end">
                <button
                    type="button"
                    onClick={handleDeleteDay}
                    disabled={disabled || savingMeta || deleting}
                    className="text-xs text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                    {deleting ? "Deleting…" : "Delete day"}
                </button>
            </div>
        </article>
    )
}

export default DayEditor
