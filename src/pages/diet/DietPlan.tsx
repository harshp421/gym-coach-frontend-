import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "../../hooks/useQuery"
import { dietApi } from "../../lib/endpoints/diet"
import type { DietPlan, Meal } from "../../schemas/diet"
import { toast } from "../../stores/toastStore"
import Spinner from "../../components/ui/Spinner"
import CalorieRing from "./components/CalorieRing"
import MacroBars from "./components/MacroBars"
import MealCard from "./components/MealCard"
import DayPicker from "./components/DayPicker"

function DietPlanView() {
    const navigate = useNavigate()
    const { state: prefsState, call: fetchPrefs } = useQuery(
        dietApi.getPreferences,
    )
    const { state: planState, call: fetchPlan } = useQuery(dietApi.getPlan)
    const { state: genState, call: generate } = useQuery(dietApi.generatePlan)

    const [plan, setPlan] = useState<DietPlan | null>(null)
    const [dayIndex, setDayIndex] = useState(0)

    // Bootstrap: load prefs first (to gate on questionnaire), then plan.
    useEffect(() => {
        let cancelled = false
        fetchPrefs()
            .then((res) => {
                if (cancelled) return
                if (!res.hasAnswered) {
                    navigate("/diet/questionnaire", { replace: true })
                    return
                }
                return fetchPlan().then((p) => {
                    if (cancelled) return
                    setPlan(p.plan)
                })
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [fetchPrefs, fetchPlan, navigate])

    const handleGenerate = async () => {
        try {
            const res = await generate()
            setPlan(res.plan)
            setDayIndex(0)
            toast.success("Your week is ready")
        } catch (err) {
            const msg =
                (err as { userMessage?: string; message?: string })
                    ?.userMessage ||
                (err as Error)?.message ||
                "Couldn't build the plan"
            toast.error(msg)
        }
    }

    // Group meals by day once when the plan loads/changes.
    const mealsByDay = useMemo(() => {
        const map = new Map<number, Meal[]>()
        if (!plan) return map
        for (const m of plan.meals) {
            const list = map.get(m.dayIndex) ?? []
            list.push(m)
            map.set(m.dayIndex, list)
        }
        // Stable order per day — preserve the AI's slot ordering.
        return map
    }, [plan])

    const todayMeals = mealsByDay.get(dayIndex) ?? []
    const dayTotals = todayMeals.reduce(
        (acc, m) => ({
            kcal: acc.kcal + m.calories,
            p: acc.p + m.proteinG,
            c: acc.c + m.carbsG,
            f: acc.f + m.fatG,
        }),
        { kcal: 0, p: 0, c: 0, f: 0 },
    )

    const bootstrapping =
        prefsState.loading || (planState.loading && !plan && !planState.error)

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur border-b border-neutral-200">
                <div className="max-w-2xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between">
                    <Link
                        to="/dashboard"
                        className="text-xl font-black tracking-tight"
                    >
                        GC
                    </Link>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                        Diet
                    </span>
                </div>
            </header>

            <section className="max-w-2xl mx-auto px-6 sm:px-10 py-10 sm:py-14 pb-32">
                {bootstrapping && (
                    <div className="flex items-center gap-3 text-sm text-neutral-500">
                        <Spinner size="md" />
                        Loading your diet…
                    </div>
                )}

                {!bootstrapping && genState.loading && (
                    <GeneratingState />
                )}

                {!bootstrapping && !genState.loading && !plan && (
                    <EmptyState
                        error={planState.error?.userMessage}
                        onGenerate={handleGenerate}
                    />
                )}

                {!bootstrapping && !genState.loading && plan && (
                    <>
                        <PlanHeader
                            plan={plan}
                            onRegenerate={handleGenerate}
                            regenerating={genState.loading}
                        />

                        <div className="mt-8">
                            <DayPicker value={dayIndex} onChange={setDayIndex} />
                        </div>

                        <div className="mt-8 rounded-2xl bg-white border border-neutral-200 p-6 flex flex-col sm:flex-row items-center gap-6">
                            <CalorieRing
                                target={plan.calorieTarget}
                                consumed={dayTotals.kcal}
                                size="lg"
                            />
                            <div className="flex-1 w-full">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                                    {WEEKDAY_LABEL[dayIndex]}
                                </div>
                                <div className="mt-1 text-sm text-neutral-500 tabular-nums">
                                    {dayTotals.kcal} kcal · {todayMeals.length} meal
                                    {todayMeals.length === 1 ? "" : "s"}
                                </div>
                                <div className="mt-4">
                                    <MacroBars
                                        proteinG={dayTotals.p}
                                        carbsG={dayTotals.c}
                                        fatG={dayTotals.f}
                                        proteinTargetG={plan.proteinTargetG}
                                        carbTargetG={plan.carbTargetG}
                                        fatTargetG={plan.fatTargetG}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            {todayMeals.length === 0 ? (
                                <p className="text-sm text-neutral-500 text-center py-8">
                                    No meals for this day.
                                </p>
                            ) : (
                                todayMeals.map((m, i) => (
                                    <MealCard key={`${m.slot}-${i}`} meal={m} />
                                ))
                            )}
                        </div>
                    </>
                )}
            </section>
        </main>
    )
}

const WEEKDAY_LABEL = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
] as const

function PlanHeader({
    plan,
    onRegenerate,
    regenerating,
}: {
    plan: DietPlan
    onRegenerate: () => void
    regenerating: boolean
}) {
    const generated = new Date(plan.generatedAt)
    return (
        <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Your week
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                Eat to your goal.
            </h1>
            {plan.notes && (
                <p className="mt-3 text-neutral-500">{plan.notes}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={regenerating}
                    className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full border border-neutral-300 text-neutral-900 text-sm font-semibold hover:border-neutral-900 transition-colors disabled:opacity-50"
                >
                    Regenerate
                </button>
                <span className="tabular-nums">
                    Built {formatRelative(generated)}
                </span>
            </div>
        </div>
    )
}

function GeneratingState() {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
            <Spinner size="lg" />
            <h2 className="mt-6 text-2xl font-black tracking-tight">
                Building your week…
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
                This takes about 10–15 seconds. We're calibrating macros and
                picking meals you'll actually eat.
            </p>
        </div>
    )
}

function EmptyState({
    error,
    onGenerate,
}: {
    error?: string
    onGenerate: () => void
}) {
    return (
        <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Diet
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                No plan yet.
            </h1>
            <p className="mt-3 text-neutral-500 max-w-md">
                We'll calculate your daily calories and macros, then generate a
                7-day plan that respects your preferences.
            </p>

            {error && (
                <div
                    role="alert"
                    className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                    {error}
                </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={onGenerate}
                    className="inline-flex items-center gap-2 min-h-14 px-7 rounded-full bg-neutral-900 text-white font-semibold active:scale-[0.98] transition-all hover:bg-neutral-800"
                >
                    Build my plan
                    <span aria-hidden className="text-lg">→</span>
                </button>
                <Link
                    to="/diet/questionnaire"
                    className="text-sm text-neutral-500 hover:text-neutral-900 underline underline-offset-4"
                >
                    Edit preferences
                </Link>
            </div>
        </div>
    )
}

function formatRelative(d: Date): string {
    const diffMs = Date.now() - d.getTime()
    const min = Math.floor(diffMs / 60_000)
    if (min < 1) return "just now"
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const day = Math.floor(hr / 24)
    return `${day}d ago`
}

export default DietPlanView
