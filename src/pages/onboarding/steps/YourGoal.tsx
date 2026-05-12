import { useState } from "react"
import { z } from "zod"
import {
    ACTIVITY,
    GOAL,
    type ActivityLevel,
    type Goal,
} from "../../../schemas/profile"
import type { WizardState } from "../Onboarding"
import { kgToLb, lbToKg } from "../units"

const stepSchema = z.object({
    goal: z.enum(GOAL, { message: "Pick a goal" }),
    activityLevel: z.enum(ACTIVITY, { message: "Pick an activity level" }),
    targetWeightKg: z.number().positive().optional(),
})

type Props = {
    values: WizardState
    onChange: (patch: Partial<WizardState>) => void
    onNext: () => void
    onBack: () => void
}

const GOAL_INFO: Record<Goal, { label: string; tag: string }> = {
    cut: { label: "Cut", tag: "Lose fat" },
    maintain: { label: "Maintain", tag: "Hold the line" },
    bulk: { label: "Bulk", tag: "Add muscle" },
    recomp: { label: "Recomp", tag: "Both, slowly" },
}

const ACTIVITY_INFO: Record<ActivityLevel, { label: string; desc: string }> = {
    sedentary: { label: "Sedentary", desc: "Desk job, little exercise" },
    light: { label: "Light", desc: "Light exercise 1–3 days/week" },
    moderate: { label: "Moderate", desc: "Moderate exercise 3–5 days/week" },
    active: { label: "Active", desc: "Hard exercise 6–7 days/week" },
    very_active: {
        label: "Very active",
        desc: "Hard exercise + physical job",
    },
}

function YourGoal({ values, onChange, onNext, onBack }: Props) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const result = stepSchema.safeParse({
            goal: values.goal,
            activityLevel: values.activityLevel,
            targetWeightKg: values.targetWeightKg ?? undefined,
        })
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
        onNext()
    }

    const showTarget = values.goal === "cut" || values.goal === "bulk"
    const isImperial = values.units === "imperial"
    const targetDisplay =
        values.targetWeightKg === null
            ? null
            : isImperial
              ? kgToLb(values.targetWeightKg)
              : values.targetWeightKg

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-8">
            <header>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Your goal
                </span>
                <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                    What are we aiming at?
                </h1>
            </header>

            <Field label="Goal" error={errors.goal}>
                <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(GOAL_INFO) as Goal[]).map((g) => (
                        <ChoiceCard
                            key={g}
                            selected={values.goal === g}
                            onClick={() => onChange({ goal: g })}
                            title={GOAL_INFO[g].label}
                            sub={GOAL_INFO[g].tag}
                        />
                    ))}
                </div>
            </Field>

            {showTarget && (
                <Field
                    label={
                        isImperial
                            ? "Target weight (lb, optional)"
                            : "Target weight (kg, optional)"
                    }
                    hint="Aspirational — change it any time."
                >
                    <input
                        type="number"
                        inputMode="decimal"
                        value={targetDisplay === null ? "" : targetDisplay}
                        onChange={(e) => {
                            const v = e.target.value
                            const num = v === "" ? null : Number(v)
                            onChange({
                                targetWeightKg:
                                    num === null
                                        ? null
                                        : isImperial
                                          ? lbToKg(num)
                                          : num,
                            })
                        }}
                        placeholder={isImperial ? "e.g. 155" : "e.g. 70"}
                        step={0.1}
                        min={0}
                        className="w-full min-h-12 px-4 text-base rounded-xl bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors"
                    />
                </Field>
            )}

            <Field label="Activity level" error={errors.activityLevel}>
                <div className="grid grid-cols-1 gap-2">
                    {(Object.keys(ACTIVITY_INFO) as ActivityLevel[]).map((a) => (
                        <button
                            key={a}
                            type="button"
                            onClick={() => onChange({ activityLevel: a })}
                            className={`text-left min-h-14 px-5 py-3 rounded-xl border transition-colors ${
                                values.activityLevel === a
                                    ? "bg-neutral-900 text-white border-neutral-900"
                                    : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
                            }`}
                        >
                            <div className="text-sm font-semibold">
                                {ACTIVITY_INFO[a].label}
                            </div>
                            <div
                                className={`text-xs ${
                                    values.activityLevel === a
                                        ? "text-neutral-300"
                                        : "text-neutral-500"
                                }`}
                            >
                                {ACTIVITY_INFO[a].desc}
                            </div>
                        </button>
                    ))}
                </div>
            </Field>

            <Footer onBack={onBack} primaryLabel="Continue" />
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

function ChoiceCard({
    selected,
    onClick,
    title,
    sub,
}: {
    selected: boolean
    onClick: () => void
    title: string
    sub: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-left rounded-2xl border p-4 transition-colors ${
                selected
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
            }`}
        >
            <div className="text-base font-semibold">{title}</div>
            <div
                className={`mt-1 text-xs ${
                    selected ? "text-neutral-300" : "text-neutral-500"
                }`}
            >
                {sub}
            </div>
        </button>
    )
}

function Footer({
    onBack,
    primaryLabel,
}: {
    onBack: () => void
    primaryLabel: string
}) {
    return (
        <div className="flex justify-between items-center pt-2">
            <button
                type="button"
                onClick={onBack}
                className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
                ← Back
            </button>
            <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 min-h-14 px-7 rounded-full bg-neutral-900 text-white font-semibold active:scale-[0.98] transition-all hover:bg-neutral-800"
            >
                {primaryLabel}
                <span aria-hidden className="text-lg">→</span>
            </button>
        </div>
    )
}

export default YourGoal
