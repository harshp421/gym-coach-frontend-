import { useState } from "react"
import { Link } from "react-router-dom"
import { registerSchema, zodErrors } from "../../schemas/auth"
import { authApi } from "../../lib/endpoints/auth"
import { useAuthStore } from "../../stores/authStore"
import { useQuery } from "../../hooks/useQuery"
import { cache } from "../../lib/cache"
import GoogleSignInButton from "../../components/auth/GoogleSignInButton"

const dotPattern: React.CSSProperties = {
    backgroundImage: "radial-gradient(circle, #d6d3d1 1.2px, transparent 1.2px)",
    backgroundSize: "22px 22px",
}

function Register() {
    const setUser = useAuthStore((s) => s.setUser)

    const [registerInfo, setRegisterInfo] = useState({
        name: "",
        email: "",
        password: "",
    })
    const [error, setError] = useState<{
        name?: string
        email?: string
        password?: string
    }>({})
    const [sentTo, setSentTo] = useState<string | null>(null)
    const [resentAt, setResentAt] = useState<number | null>(null)

    const { state, call } = useQuery(authApi.register)
    const { state: resendState, call: resend } = useQuery(authApi.resendVerification)

    const update = (field: keyof typeof registerInfo) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setRegisterInfo((prev) => ({ ...prev, [field]: e.target.value }))
            if (error[field]) setError((prev) => ({ ...prev, [field]: undefined }))
        }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const result = registerSchema.safeParse(registerInfo)
        if (!result.success) {
            setError(zodErrors(result.error))
            return
        }
        setError({})
        try {
            const { user } = await call(result.data)
            // Backend sets the cookie on register — the user is logged in.
            // Wipe any stale cache from a prior session before any reads.
            cache.clear()
            setUser(user)
            setSentTo(user.email)
        } catch {
            // shown via state.error
        }
    }

    const handleResend = async () => {
        try {
            await resend()
            setResentAt(Date.now())
        } catch {
            // shown via resendState.error
        }
    }

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900 grid lg:grid-cols-2">
            <aside
                className="relative hidden lg:flex flex-col justify-between px-12 py-10"
                style={dotPattern}
            >
                <Link to="/" className="flex items-baseline gap-3">
                    <span className="text-xl font-black tracking-tight">GC</span>
                    <span className="text-xs text-neutral-400 font-medium tabular-nums">v0.1</span>
                </Link>

                <div className="max-w-md">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                        Early access
                    </span>
                    <h2 className="mt-4 text-5xl xl:text-6xl font-black tracking-tight leading-[1.02]">
                        Train smart.{" "}
                        <span className="text-neutral-300">Eat smart.</span>{" "}
                        <span className="text-neutral-300">Track everything.</span>
                    </h2>
                    <ul className="mt-8 space-y-2.5 text-sm text-neutral-700">
                        {[
                            "AI plans built around your goals",
                            "Photo calorie tracking in one tap",
                            "Weekly check-ins that adjust the plan",
                        ].map((item) => (
                            <li key={item} className="flex items-start gap-2.5">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-900 flex-none" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div
                    aria-hidden
                    className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400"
                >
                    No App Store · Works in your browser
                </div>
            </aside>

            <section className="flex flex-col px-6 sm:px-12 py-8 sm:py-10">
                <div className="flex items-center justify-between lg:justify-end">
                    <Link to="/" className="lg:hidden flex items-baseline gap-3">
                        <span className="text-xl font-black tracking-tight">GC</span>
                        <span className="text-xs text-neutral-400 font-medium tabular-nums">
                            v0.1
                        </span>
                    </Link>
                    <Link
                        to="/login"
                        className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                        Already have one?{" "}
                        <span className="text-neutral-900 font-medium underline underline-offset-4">
                            Sign in
                        </span>
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center py-12">
                    <div className="w-full max-w-md">
                        {sentTo ? (
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                                    Verify your email.
                                </h1>
                                <p className="mt-3 text-neutral-500">
                                    We sent a verification link to{" "}
                                    <span className="text-neutral-900 font-medium">{sentTo}</span>.
                                    Click it to activate your account.
                                </p>

                                <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5">
                                    <p className="text-sm text-neutral-600">
                                        Didn't get it? Check your spam folder, or send the link
                                        again.
                                    </p>

                                    {resendState.error && (
                                        <div
                                            role="alert"
                                            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                        >
                                            {resendState.error.userMessage ||
                                                resendState.error.message}
                                        </div>
                                    )}

                                    {resentAt && !resendState.error && (
                                        <div
                                            role="status"
                                            className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                                        >
                                            Sent again. Give it a minute.
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={resendState.loading}
                                        className="mt-4 inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-full border border-neutral-900 text-neutral-900 font-semibold active:scale-[0.98] transition-all hover:bg-neutral-900 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {resendState.loading
                                            ? "Sending…"
                                            : "Resend verification email"}
                                    </button>
                                </div>

                                <div className="mt-8 flex items-center gap-3 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => setSentTo(null)}
                                        className="text-neutral-500 hover:text-neutral-900"
                                    >
                                        Use a different email
                                    </button>
                                    <span aria-hidden className="text-neutral-300">·</span>
                                    <Link
                                        to="/login"
                                        className="text-neutral-900 font-medium underline underline-offset-4"
                                    >
                                        Back to sign in
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-10">
                                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                                        Create your account.
                                    </h1>
                                    <p className="mt-3 text-neutral-500">
                                        It takes about 30 seconds.
                                    </p>
                                </div>

                                <div className="mb-6">
                                    <GoogleSignInButton label="signup_with" />
                                </div>

                                <div className="flex items-center gap-3 my-6">
                                    <span className="h-px flex-1 bg-neutral-200" />
                                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                                        or
                                    </span>
                                    <span className="h-px flex-1 bg-neutral-200" />
                                </div>

                                <form
                                    onSubmit={handleSubmit}
                                    noValidate
                                    className="flex flex-col gap-5"
                                >
                                    <Field
                                        id="name"
                                        label="Name"
                                        type="text"
                                        value={registerInfo.name}
                                        onChange={update("name")}
                                        autoComplete="name"
                                        error={error.name}
                                        disabled={state.loading}
                                    />
                                    <Field
                                        id="email"
                                        label="Email"
                                        type="email"
                                        value={registerInfo.email}
                                        onChange={update("email")}
                                        autoComplete="email"
                                        error={error.email}
                                        disabled={state.loading}
                                    />
                                    <Field
                                        id="password"
                                        label="Password"
                                        type="password"
                                        value={registerInfo.password}
                                        onChange={update("password")}
                                        autoComplete="new-password"
                                        hint="At least 8 characters."
                                        error={error.password}
                                        disabled={state.loading}
                                    />

                                    {state.error && (
                                        <div
                                            role="alert"
                                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                        >
                                            {state.error.userMessage || state.error.message}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={state.loading}
                                        className="mt-3 inline-flex items-center justify-center gap-2 min-h-14 px-6 rounded-full bg-neutral-900 text-white font-semibold active:scale-[0.98] transition-all hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {state.loading ? "Creating account…" : "Create account"}
                                        {!state.loading && (
                                            <span aria-hidden className="text-lg">→</span>
                                        )}
                                    </button>
                                </form>

                                <p className="mt-8 text-xs text-neutral-400 text-center leading-relaxed">
                                    By creating an account you agree to keep showing up.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </main>
    )
}

function Field({
    id,
    label,
    type,
    value,
    onChange,
    autoComplete,
    error,
    hint,
    disabled,
}: {
    id: string
    label: string
    type: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    autoComplete?: string
    error?: string
    hint?: string
    disabled?: boolean
}) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-sm font-medium text-neutral-700">
                {label}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                aria-invalid={!!error}
                disabled={disabled}
                className={`w-full min-h-12 px-4 text-base rounded-xl bg-white border outline-none transition-colors disabled:bg-neutral-100 disabled:cursor-not-allowed ${
                    error
                        ? "border-red-500 focus:border-red-500"
                        : "border-neutral-300 focus:border-neutral-900"
                }`}
            />
            {error ? (
                <span className="text-xs text-red-600">{error}</span>
            ) : hint ? (
                <span className="text-xs text-neutral-500">{hint}</span>
            ) : null}
        </div>
    )
}

export default Register
