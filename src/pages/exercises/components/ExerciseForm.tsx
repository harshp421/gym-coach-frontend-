import { useState } from "react"
import {
    MUSCLE_PRESETS,
    userExerciseSchema,
    type UserExercise,
    type UserExerciseInput,
} from "../../../schemas/user-exercise"
import { zodErrors } from "../../../schemas/auth"
import Spinner from "../../../components/ui/Spinner"

type Props = {
    initial?: UserExercise
    submitting: boolean
    onSubmit: (values: UserExerciseInput) => Promise<void>
    onCancel: () => void
    error?: string | null
}

const LEVELS: UserExerciseInput["level"][] = [
    "beginner",
    "intermediate",
    "advanced",
]

function ExerciseForm({ initial, submitting, onSubmit, onCancel, error }: Props) {
    const [name, setName] = useState(initial?.name ?? "")
    const [primaryMuscles, setPrimaryMuscles] = useState<string[]>(
        initial?.primaryMuscles ?? [],
    )
    const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>(
        initial?.secondaryMuscles ?? [],
    )
    const [equipment, setEquipment] = useState(initial?.equipment ?? "")
    const [mechanic, setMechanic] = useState<"compound" | "isolation" | "">(
        initial?.mechanic ?? "",
    )
    const [level, setLevel] = useState<UserExerciseInput["level"]>(
        initial?.level ?? "beginner",
    )
    const [demoUrl, setDemoUrl] = useState(initial?.demoUrl ?? "")
    const [instructionsText, setInstructionsText] = useState(
        initial?.instructions.join("\n\n") ?? "",
    )

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const instructions = instructionsText
            .split(/\n\s*\n/)
            .map((s) => s.trim())
            .filter(Boolean)

        const candidate: UserExerciseInput = {
            name: name.trim(),
            primaryMuscles,
            secondaryMuscles,
            equipment: equipment.trim() ? equipment.trim() : undefined,
            mechanic: mechanic === "" ? null : mechanic,
            level,
            instructions,
            demoUrl: demoUrl.trim() === "" ? null : demoUrl.trim(),
        }

        const result = userExerciseSchema.safeParse(candidate)
        if (!result.success) {
            setFieldErrors(zodErrors(result.error))
            return
        }
        setFieldErrors({})
        await onSubmit(result.data)
    }

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <Field label="Name" error={fieldErrors.name}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Heavy Cable Decline Fly"
                    disabled={submitting}
                    className="w-full min-h-12 px-4 text-base rounded-xl bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors disabled:opacity-50"
                />
            </Field>

            <Field
                label="Primary muscles"
                hint="Pick 1–5"
                error={fieldErrors.primaryMuscles}
            >
                <ChipPicker
                    values={primaryMuscles}
                    onChange={setPrimaryMuscles}
                    presets={MUSCLE_PRESETS as unknown as string[]}
                    disabled={submitting}
                    placeholder="chest"
                />
            </Field>

            <Field
                label="Secondary muscles"
                hint="Optional"
                error={fieldErrors.secondaryMuscles}
            >
                <ChipPicker
                    values={secondaryMuscles}
                    onChange={setSecondaryMuscles}
                    presets={MUSCLE_PRESETS as unknown as string[]}
                    disabled={submitting}
                    placeholder="triceps"
                />
            </Field>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Equipment" error={fieldErrors.equipment}>
                    <input
                        type="text"
                        value={equipment}
                        onChange={(e) => setEquipment(e.target.value)}
                        placeholder="dumbbell"
                        disabled={submitting}
                        className="w-full min-h-11 px-3 text-base rounded-lg bg-white border border-neutral-300 focus:border-neutral-900 outline-none disabled:opacity-50"
                    />
                </Field>

                <Field label="Mechanic" error={fieldErrors.mechanic}>
                    <select
                        value={mechanic}
                        onChange={(e) =>
                            setMechanic(e.target.value as typeof mechanic)
                        }
                        disabled={submitting}
                        className="w-full min-h-11 px-3 text-base rounded-lg bg-white border border-neutral-300 focus:border-neutral-900 outline-none disabled:opacity-50"
                    >
                        <option value="">—</option>
                        <option value="compound">Compound</option>
                        <option value="isolation">Isolation</option>
                    </select>
                </Field>

                <Field label="Level" error={fieldErrors.level}>
                    <select
                        value={level}
                        onChange={(e) =>
                            setLevel(e.target.value as UserExerciseInput["level"])
                        }
                        disabled={submitting}
                        className="w-full min-h-11 px-3 text-base rounded-lg bg-white border border-neutral-300 focus:border-neutral-900 outline-none disabled:opacity-50 capitalize"
                    >
                        {LEVELS.map((l) => (
                            <option key={l} value={l}>
                                {l}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <Field label="Demo URL" hint="Optional" error={fieldErrors.demoUrl}>
                <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://youtube.com/…"
                    disabled={submitting}
                    className="w-full min-h-11 px-3 text-base rounded-lg bg-white border border-neutral-300 focus:border-neutral-900 outline-none disabled:opacity-50"
                />
            </Field>

            <Field
                label="Instructions"
                hint="Blank line between steps. Optional."
                error={fieldErrors.instructions}
            >
                <textarea
                    value={instructionsText}
                    onChange={(e) => setInstructionsText(e.target.value)}
                    rows={5}
                    placeholder={"Set up on the high pulley.\n\nKeep elbows soft, drive through chest."}
                    disabled={submitting}
                    className="w-full px-4 py-3 text-base rounded-xl bg-white border border-neutral-300 focus:border-neutral-900 outline-none resize-none disabled:opacity-50"
                />
            </Field>

            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            <div className="flex justify-end items-center gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                >
                    {submitting && <Spinner size="sm" />}
                    {submitting ? "Saving…" : initial ? "Save changes" : "Create"}
                </button>
            </div>
        </form>
    )
}

function Field({
    label,
    hint,
    error,
    children,
}: {
    label: string
    hint?: string
    error?: string
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-700">{label}</label>
            {children}
            {error ? (
                <span className="text-xs text-red-600">{error}</span>
            ) : hint ? (
                <span className="text-xs text-neutral-500">{hint}</span>
            ) : null}
        </div>
    )
}

function ChipPicker({
    values,
    onChange,
    presets,
    placeholder,
    disabled,
}: {
    values: string[]
    onChange: (next: string[]) => void
    presets: string[]
    placeholder: string
    disabled?: boolean
}) {
    const [draft, setDraft] = useState("")

    const add = (raw: string) => {
        const v = raw.trim().toLowerCase()
        if (!v || values.includes(v)) {
            setDraft("")
            return
        }
        onChange([...values, v])
        setDraft("")
    }

    const remove = (v: string) => onChange(values.filter((x) => x !== v))
    const remainingPresets = presets.filter((p) => !values.includes(p))

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 min-h-12 rounded-xl bg-white border border-neutral-300 focus-within:border-neutral-900 px-3 py-2 transition-colors">
                {values.map((v) => (
                    <span
                        key={v}
                        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-neutral-900 text-white text-xs font-medium"
                    >
                        {v}
                        <button
                            type="button"
                            onClick={() => remove(v)}
                            aria-label={`Remove ${v}`}
                            disabled={disabled}
                            className="size-5 inline-flex items-center justify-center rounded-full hover:bg-neutral-700"
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault()
                            add(draft)
                        } else if (e.key === "Backspace" && !draft && values.length) {
                            onChange(values.slice(0, -1))
                        }
                    }}
                    onBlur={() => draft && add(draft)}
                    placeholder={values.length === 0 ? placeholder : ""}
                    disabled={disabled}
                    className="flex-1 min-w-[6rem] bg-transparent text-base outline-none disabled:opacity-50"
                />
            </div>
            {remainingPresets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {remainingPresets.slice(0, 8).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => add(p)}
                            disabled={disabled}
                            className="text-xs px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors disabled:opacity-50"
                        >
                            + {p}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ExerciseForm
