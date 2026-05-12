import { Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "../stores/authStore"
import { useProfileStore } from "../stores/profileStore"
import { useSessionStore } from "../stores/sessionStore"
import { useQuery } from "../hooks/useQuery"
import { useCachedQuery } from "../hooks/useCachedQuery"
import { cache } from "../lib/cache"
import { authApi } from "../lib/endpoints/auth"
import { workoutsApi } from "../lib/endpoints/workouts"
import { sessionsApi } from "../lib/endpoints/sessions"
import type { PlanDay } from "../schemas/workout"
import type {
    WorkoutSession,
    WorkoutSessionListItem,
    WorkoutSessionWithSets,
} from "../schemas/session"
import Spinner from "../components/ui/Spinner"
import Skeleton from "../components/ui/Skeleton"
import BottomNav from "../components/BottomNav"

function Dashboard() {
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)
    const clearUser = useAuthStore((s) => s.clearUser)
    const profile = useProfileStore((s) => s.profile)
    const clearProfile = useProfileStore((s) => s.clearProfile)
    const clearActive = useSessionStore((s) => s.clearActive)

    const { state: logoutState, call: logout } = useQuery(authApi.logout)

    const { state: todayState } = useCachedQuery(
        "workouts:today",
        () => workoutsApi.getToday(),
        { ttl: 60_000 },
    )
    const { state: activeState } = useCachedQuery(
        "workouts:sessions:active",
        () => sessionsApi.getActive(),
        { ttl: 15_000 },
    )
    const { state: recentState } = useCachedQuery(
        "workouts:sessions:list:limit=20",
        () => sessionsApi.listRecent({ limit: 20 }),
        { ttl: 30_000 },
    )

    const handleLogout = async () => {
        try {
            await logout()
        } finally {
            clearUser()
            clearProfile()
            clearActive()
            cache.clear()
            navigate("/", { replace: true })
        }
    }

    const today = todayState.data?.day ?? null
    const active = activeState.data?.session ?? null
    const recent = recentState.data?.items ?? []

    // First-paint loading: only when nothing is cached yet.
    const firstLoad =
        todayState.loading && activeState.loading && recentState.loading

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="max-w-5xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
                <span className="text-xl font-black tracking-tight">GC</span>
                <div className="flex items-center gap-5 text-sm">
                    <Link
                        to="/coach"
                        className="text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                        Coach
                    </Link>
                    <Link
                        to="/exercises/mine"
                        className="text-neutral-600 hover:text-neutral-900 transition-colors hidden sm:inline"
                    >
                        My exercises
                    </Link>
                    <Link
                        to="/progress"
                        className="text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                        Progress
                    </Link>
                    <Link
                        to="/profile"
                        className="text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                        Profile
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={logoutState.loading}
                        className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors disabled:opacity-50"
                    >
                        {logoutState.loading && <Spinner size="sm" />}
                        {logoutState.loading ? "Signing out…" : "Sign out"}
                    </button>
                </div>
            </header>

            <section className="max-w-5xl mx-auto px-6 sm:px-10 py-10 pb-32 lg:pb-24">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Dashboard
                </span>
                <h1 className="mt-3 text-5xl sm:text-6xl font-black tracking-tight leading-[1.02]">
                    Welcome,{" "}
                    <span className="text-neutral-300">
                        {user?.name ?? user?.email ?? "athlete"}.
                    </span>
                </h1>

                <div className="mt-12 grid sm:grid-cols-2 gap-4">
                    {firstLoad ? (
                        <Skeleton height={200} rounded="2xl" />
                    ) : (
                        <TodayCard today={today} active={active} recent={recent} />
                    )}

                    <Link
                        to="/coach"
                        className="rounded-2xl border border-neutral-200 bg-neutral-900 text-white p-6 flex flex-col hover:bg-neutral-800 transition-colors"
                    >
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                            AI coach
                        </div>
                        <div className="mt-2 text-3xl font-black tracking-tight">
                            Ask anything.
                        </div>
                        <p className="mt-1 text-sm text-neutral-300">
                            Plateau? Form check? Diet question? It knows your
                            plan.
                        </p>
                        <span className="mt-6 inline-flex self-start items-center gap-2 min-h-12 px-5 rounded-full bg-white text-neutral-900 text-sm font-semibold">
                            Open chat
                            <span aria-hidden className="text-base">→</span>
                        </span>
                    </Link>

                    <Link
                        to="/diet"
                        className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col hover:border-neutral-900 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                                Diet
                            </div>
                            <div
                                aria-hidden
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                            >
                                <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                                    P
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                                    C
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                                    F
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 text-3xl font-black tracking-tight">
                            Eat to your goal.
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">
                            A 7-day meal plan with macros that hit your daily
                            targets.
                        </p>
                        <span className="mt-6 inline-flex self-start items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-neutral-900 text-sm font-semibold hover:border-neutral-900 transition-colors">
                            Open diet plan
                            <span aria-hidden className="text-base">→</span>
                        </span>
                    </Link>

                    <Link
                        to="/gallery"
                        className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col hover:border-neutral-900 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                                Discover
                            </div>
                            <div
                                aria-hidden
                                className="flex -space-x-1.5"
                            >
                                <span className="h-7 w-7 rounded-lg bg-linear-to-br from-neutral-300 to-neutral-400 ring-2 ring-white" />
                                <span className="h-7 w-7 rounded-lg bg-linear-to-br from-neutral-200 to-neutral-300 ring-2 ring-white" />
                                <span className="h-7 w-7 rounded-lg bg-linear-to-br from-neutral-300 to-neutral-500 ring-2 ring-white" />
                            </div>
                        </div>
                        <div className="mt-3 text-3xl font-black tracking-tight">
                            Find your next move.
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">
                            Browse 800+ exercises. Tap one to add it straight
                            to your plan.
                        </p>
                        <span className="mt-6 inline-flex self-start items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-neutral-900 text-sm font-semibold hover:border-neutral-900 transition-colors">
                            Open gallery
                            <span aria-hidden className="text-base">→</span>
                        </span>
                    </Link>

                    {profile && (
                        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                                Your profile
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                <Stat label="Goal" value={profile.goal ?? "—"} />
                                <Stat
                                    label="Days/week"
                                    value={
                                        profile.trainingDaysPerWeek?.toString() ??
                                        "—"
                                    }
                                />
                                <Stat
                                    label="Diet"
                                    value={profile.dietType ?? "—"}
                                />
                                <Stat
                                    label="Equipment"
                                    value={profile.equipmentAccess ?? "—"}
                                />
                            </dl>
                            <div className="mt-4 flex items-center gap-4 text-xs">
                                <Link
                                    to="/profile"
                                    className="text-neutral-700 hover:text-neutral-900 underline underline-offset-4"
                                >
                                    Edit profile →
                                </Link>
                                <Link
                                    to="/exercises/mine"
                                    className="text-neutral-500 hover:text-neutral-900 underline underline-offset-4"
                                >
                                    My exercises →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>
            <BottomNav />
        </main>
    )
}

function TodayCard({
    today,
    active,
    recent,
}: {
    today: PlanDay | null
    active: WorkoutSession | WorkoutSessionWithSets | null
    recent: WorkoutSessionListItem[]
}) {
    // 1) In-progress session — highest priority.
    if (active) {
        const isToday = !!today && active.planDayId === today.id
        const setsLogged =
            "sets" in active
                ? new Set(active.sets.map((s) => s.planExerciseId)).size
                : 0
        const totalSlots = today && isToday ? today.exercises.length : 0
        return (
            <CardShell label="In progress">
                <div className="mt-2 text-3xl font-black tracking-tight">
                    {isToday && today
                        ? today.name
                        : "Pick up where you left off."}
                </div>
                <div className="mt-1 text-sm text-neutral-500 tabular-nums">
                    {isToday && totalSlots > 0
                        ? `${setsLogged} of ${totalSlots} exercises started`
                        : "session running"}
                </div>
                <Link
                    to={`/workouts/sessions/${active.id}`}
                    className="mt-6 inline-flex self-start items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                >
                    Resume
                    <span aria-hidden className="text-base">→</span>
                </Link>
            </CardShell>
        )
    }

    // 2) Today already logged.
    if (today && hasLoggedToday(today.id, recent)) {
        return (
            <CardShell label="Today's workout">
                <div className="mt-2 text-3xl font-black tracking-tight">
                    Done. ✓
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                    Nice work. See what changed.
                </p>
                <Link
                    to="/progress"
                    className="mt-6 inline-flex self-start items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-sm font-semibold hover:border-neutral-900 transition-colors"
                >
                    See progress
                    <span aria-hidden>→</span>
                </Link>
            </CardShell>
        )
    }

    // 3) Today's day exists, not yet logged.
    if (today) {
        return (
            <CardShell label="Today's workout">
                <div className="mt-2 text-3xl font-black tracking-tight">
                    {today.name}
                </div>
                <div className="mt-1 text-sm text-neutral-500 tabular-nums">
                    {today.exercises.length} exercises
                </div>
                <Link
                    to={`/workouts/day/${today.dayIndex}`}
                    className="mt-6 inline-flex self-start items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                >
                    Start
                    <span aria-hidden className="text-base">→</span>
                </Link>
            </CardShell>
        )
    }

    // 4) No today (rest day OR no plan).
    return (
        <CardShell label="Today">
            <div className="mt-2 text-3xl font-black tracking-tight">
                Rest day.
            </div>
            <p className="mt-1 text-sm text-neutral-500">
                Or open the plan if you don't have one yet.
            </p>
            <Link
                to="/workouts/plan"
                className="mt-6 inline-flex self-start items-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-sm font-semibold hover:border-neutral-900 transition-colors"
            >
                View plan
                <span aria-hidden>→</span>
            </Link>
        </CardShell>
    )
}

function CardShell({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                {label}
            </div>
            {children}
        </div>
    )
}

function hasLoggedToday(
    planDayId: string,
    recent: WorkoutSessionListItem[],
): boolean {
    const today = new Date().toISOString().slice(0, 10)
    return recent.some(
        (s) =>
            s.planDayId === planDayId &&
            s.completedAt !== null &&
            s.completedAt.slice(0, 10) === today,
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                {label}
            </dt>
            <dd className="mt-1 text-base font-semibold capitalize">
                {value.replace(/_/g, " ")}
            </dd>
        </div>
    )
}

export default Dashboard
