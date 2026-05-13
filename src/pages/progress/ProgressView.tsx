import { Link } from "react-router-dom"
import { sessionsApi } from "../../lib/endpoints/sessions"
import { workoutsApi } from "../../lib/endpoints/workouts"
import { useCachedQuery } from "../../hooks/useCachedQuery"
import type { WorkoutSessionListItem } from "../../schemas/session"
import BackButton from "../../components/BackButton"
import type { WorkoutPlan } from "../../schemas/workout"
import Skeleton from "../../components/ui/Skeleton"
import BottomNav from "../../components/BottomNav"
import VolumeChart from "./VolumeChart"

const fmtDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
        })
    } catch {
        return iso.slice(0, 10)
    }
}

function ProgressView() {
    const { state: planState } = useCachedQuery(
        "workouts:plan",
        () => workoutsApi.getPlan(),
    )
    const { state: recentState } = useCachedQuery(
        "workouts:sessions:list:limit=30",
        () => sessionsApi.listRecent({ limit: 30 }),
        { ttl: 30_000 },
    )

    const plan = planState.data?.plan ?? null
    const items = recentState.data?.items ?? []

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="max-w-3xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BackButton to="/dashboard" />
                    <Link to="/dashboard" className="text-xl font-black tracking-tight">
                        GC
                    </Link>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Progress
                </span>
            </header>

            <section className="max-w-3xl mx-auto px-6 sm:px-10 pb-32 lg:pb-24">
                <h1 className="mt-3 text-5xl sm:text-6xl font-black tracking-tight leading-[1.02]">
                    What you've done.
                </h1>
                <p className="mt-3 text-neutral-500">
                    Volume per session, plus the receipts.
                </p>

                {recentState.loading && (
                    <div className="mt-8 flex flex-col gap-3">
                        <Skeleton height={180} rounded="2xl" />
                        <Skeleton height={92} rounded="2xl" />
                        <Skeleton height={92} rounded="2xl" />
                        <Skeleton height={92} rounded="2xl" />
                    </div>
                )}

                {recentState.error && !recentState.loading && (
                    <ErrorBox
                        message={
                            recentState.error.userMessage ||
                            recentState.error.message ||
                            "Couldn't load progress."
                        }
                    />
                )}

                {!recentState.loading && items.length === 0 && !recentState.error && (
                    <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
                        <h2 className="text-xl font-black tracking-tight">
                            Nothing logged yet.
                        </h2>
                        <p className="mt-2 text-sm text-neutral-500">
                            Start a session and your sets will land here.
                        </p>
                        <Link
                            to="/workouts/plan"
                            className="mt-6 inline-flex items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                        >
                            Open plan
                            <span aria-hidden>→</span>
                        </Link>
                    </div>
                )}

                {items.length > 0 && (
                    <>
                        <Totals items={items} />
                        <div className="mt-6">
                            <VolumeChart
                                sessions={items.filter(
                                    (i) => i.summary.totalVolumeKg > 0,
                                )}
                            />
                        </div>

                        <ul className="mt-8 flex flex-col gap-3">
                            {items.map((s) => (
                                <SessionRow key={s.id} session={s} plan={plan} />
                            ))}
                        </ul>
                    </>
                )}
            </section>
            <BottomNav />
        </main>
    )
}

function Totals({ items }: { items: WorkoutSessionListItem[] }) {
    const completed = items.filter((s) => s.completedAt !== null)
    const totalSets = completed.reduce((acc, s) => acc + s.summary.totalSets, 0)
    const totalReps = completed.reduce((acc, s) => acc + s.summary.totalReps, 0)
    const totalVolume = completed.reduce(
        (acc, s) => acc + s.summary.totalVolumeKg,
        0,
    )

    return (
        <div className="mt-8 grid grid-cols-3 gap-3">
            <Stat label="Sessions" value={completed.length.toString()} />
            <Stat label="Sets" value={totalSets.toString()} />
            <Stat
                label="Volume"
                value={
                    totalVolume >= 1000
                        ? `${(totalVolume / 1000).toFixed(1)}k`
                        : Math.round(totalVolume).toString()
                }
                unit={totalVolume >= 1000 ? "kg" : "kg"}
                hint={`${totalReps} reps total`}
            />
        </div>
    )
}

function Stat({
    label,
    value,
    unit,
    hint,
}: {
    label: string
    value: string
    unit?: string
    hint?: string
}) {
    return (
        <div className="rounded-2xl bg-white border border-neutral-200 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                {label}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black tabular-nums leading-none">
                    {value}
                </span>
                {unit && (
                    <span className="text-xs font-medium text-neutral-500">
                        {unit}
                    </span>
                )}
            </div>
            {hint && <div className="mt-1 text-[11px] text-neutral-400">{hint}</div>}
        </div>
    )
}

function SessionRow({
    session,
    plan,
}: {
    session: WorkoutSessionListItem
    plan: WorkoutPlan | null
}) {
    const day = plan?.days.find((d) => d.id === session.planDayId)
    const inProgress = !session.completedAt
    const { totalSets, totalReps, totalVolumeKg } = session.summary

    return (
        <li>
            <Link
                to={`/workouts/sessions/${session.id}`}
                className="block rounded-2xl bg-white border border-neutral-200 hover:border-neutral-900 transition-colors p-5"
            >
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 tabular-nums">
                        {fmtDate(session.startedAt)}
                    </span>
                    {inProgress && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[10px] font-bold tracking-normal">
                            in progress
                        </span>
                    )}
                </div>
                <div className="mt-2 text-2xl font-black tracking-tight">
                    {day?.name ?? "Workout"}
                </div>
                <div className="mt-2 text-xs text-neutral-500 tabular-nums">
                    {totalSets} set{totalSets === 1 ? "" : "s"} · {totalReps} reps
                    {totalVolumeKg > 0 && ` · ${Math.round(totalVolumeKg)} kg`}
                </div>
                {session.notes && (
                    <p className="mt-2 text-sm text-neutral-600 line-clamp-2">
                        {session.notes}
                    </p>
                )}
            </Link>
        </li>
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

export default ProgressView
