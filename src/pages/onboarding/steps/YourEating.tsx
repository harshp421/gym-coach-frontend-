import { useState } from "react"
import { z } from "zod"
import { DIET, type DietType } from "../../../schemas/profile"
import type { WizardState } from "../Onboarding"

const stepSchema = z.object({
    dietType: z.enum(DIET, { message: "Pick your eating style" }),
})

type Props = {
    values: WizardState
    onChange: (patch: Partial<WizardState>) => void
    onSubmit: () => void
    onBack: () => void
    submitting: boolean
    submitError: string | null
}

const DIET_INFO: Record<DietType, { label: string; tag: string }> = {
    omnivore: { label: "Omnivore", tag: "Anything goes" },
    vegetarian: { label: "Vegetarian", tag: "No meat" },
    vegan: { label: "Vegan", tag: "Plant only" },
    keto: { label: "Keto", tag: "Low carb" },
    paleo: { label: "Paleo", tag: "Whole foods" },
    other: { label: "Other", tag: "I'll tell the coach" },
}

const COMMON_ALLERGIES = ["nuts", "dairy", "gluten", "shellfish", "eggs"]

function YourEating({
    values,
    onChange,
    onSubmit,
    onBack,
    submitting,
    submitError,
}: Props) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const result = stepSchema.safeParse({ dietType: values.dietType })
        if (!result.success) {
            const out: Record<string, string> = {}
            for (const issue of result.error.issues) {
                const k = String(issue.path[0])
                if (!out[k]) out[k] = issue.message
            }
            setErrors(out)
            return
        }
        setErrors({})
        onSubmit()
    }

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-8">
            <header>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Your eating
                </span>
                <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                    How do you eat?
                </h1>
            </header>

            <Field label="Diet type" error={errors.dietType}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(Object.keys(DIET_INFO) as DietType[]).map((d) => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => onChange({ dietType: d })}
                            className={`text-left rounded-2xl border p-4 transition-colors ${
                                values.dietType === d
                                    ? "bg-neutral-900 text-white border-neutral-900"
                                    : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
                            }`}
                        >
                            <div className="text-base font-semibold">
                                {DIET_INFO[d].label}
                            </div>
                            <div
                                className={`mt-1 text-xs ${
                                    values.dietType === d
                                        ? "text-neutral-300"
                                        : "text-neutral-500"
                                }`}
                            >
                                {DIET_INFO[d].tag}
                            </div>
                        </button>
                    ))}
                </div>
            </Field>

            <Field
                label="Allergies"
                hint="Add anything we should never include."
            >
                <PillInput
                    values={values.allergies}
                    presets={COMMON_ALLERGIES}
                    placeholder="Type and press Enter"
                    onChange={(allergies) => onChange({ allergies })}
                />
            </Field>

            <Field
                label="Dislikes"
                hint="Foods you'd rather not see."
            >
                <PillInput
                    values={values.dislikes}
                    presets={[]}
                    placeholder="e.g. mushrooms, liver"
                    onChange={(dislikes) => onChange({ dislikes })}
                />
            </Field>

            {submitError && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    {submitError}
                </div>
            )}

            <div className="flex justify-between items-center pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={submitting}
                    className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors disabled:opacity-50"
                >
                    ← Back
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 min-h-14 px-7 rounded-full bg-neutral-900 text-white font-semibold active:scale-[0.98] transition-all hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting ? "Building your plan…" : "Build my plan"}
                    {!submitting && <span aria-hidden className="text-lg">→</span>}
                </button>
            </div>
        </form>
    )
}

function PillInput({
    values,
    presets,
    placeholder,
    onChange,
}: {
    values: string[]
    presets: string[]
    placeholder: string
    onChange: (next: string[]) => void
}) {
    const [draft, setDraft] = useState("")

    const add = (raw: string) => {
        const v = raw.trim().toLowerCase()
        if (!v) return
        if (values.includes(v)) {
            setDraft("")
            return
        }
        onChange([...values, v])
        setDraft("")
    }

    const remove = (v: string) => onChange(values.filter((x) => x !== v))

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            add(draft)
        } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1))
        }
    }

    const remainingPresets = presets.filter((p) => !values.includes(p))

    return (
        <div className="flex flex-col gap-3">
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
                            className="size-5 inline-flex items-center justify-center rounded-full hover:bg-neutral-700 transition-colors"
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKey}
                    onBlur={() => draft && add(draft)}
                    placeholder={values.length === 0 ? placeholder : ""}
                    className="flex-1 min-w-[8rem] bg-transparent text-base outline-none"
                />
            </div>

            {remainingPresets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {remainingPresets.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => add(p)}
                            className="text-xs px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                        >
                            + {p}
                        </button>
                    ))}
                </div>
            )}
        </div>
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
        <div className="flex flex-col gap-3">
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

export default YourEating
