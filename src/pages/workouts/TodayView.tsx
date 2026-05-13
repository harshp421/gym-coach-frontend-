import { useEffect } from "react"
import { Link } from "react-router-dom"
import { workoutsApi } from "../../lib/endpoints/workouts"
import { useQuery } from "../../hooks/useQuery"
import DaySession from "./components/DaySession"
import BackButton from "../../components/BackButton"

function TodayView() {
    const { state, call: fetchToday } = useQuery(workoutsApi.getToday)

    useEffect(() => {
        fetchToday().catch(() => {})
    }, [fetchToday])

    const day = state.data?.day ?? null

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="max-w-2xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BackButton to="/dashboard" />
                    <Link to="/dashboard" className="text-xl font-black tracking-tight">
                        GC
                    </Link>
                </div>
                <Link
                    to="/workouts/plan"
                    className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                >
                    Full week →
                </Link>
            </header>

            <section className="max-w-2xl mx-auto px-6 sm:px-10 pb-24">
                {state.loading && !day && (
                    <p className="mt-6 text-neutral-500">Loading today's session…</p>
                )}

                {state.error && !state.loading && (
                    <ErrorBox
                        message={
                            state.error.userMessage ||
                            state.error.message ||
                            "Couldn't load today's workout."
                        }
                    />
                )}

                {!state.loading && !day && !state.error && <RestState />}

                {day && (
                    <DaySession day={day} onRefresh={() => fetchToday().catch(() => {})} />
                )}
            </section>
        </main>
    )
}

function RestState() {
    return (
        <div className="mt-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Today
            </span>
            <h1 className="mt-3 text-5xl sm:text-6xl font-black tracking-tight leading-[1.02]">
                Rest day.
            </h1>
            <p className="mt-3 text-neutral-500 max-w-md">
                Nothing scheduled today. Recovery counts. Eat, walk, sleep — come back
                tomorrow.
            </p>
            <Link
                to="/workouts/plan"
                className="mt-8 inline-flex items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-sm font-semibold hover:border-neutral-900 transition-colors"
            >
                See full week
                <span aria-hidden>→</span>
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

export default TodayView
