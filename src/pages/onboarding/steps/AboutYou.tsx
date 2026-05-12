import { useState } from "react"
import { z } from "zod"
import { SEX, type Sex } from "../../../schemas/profile"
import type { WizardState } from "../Onboarding"
import { cmToFeetIn, feetInToCm, kgToLb, lbToKg } from "../units"

const stepSchema = z.object({
    dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick your date of birth"),
    sex: z.enum(SEX, { message: "Pick one" }),
    heightCm: z
        .number({ message: "Enter your height" })
        .positive("Must be positive")
        .max(272, "Too tall"),
    initialWeightKg: z
        .number({ message: "Enter your weight" })
        .positive("Must be positive")
        .max(635, "Too heavy"),
})

type Props = {
    values: WizardState
    onChange: (patch: Partial<WizardState>) => void
    onNext: () => void
}

const SEX_LABEL: Record<Sex, string> = {
    male: "Male",
    female: "Female",
    other: "Other",
}

function AboutYou({ values, onChange, onNext }: Props) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const result = stepSchema.safeParse(values)
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

    const isImperial = values.units === "imperial"
    const ft = values.heightCm ? cmToFeetIn(values.heightCm) : null
    const lb = values.initialWeightKg ? kgToLb(values.initialWeightKg) : null

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-8">
            <header>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    About you
                </span>
                <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                    Let's get the basics.
                </h1>
                <p className="mt-3 text-neutral-500">
                    A few facts so we can size your plan correctly.
                </p>
            </header>

            <UnitsToggle
                units={values.units}
                onChange={(u) => onChange({ units: u })}
            />

            <Field label="Date of birth" error={errors.dateOfBirth}>
                <input
                    type="date"
                    value={values.dateOfBirth}
                    onChange={(e) => onChange({ dateOfBirth: e.target.value })}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full min-h-12 px-4 text-base rounded-xl bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors"
                />
            </Field>

            <Field label="Sex" error={errors.sex}>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(SEX_LABEL) as Sex[]).map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => onChange({ sex: s })}
                            className={`min-h-12 rounded-xl border text-sm font-medium transition-colors ${
                                values.sex === s
                                    ? "bg-neutral-900 text-white border-neutral-900"
                                    : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
                            }`}
                        >
                            {SEX_LABEL[s]}
                        </button>
                    ))}
                </div>
            </Field>

            <Field
                label={isImperial ? "Height (ft / in)" : "Height (cm)"}
                error={errors.heightCm}
            >
                {isImperial ? (
                    <div className="flex gap-3">
                        <NumberInput
                            value={ft?.feet ?? null}
                            placeholder="ft"
                            min={0}
                            max={8}
                            onChange={(feet) =>
                                onChange({
                                    heightCm:
                                        feet === null
                                            ? null
                                            : feetInToCm(feet, ft?.inches ?? 0),
                                })
                            }
                        />
                        <NumberInput
                            value={ft?.inches ?? null}
                            placeholder="in"
                            min={0}
                            max={11.9}
                            step={0.1}
                            onChange={(inches) =>
                                onChange({
                                    heightCm:
                                        inches === null
                                            ? null
                                            : feetInToCm(ft?.feet ?? 0, inches),
                                })
                            }
                        />
                    </div>
                ) : (
                    <NumberInput
                        value={values.heightCm}
                        placeholder="e.g. 178"
                        min={0}
                        max={272}
                        step={0.1}
                        onChange={(heightCm) => onChange({ heightCm })}
                    />
                )}
            </Field>

            <Field
                label={
                    isImperial ? "Current weight (lb)" : "Current weight (kg)"
                }
                hint="We'll log this as your starting point."
                error={errors.initialWeightKg}
            >
                <NumberInput
                    value={isImperial ? lb : values.initialWeightKg}
                    placeholder={isImperial ? "e.g. 165" : "e.g. 75"}
                    min={0}
                    max={isImperial ? 1400 : 635}
                    step={0.1}
                    onChange={(v) =>
                        onChange({
                            initialWeightKg:
                                v === null ? null : isImperial ? lbToKg(v) : v,
                        })
                    }
                />
            </Field>

            <div className="flex justify-end pt-2">
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

function UnitsToggle({
    units,
    onChange,
}: {
    units: "metric" | "imperial"
    onChange: (u: "metric" | "imperial") => void
}) {
    return (
        <div className="inline-flex self-start rounded-full border border-neutral-300 bg-white p-1 text-xs font-medium">
            {(["metric", "imperial"] as const).map((u) => (
                <button
                    key={u}
                    type="button"
                    onClick={() => onChange(u)}
                    className={`px-3 py-1.5 rounded-full transition-colors ${
                        units === u
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-500 hover:text-neutral-900"
                    }`}
                >
                    {u === "metric" ? "cm / kg" : "ft / lb"}
                </button>
            ))}
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

function NumberInput({
    value,
    onChange,
    placeholder,
    min,
    max,
    step,
}: {
    value: number | null
    onChange: (v: number | null) => void
    placeholder?: string
    min?: number
    max?: number
    step?: number
}) {
    return (
        <input
            type="number"
            inputMode="decimal"
            value={value === null ? "" : value}
            onChange={(e) => {
                const v = e.target.value
                onChange(v === "" ? null : Number(v))
            }}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className="w-full min-h-12 px-4 text-base rounded-xl bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors"
        />
    )
}

export default AboutYou
