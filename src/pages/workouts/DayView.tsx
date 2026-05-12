import { useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { workoutsApi } from "../../lib/endpoints/workouts"
import { useQuery } from "../../hooks/useQuery"
import DaySession from "./components/DaySession"

function DayView() {
    const { dayIndex: rawIndex = "0" } = useParams<{ dayIndex: string }>()
    const dayIndex = Number.parseInt(rawIndex, 10)
    const navigate = useNavigate()

    const { state, call: fetchPlan } = useQuery(workoutsApi.getPlan)

    useEffect(() => {
        fetchPlan().catch(() => {})
    }, [fetchPlan])

    if (Number.isNaN(dayIndex) || dayIndex < 0) {
        return (
            <Shell>
                <ErrorBox message="That day doesn't exist." />
            </Shell>
        )
    }

    const plan = state.data?.plan ?? null
    const day = plan?.days.find((d) => d.dayIndex === dayIndex) ?? null

    return (
        <Shell>
            {state.loading && !plan && (
                <p className="mt-6 text-neutral-500">Loading the day…</p>
            )}

            {state.error && !state.loading && (
                <ErrorBox
                    message={
                        state.error.userMessage ||
                        state.error.message ||
                        "Couldn't load this day."
                    }
                />
            )}

            {!state.loading && !plan && !state.error && (
                <NoPlanState />
            )}

            {plan && !day && (
                <ErrorBox
                    message={`Day ${dayIndex + 1} isn't in this plan (it has ${plan.days.length} days).`}
                />
            )}

            {plan && day && (
                <>
                    <div className="flex items-center gap-2 mb-2">
                        {dayIndex > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(`/workouts/day/${dayIndex - 1}`)
                                }
                                className="text-xs text-neutral-500 hover:text-neutral-900"
                            >
                                ← Prev
                            </button>
                        )}
                        {dayIndex < plan.days.length - 1 && (
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(`/workouts/day/${dayIndex + 1}`)
                                }
                                className="ml-auto text-xs text-neutral-500 hover:text-neutral-900"
                            >
                                Next →
                            </button>
                        )}
                    </div>

                    <DaySession
                        day={day}
                        onRefresh={() => fetchPlan().catch(() => {})}
                        totalDays={plan.days.length}
                    />
                </>
            )}
        </Shell>
    )
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="max-w-2xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
                <Link to="/dashboard" className="text-xl font-black tracking-tight">
                    GC
                </Link>
                <Link
                    to="/workouts/plan"
                    className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                >
                    Full week →
                </Link>
            </header>
            <section className="max-w-2xl mx-auto px-6 sm:px-10 pb-24">
                {children}
            </section>
        </main>
    )
}

function NoPlanState() {
    return (
        <div className="mt-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                No plan
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                You don't have a plan yet.
            </h1>
            <Link
                to="/workouts/plan"
                className="mt-8 inline-flex items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
            >
                Build one →
            </Link>
        </div>
    )
}

function ErrorBox({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
            {message}
        </div>
    )
}

export default DayView
