import { useState } from "react"
import { z } from "zod"
import {
    EQUIPMENT,
    EXPERIENCE,
    type EquipmentAccess,
    type ExperienceLevel,
} from "../../../schemas/profile"
import type { WizardState } from "../Onboarding"

const stepSchema = z.object({
    experienceLevel: z.enum(EXPERIENCE, { message: "Pick one" }),
    trainingDaysPerWeek: z
        .number({ message: "Pick a training frequency" })
        .int()
        .min(1)
        .max(7),
    equipmentAccess: z.enum(EQUIPMENT, { message: "Pick what you have access to" }),
})

type Props = {
    values: WizardState
    onChange: (patch: Partial<WizardState>) => void
    onNext: () => void
    onBack: () => void
}

const EXPERIENCE_INFO: Record<
    ExperienceLevel,
    { label: string; desc: string }
> = {
    beginner: { label: "Beginner", desc: "New, or under a year" },
    intermediate: { label: "Intermediate", desc: "1–3 years, consistent" },
    advanced: { label: "Advanced", desc: "3+ years, structured" },
}

const EQUIPMENT_INFO: Record<EquipmentAccess, { label: string; desc: string }> = {
    full_gym: { label: "Full gym", desc: "Racks, machines, cables" },
    home_basic: { label: "Home basic", desc: "Bench, barbell, plates" },
    dumbbells_only: { label: "Dumbbells only", desc: "A pair, adjustable" },
    bodyweight: { label: "Bodyweight", desc: "No equipment" },
}

function YourTraining({ values, onChange, onNext, onBack }: Props) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const result = stepSchema.safeParse({
            experienceLevel: values.experienceLevel,
            trainingDaysPerWeek: values.trainingDaysPerWeek,
            equipmentAccess: values.equipmentAccess,
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

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-8">
            <header>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Your training
                </span>
                <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                    How do you train?
                </h1>
            </header>

            <Field label="Experience" error={errors.experienceLevel}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.keys(EXPERIENCE_INFO) as ExperienceLevel[]).map(
                        (e) => (
                            <button
                                key={e}
                                type="button"
                                onClick={() => onChange({ experienceLevel: e })}
                                className={`text-left rounded-2xl border p-4 transition-colors ${
                                    values.experienceLevel === e
                                        ? "bg-neutral-900 text-white border-neutral-900"
                                        : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
                                }`}
                            >
                                <div className="text-base font-semibold">
                                    {EXPERIENCE_INFO[e].label}
                                </div>
                                <div
                                    className={`mt-1 text-xs ${
                                        values.experienceLevel === e
                                            ? "text-neutral-300"
                                            : "text-neutral-500"
                                    }`}
                                >
                                    {EXPERIENCE_INFO[e].desc}
                                </div>
                            </button>
                        ),
                    )}
                </div>
            </Field>

            <Field
                label="Training days per week"
                error={errors.trainingDaysPerWeek}
            >
                <div className="grid grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => onChange({ trainingDaysPerWeek: n })}
                            className={`min-h-12 rounded-xl border text-base font-semibold tabular-nums transition-colors ${
                                values.trainingDaysPerWeek === n
                                    ? "bg-neutral-900 text-white border-neutral-900"
                                    : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
                            }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </Field>

            <Field label="Equipment access" error={errors.equipmentAccess}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(EQUIPMENT_INFO) as EquipmentAccess[]).map(
                        (k) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => onChange({ equipmentAccess: k })}
                                className={`text-left rounded-2xl border p-4 transition-colors ${
                                    values.equipmentAccess === k
                                        ? "bg-neutral-900 text-white border-neutral-900"
                                        : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
                                }`}
                            >
                                <div className="text-base font-semibold">
                                    {EQUIPMENT_INFO[k].label}
                                </div>
                                <div
                                    className={`mt-1 text-xs ${
                                        values.equipmentAccess === k
                                            ? "text-neutral-300"
                                            : "text-neutral-500"
                                    }`}
                                >
                                    {EQUIPMENT_INFO[k].desc}
                                </div>
                            </button>
                        ),
                    )}
                </div>
            </Field>

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
                    Continue
                    <span aria-hidden className="text-lg">→</span>
                </button>
            </div>
        </form>
    )
}

function Field({
    label,
    error,
    children,
}: {
    label: string
    error?: string
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-neutral-700">{label}</label>
            {children}
            {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
    )
}

export default YourTraining
