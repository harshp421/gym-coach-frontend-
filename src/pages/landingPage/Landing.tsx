import { Link } from "react-router-dom"
import { useAuthStore } from "../../stores/authStore"

const dotPattern: React.CSSProperties = {
    backgroundImage: "radial-gradient(circle, #d6d3d1 1.2px, transparent 1.2px)",
    backgroundSize: "22px 22px",
}

function Landing() {
    const isAuthed = !!useAuthStore((s) => s.user)
    return (
        <main
            className="relative min-h-screen bg-stone-50 text-neutral-900 overflow-x-hidden"
            style={dotPattern}
        >
            <header className="relative px-6 sm:px-10 py-6 max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                    <span className="text-xl font-black tracking-tight">GC</span>
                    <span className="text-xs text-neutral-400 font-medium tabular-nums">v0.1</span>
                </div>
                <nav className="flex items-center gap-3 sm:gap-5 text-sm">
                    {isAuthed ? (
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
                        >
                            Dashboard
                            <span aria-hidden className="text-base">→</span>
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="text-neutral-600 hover:text-neutral-900 transition-colors"
                            >
                                Sign in
                            </Link>
                            <Link
                                to="/register"
                                className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-medium transition-colors"
                            >
                                Get started
                            </Link>
                        </>
                    )}
                </nav>
            </header>

            <aside
                aria-hidden
                className="hidden xl:block fixed right-6 top-1/2 -translate-y-1/2 text-xl font-black tracking-tight text-neutral-900"
                style={{ writingMode: "vertical-rl" }}
            >
                GYM COACH<span className="ml-1 align-top text-xs">™</span>
            </aside>

            <section className="relative px-6 sm:px-10 max-w-7xl mx-auto pt-12 sm:pt-20 pb-24">
                <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 lg:gap-12 items-center">
                    <div>
                        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-700 bg-white border border-neutral-200 rounded-full px-3 py-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
                            Early access
                        </span>

                        <p className="mt-7 text-[15px] sm:text-base font-bold text-neutral-900 leading-relaxed max-w-md">
                            Your AI gym partner that builds the plan, tracks meals from a photo, and
                            checks in after every set.
                        </p>

                        <h1 className="mt-6 text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95]">
                            Just lift.
                            <br />
                            <span className="text-neutral-300">We'll handle</span>
                            <br />
                            <span className="text-neutral-300">the rest.</span>
                        </h1>

                        <p className="mt-8 text-base text-neutral-600 leading-relaxed max-w-md">
                            Workout plans, diet, photo calories, and weekly check-ins — adapted to your
                            body and your goals. No spreadsheets, no guesswork.
                        </p>

                        <div className="mt-10 flex flex-wrap items-center gap-3">
                            {isAuthed ? (
                                <Link
                                    to="/dashboard"
                                    className="inline-flex items-center gap-2 min-h-14 px-7 rounded-full bg-neutral-900 text-white font-semibold active:scale-[0.98] transition-all hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
                                >
                                    Go to dashboard
                                    <span aria-hidden className="text-lg">→</span>
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/register"
                                        className="inline-flex items-center gap-2 min-h-14 px-7 rounded-full bg-neutral-900 text-white font-semibold active:scale-[0.98] transition-all hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
                                    >
                                        Build my plan
                                        <span aria-hidden className="text-lg">→</span>
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center min-h-14 px-6 text-neutral-700 font-medium hover:text-neutral-900 transition-colors"
                                    >
                                        I have an account
                                    </Link>
                                </>
                            )}
                        </div>

                        <p className="mt-8 text-xs text-neutral-400 max-w-xs leading-relaxed">
                            *Web app for iPhone, Android, tablet & desktop. No App Store needed.
                        </p>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                        <PhonePreview />
                    </div>
                </div>
            </section>

            <Bento />

            <section className="relative px-6 sm:px-10 max-w-7xl mx-auto pt-16 pb-24">
                <div className="rounded-4xl bg-neutral-900 text-white px-8 sm:px-14 py-16 sm:py-20 text-center relative overflow-hidden">
                    <span
                        aria-hidden
                        className="absolute inset-0 opacity-[0.07]"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle, #ffffff 1.2px, transparent 1.2px)",
                            backgroundSize: "22px 22px",
                        }}
                    />
                    <div className="relative">
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                            Ready when you are
                        </span>
                        <h2 className="mt-4 text-4xl sm:text-6xl font-black tracking-tight leading-[1.02] max-w-3xl mx-auto">
                            Your first plan is{" "}
                            <span className="text-neutral-500">60 seconds away.</span>
                        </h2>
                        <Link
                            to={isAuthed ? "/dashboard" : "/register"}
                            className="mt-10 inline-flex items-center gap-2 min-h-14 px-8 rounded-full bg-white text-neutral-900 font-semibold active:scale-[0.98] transition-all hover:bg-neutral-100"
                        >
                            {isAuthed ? "Go to dashboard" : "Build my plan"}
                            <span aria-hidden className="text-lg">→</span>
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="relative px-6 sm:px-10 max-w-7xl mx-auto pb-10 flex items-center justify-between text-xs text-neutral-400">
                <span>
                    <span className="font-bold text-neutral-700">GC</span> · Built for the gym.
                </span>
                <span className="tabular-nums">v0.1 · {new Date().getFullYear()}</span>
            </footer>
        </main>
    )
}

function Bento() {
    return (
        <section className="relative px-6 sm:px-10 max-w-7xl mx-auto pb-24">
            <div className="mb-12 sm:mb-16 max-w-3xl">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    What you get
                </span>
                <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.02]">
                    Everything a real coach gives you.{" "}
                    <span className="text-neutral-300">Now in one app.</span>
                </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 sm:gap-5 sm:auto-rows-[200px]">
                <BentoBox className="sm:col-span-4 sm:row-span-2 flex flex-col justify-between">
                    <BentoHead
                        eyebrow="Workouts"
                        title="Plans built around your body."
                        body="Periodized splits that adapt week to week. We learn from every set you log."
                    />
                    <WeekGrid />
                </BentoBox>

                <BentoBox className="sm:col-span-2">
                    <BentoHead
                        eyebrow="Photo calories"
                        title="Snap a meal."
                        body="One photo. Calories and macros, instantly."
                        compact
                    />
                    <div className="mt-3 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-linear-to-br from-neutral-200 to-neutral-300 flex items-center justify-center text-lg">
                            🍱
                        </div>
                        <div>
                            <div className="text-2xl font-black tabular-nums leading-none">
                                612 <span className="text-xs font-medium text-neutral-500">kcal</span>
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-1">42P · 65C · 22F</div>
                        </div>
                    </div>
                </BentoBox>

                <BentoBox className="sm:col-span-2 bg-neutral-900 text-white border-neutral-900">
                    <BentoHead
                        eyebrow="AI coach"
                        eyebrowClass="text-neutral-400"
                        title="Always-on advice."
                        titleClass="text-white"
                        body=""
                        compact
                    />
                    <div className="mt-3 rounded-xl bg-neutral-800 p-3 text-sm leading-snug">
                        "Try paused reps today — your bar speed dipped after set 3."
                    </div>
                </BentoBox>

                <BentoBox className="sm:col-span-2">
                    <BentoHead
                        eyebrow="Diet"
                        title="Eat to your goal."
                        body=""
                        compact
                    />
                    <div className="mt-3 space-y-2">
                        <MacroBar label="Protein" value="180g" pct={90} />
                        <MacroBar label="Carbs" value="220g" pct={70} />
                        <MacroBar label="Fats" value="60g" pct={50} />
                    </div>
                </BentoBox>

                <BentoBox className="sm:col-span-2">
                    <BentoHead
                        eyebrow="Progress"
                        title="See it move."
                        body=""
                        compact
                    />
                    <div className="mt-3 flex items-end justify-between gap-1.5 h-16">
                        {[40, 50, 45, 60, 55, 70, 80].map((h, i) => (
                            <span
                                key={i}
                                className="flex-1 rounded-t bg-neutral-900"
                                style={{ height: `${h}%` }}
                            />
                        ))}
                    </div>
                    <div className="mt-2 text-[11px] text-neutral-500">
                        Bench · 60→80kg · 8 weeks
                    </div>
                </BentoBox>

                <BentoBox className="sm:col-span-2">
                    <BentoHead
                        eyebrow="Check-ins"
                        title="Weekly review."
                        body=""
                        compact
                    />
                    <div className="mt-3 rounded-xl border border-neutral-200 bg-stone-50 p-3">
                        <div className="text-xs text-neutral-500">Week 4</div>
                        <div className="mt-1 text-sm font-semibold">How did the volume feel?</div>
                        <div className="mt-2 flex gap-1.5">
                            {["Easy", "Right", "Hard"].map((t) => (
                                <span
                                    key={t}
                                    className="text-[11px] px-2 py-1 rounded-full bg-white border border-neutral-200"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                </BentoBox>
            </div>
        </section>
    )
}

function BentoBox({
    children,
    className = "",
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={`rounded-3xl bg-white border border-neutral-200 p-6 sm:p-7 ${className}`}
        >
            {children}
        </div>
    )
}

function BentoHead({
    eyebrow,
    title,
    body,
    compact = false,
    eyebrowClass = "text-neutral-500",
    titleClass = "",
}: {
    eyebrow: string
    title: string
    body?: string
    compact?: boolean
    eyebrowClass?: string
    titleClass?: string
}) {
    return (
        <div>
            <span
                className={`text-[11px] font-bold uppercase tracking-[0.18em] ${eyebrowClass}`}
            >
                {eyebrow}
            </span>
            <h3
                className={`mt-2 ${
                    compact ? "text-xl" : "text-2xl sm:text-3xl"
                } font-black tracking-tight leading-tight ${titleClass}`}
            >
                {title}
            </h3>
            {body && (
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed max-w-md">
                    {body}
                </p>
            )}
        </div>
    )
}

function WeekGrid() {
    const days = [
        { d: "Mon", label: "Push", active: false },
        { d: "Tue", label: "Pull", active: false },
        { d: "Wed", label: "Legs", active: true },
        { d: "Thu", label: "Rest", active: false, muted: true },
        { d: "Fri", label: "Push", active: false },
        { d: "Sat", label: "Pull", active: false },
        { d: "Sun", label: "Legs", active: false },
    ]
    return (
        <div className="mt-6 grid grid-cols-7 gap-1.5">
            {days.map((day) => (
                <div
                    key={day.d}
                    className={`rounded-xl p-2.5 text-center border ${
                        day.active
                            ? "bg-neutral-900 text-white border-neutral-900"
                            : day.muted
                              ? "bg-neutral-50 text-neutral-400 border-neutral-200"
                              : "bg-stone-50 text-neutral-700 border-neutral-200"
                    }`}
                >
                    <div className="text-[10px] uppercase tracking-wider opacity-70">
                        {day.d}
                    </div>
                    <div className="mt-1 text-xs font-bold">{day.label}</div>
                </div>
            ))}
        </div>
    )
}

function MacroBar({ label, value, pct }: { label: string; value: string; pct: number }) {
    return (
        <div>
            <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-neutral-500">{label}</span>
                <span className="font-bold tabular-nums">{value}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <span
                    className="block h-full bg-neutral-900"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

function PhonePreview() {
    return (
        <div className="relative w-[280px] sm:w-[300px] aspect-[280/580] rounded-[2.75rem] bg-neutral-900 p-2.5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.35)]">
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-neutral-900 rounded-b-2xl z-10" />
            <div className="h-full w-full rounded-[2.25rem] bg-stone-50 overflow-hidden p-5 pt-10 flex flex-col gap-3">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 font-medium">
                        Tuesday
                    </div>
                    <div className="mt-1 text-2xl font-black tracking-tight">Push day</div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="text-[11px] text-neutral-500 font-medium">
                        Bench press · Set 2 of 4
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-4xl font-black tabular-nums leading-none">80</span>
                        <span className="text-sm font-medium text-neutral-500">kg × 8</span>
                    </div>
                    <div className="mt-3 flex gap-1">
                        <span className="h-1 flex-1 rounded-full bg-neutral-900" />
                        <span className="h-1 flex-1 rounded-full bg-neutral-900" />
                        <span className="h-1 flex-1 rounded-full bg-neutral-200" />
                        <span className="h-1 flex-1 rounded-full bg-neutral-200" />
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="text-[11px] text-neutral-500 font-medium">Today's calories</div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-3xl font-black tabular-nums leading-none">1,840</span>
                        <span className="text-sm text-neutral-500">/ 2,200</span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <span className="block h-full w-[83%] bg-neutral-900" />
                    </div>
                </div>

                <div className="rounded-2xl bg-neutral-900 text-white p-4 mt-auto">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 font-medium">
                        AI coach
                    </div>
                    <p className="mt-1 text-sm leading-snug">
                        "Up your protein by 20g today — you've got 2 sets left."
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Landing
