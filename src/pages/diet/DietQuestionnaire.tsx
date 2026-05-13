import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "../../hooks/useQuery"
import { dietApi } from "../../lib/endpoints/diet"
import {
    ALLOWED_CUISINES,
    completePreferencesSchema,
    type BudgetTier,
    type CompletePreferencesInput,
    type CookingTime,
    type Cuisine,
} from "../../schemas/diet"
import { toast } from "../../stores/toastStore"
import Spinner from "../../components/ui/Spinner"
import BackButton from "../../components/BackButton"

const COOKING_TIME_INFO: Record<
    CookingTime,
    { label: string; desc: string }
> = {
    quick: { label: "Quick", desc: "≤15 min per meal" },
    moderate: { label: "Moderate", desc: "15–30 min" },
    leisurely: { label: "Leisurely", desc: "30+ min, cook properly" },
}

const BUDGET_INFO: Record<BudgetTier, { label: string; desc: string }> = {
    budget: { label: "Budget", desc: "Stick to staples" },
    mid: { label: "Mid", desc: "Everyday groceries" },
    premium: { label: "Premium", desc: "No constraint" },
}

const CUISINE_LABEL: Record<Cuisine, string> = {
    indian: "Indian",
    mediterranean: "Mediterranean",
    american: "American",
    asian: "Asian",
    mexican: "Mexican",
    italian: "Italian",
    middle_eastern: "Middle Eastern",
    other: "Other",
}

function DietQuestionnaire() {
    const navigate = useNavigate()

    const { state: getState, call: fetchPrefs } = useQuery(
        dietApi.getPreferences,
    )
    const { state: submitState, call: submit } = useQuery(
        dietApi.completePreferences,
    )

    const [values, setValues] = useState<CompletePreferencesInput>({
        mealsPerDay: 3,
        cookingTime: "moderate",
        cuisines: [],
        budgetTier: "mid",
        favoriteFoods: [],
        includeSnacks: true,
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Prefill with whatever's already on file — keeps editing seamless if the
    // user revisits the questionnaire later.
    useEffect(() => {
        fetchPrefs()
            .then((res) => {
                if (res.hasAnswered) {
                    // Already answered — drop straight into the plan view.
                    navigate("/diet", { replace: true })
                    return
                }
                setValues((v) => ({
                    ...v,
                    mealsPerDay: res.preferences.mealsPerDay,
                    cookingTime: res.preferences.cookingTime,
                    cuisines: res.preferences.cuisines,
                    budgetTier: res.preferences.budgetTier,
                    favoriteFoods: res.preferences.favoriteFoods,
                    includeSnacks: res.preferences.includeSnacks,
                }))
            })
            .catch(() => {})
    }, [fetchPrefs, navigate])

    const toggleCuisine = (c: Cuisine) => {
        setValues((v) => ({
            ...v,
            cuisines: v.cuisines.includes(c)
                ? v.cuisines.filter((x) => x !== c)
                : [...v.cuisines, c],
        }))
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const parsed = completePreferencesSchema.safeParse(values)
        if (!parsed.success) {
            const out: Record<string, string> = {}
            for (const issue of parsed.error.issues) {
                const k = String(issue.path[0])
                if (!out[k]) out[k] = issue.message
            }
            setErrors(out)
            return
        }
        setErrors({})
        try {
            await submit(parsed.data)
            toast.success("Got it. Building your plan…")
            navigate("/diet", { replace: true })
        } catch {
            // submitState.error surfaces below
        }
    }

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur border-b border-neutral-200">
                <div className="max-w-2xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BackButton />
                        <Link
                            to="/dashboard"
                            className="text-xl font-black tracking-tight"
                        >
                            GC
                        </Link>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                        Diet preferences
                    </span>
                </div>
            </header>

            <section className="max-w-2xl mx-auto px-6 sm:px-10 py-10 sm:py-14 pb-32">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Tell us how you eat
                </span>
                <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                    Six quick answers.
                </h1>
                <p className="mt-3 text-neutral-500">
                    Combined with your profile, we'll build a 7-day plan that
                    matches your goals and your fridge.
                </p>

                {getState.loading && !values && (
                    <div className="mt-10 flex items-center gap-3 text-sm text-neutral-500">
                        <Spinner size="sm" />
                        Loading your preferences…
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="mt-10 flex flex-col gap-10"
                >
                    {/* 1. Meals per day */}
                    <Field
                        label="How many meals per day?"
                        error={errors.mealsPerDay}
                    >
                        <div className="grid grid-cols-5 gap-2">
                            {[2, 3, 4, 5, 6].map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() =>
                                        setValues((v) => ({
                                            ...v,
                                            mealsPerDay: n,
                                        }))
                                    }
                                    className={`min-h-12 rounded-xl border text-base font-bold tabular-nums transition-colors ${
                                        values.mealsPerDay === n
                                            ? "bg-neutral-900 text-white border-neutral-900"
                                            : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </Field>

                    {/* 2. Cooking time */}
                    <Field
                        label="How much time can you cook?"
                        error={errors.cookingTime}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(
                                Object.keys(COOKING_TIME_INFO) as CookingTime[]
                            ).map((t) => (
                                <ChoiceCard
                                    key={t}
                                    selected={values.cookingTime === t}
                                    onClick={() =>
                                        setValues((v) => ({
                                            ...v,
                                            cookingTime: t,
                                        }))
                                    }
                                    title={COOKING_TIME_INFO[t].label}
                                    desc={COOKING_TIME_INFO[t].desc}
                                />
                            ))}
                        </div>
                    </Field>

                    {/* 3. Cuisines */}
                    <Field
                        label="Cuisines you enjoy"
                        hint="Pick any. Skip if you're easy."
                        error={errors.cuisines}
                    >
                        <div className="flex flex-wrap gap-2">
                            {ALLOWED_CUISINES.map((c) => {
                                const active = values.cuisines.includes(c)
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => toggleCuisine(c)}
                                        className={`min-h-11 px-4 rounded-full text-sm font-medium border transition-colors ${
                                            active
                                                ? "bg-neutral-900 text-white border-neutral-900"
                                                : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
                                        }`}
                                    >
                                        {CUISINE_LABEL[c]}
                                    </button>
                                )
                            })}
                        </div>
                    </Field>

                    {/* 4. Budget */}
                    <Field
                        label="What's your grocery budget?"
                        error={errors.budgetTier}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(Object.keys(BUDGET_INFO) as BudgetTier[]).map(
                                (b) => (
                                    <ChoiceCard
                                        key={b}
                                        selected={values.budgetTier === b}
                                        onClick={() =>
                                            setValues((v) => ({
                                                ...v,
                                                budgetTier: b,
                                            }))
                                        }
                                        title={BUDGET_INFO[b].label}
                                        desc={BUDGET_INFO[b].desc}
                                    />
                                ),
                            )}
                        </div>
                    </Field>

                    {/* 5. Favorite foods */}
                    <Field
                        label="Foods you love"
                        hint="Press Enter after each. We'll lean into these."
                    >
                        <PillInput
                            values={values.favoriteFoods}
                            onChange={(favoriteFoods) =>
                                setValues((v) => ({ ...v, favoriteFoods }))
                            }
                            placeholder="e.g. chicken, rice, paneer"
                        />
                    </Field>

                    {/* 6. Snacks */}
                    <Field label="Include snacks?">
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { v: true, label: "Yes, snacks ok" },
                                { v: false, label: "No, meals only" },
                            ].map((opt) => (
                                <button
                                    key={String(opt.v)}
                                    type="button"
                                    onClick={() =>
                                        setValues((v) => ({
                                            ...v,
                                            includeSnacks: opt.v,
                                        }))
                                    }
                                    className={`min-h-12 rounded-xl border text-sm font-medium transition-colors ${
                                        values.includeSnacks === opt.v
                                            ? "bg-neutral-900 text-white border-neutral-900"
                                            : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </Field>

                    {submitState.error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {submitState.error.userMessage ||
                                submitState.error.message}
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={submitState.loading}
                            className="inline-flex items-center justify-center gap-2 min-h-14 px-7 rounded-full bg-neutral-900 text-white font-semibold active:scale-[0.98] transition-all hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitState.loading && <Spinner size="sm" />}
                            {submitState.loading ? "Saving…" : "Save & continue"}
                            {!submitState.loading && (
                                <span aria-hidden className="text-lg">
                                    →
                                </span>
                            )}
                        </button>
                    </div>
                </form>
            </section>
        </main>
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
            <label className="text-sm font-medium text-neutral-700">
                {label}
            </label>
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
    desc,
}: {
    selected: boolean
    onClick: () => void
    title: string
    desc: string
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
                {desc}
            </div>
        </button>
    )
}

function PillInput({
    values,
    placeholder,
    onChange,
}: {
    values: string[]
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

    return (
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
    )
}

export default DietQuestionnaire
