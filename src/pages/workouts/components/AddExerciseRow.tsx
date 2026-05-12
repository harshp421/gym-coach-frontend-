import { useEffect, useRef, useState } from "react"
import { exercisesApi } from "../../../lib/endpoints/exercises"
import {
    detectSessionInProgress,
    planEditApi,
    type PlanResponse,
} from "../../../lib/endpoints/plan-edit"
import type { Exercise, ExerciseLevel } from "../../../schemas/workout"
import Spinner from "../../../components/ui/Spinner"

type Props = {
    dayId: string
    /** Cap suggestions at the user's level so beginners don't see advanced lifts. */
    levelCap?: ExerciseLevel
    onAfterMutation: (response: PlanResponse) => void
    onConflict: (sessionId: string) => void
    disabled?: boolean
}

type FormState = {
    sets: string
    repsMin: string
    repsMax: string
    rpe: string
    rest: string
    notes: string
}

const DEFAULTS: FormState = {
    sets: "3",
    repsMin: "8",
    repsMax: "12",
    rpe: "",
    rest: "",
    notes: "",
}

/**
 * Inline "add exercise" UI — replaces the modal-based add flow. User
 * types into the search box, gets a live filtered dropdown, picks an
 * exercise, dials in sets/reps/RPE/rest, and submits in one shot.
 */
function AddExerciseRow({
    dayId,
    levelCap,
    onAfterMutation,
    onConflict,
    disabled,
}: Props) {
    const [open, setOpen] = useState(false)

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full border border-neutral-300 text-sm font-semibold hover:border-neutral-900 transition-colors disabled:opacity-50"
            >
                + Add exercise
            </button>
        )
    }

    return (
        <AddForm
            dayId={dayId}
            levelCap={levelCap}
            onAfterMutation={onAfterMutation}
            onConflict={onConflict}
            onClose={() => setOpen(false)}
            disabled={disabled}
        />
    )
}

function AddForm({
    dayId,
    levelCap,
    onAfterMutation,
    onConflict,
    onClose,
    disabled,
}: {
    dayId: string
    levelCap?: ExerciseLevel
    onAfterMutation: (r: PlanResponse) => void
    onConflict: (sessionId: string) => void
    onClose: () => void
    disabled?: boolean
}) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<Exercise[]>([])
    const [searching, setSearching] = useState(false)
    const [selected, setSelected] = useState<Exercise | null>(null)
    const [form, setForm] = useState<FormState>(DEFAULTS)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const reqId = useRef(0)

    // Debounced search. Hits the merged endpoint (system + user-owned via
    // `source=all` default), capped at the user's level when supplied.
    useEffect(() => {
        const id = ++reqId.current
        const trimmed = query.trim()
        setSearching(true)
        const t = window.setTimeout(async () => {
            try {
                const res = await exercisesApi.list({
                    q: trimmed || undefined,
                    level: levelCap,
                    limit: 30,
                })
                if (id === reqId.current) setResults(res.items)
            } catch {
                if (id === reqId.current) setResults([])
            } finally {
                if (id === reqId.current) setSearching(false)
            }
        }, 200)
        return () => window.clearTimeout(t)
    }, [query, levelCap])

    const handlePick = (ex: Exercise) => {
        setSelected(ex)
        setQuery(ex.name)
        // Sensible default rest by mechanic, only on first pick (don't
        // overwrite if the user has already tweaked it).
        if (form.rest === "") {
            const rest =
                ex.mechanic === "compound"
                    ? "120"
                    : ex.mechanic === "isolation"
                      ? "75"
                      : ""
            setForm((f) => ({ ...f, rest }))
        }
    }

    const handleClear = () => {
        setSelected(null)
        setForm(DEFAULTS)
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selected) {
            setError("Pick an exercise first")
            return
        }

        const sets = Number.parseInt(form.sets, 10)
        const repsMin = Number.parseInt(form.repsMin, 10)
        const repsMax = Number.parseInt(form.repsMax, 10)
        if (!Number.isFinite(sets) || sets < 1 || sets > 20) {
            setError("Sets must be 1–20")
            return
        }
        if (!Number.isFinite(repsMin) || repsMin < 1) {
            setError("Reps min must be at least 1")
            return
        }
        if (!Number.isFinite(repsMax) || repsMax < repsMin) {
            setError("Reps max must be ≥ reps min")
            return
        }

        let rpe: number | null = null
        if (form.rpe.trim() !== "") {
            const n = Number.parseFloat(form.rpe)
            if (!Number.isFinite(n) || n < 1 || n > 10) {
                setError("RPE must be 1–10")
                return
            }
            rpe = n
        }

        let rest: number | null = null
        if (form.rest.trim() !== "") {
            const n = Number.parseInt(form.rest, 10)
            if (!Number.isFinite(n) || n < 0 || n > 900) {
                setError("Rest must be 0–900s")
                return
            }
            rest = n
        }

        setError(null)
        setSubmitting(true)
        try {
            const body = {
                ...(selected.origin === "user"
                    ? { userExerciseId: selected.id }
                    : { exerciseId: selected.id }),
                targetSets: sets,
                targetRepsMin: repsMin,
                targetRepsMax: repsMax,
                targetRpe: rpe,
                restSeconds: rest,
                notes: form.notes.trim() || null,
            }
            const res = await planEditApi.createExercise(dayId, body)
            onAfterMutation(res)
            onClose()
        } catch (err) {
            const conflict = detectSessionInProgress(err)
            if (conflict) {
                onConflict(conflict.sessionId)
                return
            }
            setError(err instanceof Error ? err.message : "Couldn't add")
        } finally {
            setSubmitting(false)
        }
    }

    // Show dropdown when there's a query OR no selection yet, but not
    // when the user has just picked something.
    const showDropdown = !selected || query !== selected.name

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-2xl border border-neutral-200 bg-stone-50 p-4 flex flex-col gap-3"
        >
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Add exercise
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="size-7 inline-flex items-center justify-center rounded-full hover:bg-neutral-200 text-neutral-500"
                >
                    ×
                </button>
            </div>

            <div className="relative">
                <input
                    type="search"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        if (selected) setSelected(null)
                    }}
                    placeholder="Search exercises…"
                    autoFocus
                    disabled={disabled || submitting}
                    className="w-full min-h-12 px-4 pr-10 text-base rounded-xl bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors disabled:opacity-50"
                />
                {selected ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Clear selection"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 inline-flex items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-50"
                    >
                        ✓
                    </button>
                ) : (
                    searching && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                            <Spinner size="sm" />
                        </span>
                    )
                )}

                {showDropdown && (
                    <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
                        {results.length === 0 && !searching && (
                            <div className="px-4 py-3 text-sm text-neutral-500">
                                {query.trim()
                                    ? "No matches. Try a different word."
                                    : "Start typing to search."}
                            </div>
                        )}
                        <ul className="divide-y divide-neutral-100">
                            {results.map((ex) => (
                                <li key={ex.id}>
                                    <button
                                        type="button"
                                        onClick={() => handlePick(ex)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 transition-colors"
                                    >
                                        <div className="flex items-baseline justify-between gap-3">
                                            <div className="font-semibold flex items-center gap-2 min-w-0">
                                                <span className="truncate">
                                                    {ex.name}
                                                </span>
                                                {ex.origin === "user" && (
                                                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full bg-neutral-900 text-white text-[9px] font-bold tracking-normal uppercase">
                                                        yours
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 shrink-0">
                                                {ex.equipment ?? "—"}
                                            </span>
                                        </div>
                                        <div className="mt-0.5 text-xs text-neutral-500">
                                            {ex.primaryMuscles.join(", ") || "—"}
                                            {ex.mechanic ? ` · ${ex.mechanic}` : ""} ·{" "}
                                            {ex.level}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {selected && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <NumField
                            label="Sets"
                            value={form.sets}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, sets: v }))
                            }
                            min={1}
                            max={20}
                            disabled={submitting}
                        />
                        <RangeField
                            label="Reps"
                            min={form.repsMin}
                            max={form.repsMax}
                            onMin={(v) =>
                                setForm((f) => ({ ...f, repsMin: v }))
                            }
                            onMax={(v) =>
                                setForm((f) => ({ ...f, repsMax: v }))
                            }
                            disabled={submitting}
                        />
                        <NumField
                            label="RPE"
                            value={form.rpe}
                            onChange={(v) => setForm((f) => ({ ...f, rpe: v }))}
                            placeholder="—"
                            step="0.5"
                            min={1}
                            max={10}
                            disabled={submitting}
                        />
                        <NumField
                            label="Rest (s)"
                            value={form.rest}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, rest: v }))
                            }
                            placeholder="—"
                            min={0}
                            max={900}
                            disabled={submitting}
                        />
                    </div>

                    <label className="text-xs font-medium text-neutral-500">
                        Notes
                        <input
                            type="text"
                            value={form.notes}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, notes: e.target.value }))
                            }
                            placeholder="Optional cue"
                            disabled={submitting}
                            className="mt-1 block w-full min-h-11 px-3 text-sm rounded-lg bg-white border border-neutral-200 focus:border-neutral-900 outline-none disabled:opacity-50"
                        />
                    </label>
                </>
            )}

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                    {error}
                </div>
            )}

            <div className="flex justify-end items-center gap-3 pt-1">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!selected || submitting || disabled}
                    className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {submitting && <Spinner size="sm" />}
                    {submitting ? "Adding…" : "Add to day"}
                </button>
            </div>
        </form>
    )
}

function NumField({
    label,
    value,
    onChange,
    placeholder,
    step,
    min,
    max,
    disabled,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    step?: string
    min?: number
    max?: number
    disabled?: boolean
}) {
    return (
        <label className="text-xs font-medium text-neutral-500">
            {label}
            <input
                type="number"
                inputMode="decimal"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                step={step}
                min={min}
                max={max}
                disabled={disabled}
                className="mt-1 block w-full min-h-11 px-3 text-base text-right rounded-lg bg-white border border-neutral-200 focus:border-neutral-900 outline-none tabular-nums disabled:opacity-50"
            />
        </label>
    )
}

function RangeField({
    label,
    min,
    max,
    onMin,
    onMax,
    disabled,
}: {
    label: string
    min: string
    max: string
    onMin: (v: string) => void
    onMax: (v: string) => void
    disabled?: boolean
}) {
    return (
        <div className="text-xs font-medium text-neutral-500">
            {label}
            <div className="mt-1 flex items-center gap-1">
                <input
                    type="number"
                    inputMode="numeric"
                    value={min}
                    onChange={(e) => onMin(e.target.value)}
                    min={1}
                    aria-label="Min reps"
                    disabled={disabled}
                    className="w-full min-h-11 px-2 text-base text-right rounded-lg bg-white border border-neutral-200 focus:border-neutral-900 outline-none tabular-nums disabled:opacity-50"
                />
                <span className="text-neutral-300">–</span>
                <input
                    type="number"
                    inputMode="numeric"
                    value={max}
                    onChange={(e) => onMax(e.target.value)}
                    min={1}
                    aria-label="Max reps"
                    disabled={disabled}
                    className="w-full min-h-11 px-2 text-base text-right rounded-lg bg-white border border-neutral-200 focus:border-neutral-900 outline-none tabular-nums disabled:opacity-50"
                />
            </div>
        </div>
    )
}

export default AddExerciseRow
