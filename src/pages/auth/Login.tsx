import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { loginSchema, zodErrors } from "../../schemas/auth"
import { authApi } from "../../lib/endpoints/auth"
import { useAuthStore } from "../../stores/authStore"
import { useQuery } from "../../hooks/useQuery"
import { cache } from "../../lib/cache"
import GoogleSignInButton from "../../components/auth/GoogleSignInButton"

const dotPattern: React.CSSProperties = {
    backgroundImage: "radial-gradient(circle, #d6d3d1 1.2px, transparent 1.2px)",
    backgroundSize: "22px 22px",
}

type LocationState = { from?: { pathname?: string } } | null

function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const setUser = useAuthStore((s) => s.setUser)
    const redirectTo =
        (location.state as LocationState)?.from?.pathname ?? "/dashboard"

    const [userInfo, setUserInfo] = useState({ email: "", password: "" })
    const [error, setError] = useState<{ email?: string; password?: string }>({})

    const { state, call } = useQuery(authApi.login)

    const update = (field: keyof typeof userInfo) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setUserInfo((prev) => ({ ...prev, [field]: e.target.value }))
            if (error[field]) setError((prev) => ({ ...prev, [field]: undefined }))
        }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const result = loginSchema.safeParse(userInfo)
        if (!result.success) {
            setError(zodErrors(result.error))
            return
        }
        setError({})
        try {
            const { user } = await call(result.data)
            // Drop any cache entries from a previous user / signed-out session
            // before the new user lands on the dashboard.
            cache.clear()
            setUser(user)
            navigate(redirectTo, { replace: true })
        } catch {
            // shown via state.error
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
                        Welcome back
                    </span>
                    <h2 className="mt-4 text-5xl xl:text-6xl font-black tracking-tight leading-[1.02]">
                        Pick up where{" "}
                        <span className="text-neutral-300">you left off.</span>
                    </h2>
                    <p className="mt-6 text-neutral-600 leading-relaxed">
                        Your plan, your logs, and your AI coach are right where you left them.
                    </p>
                </div>

                <div
                    aria-hidden
                    className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400"
                >
                    Built for the gym · Designed for your phone
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
                        to="/register"
                        className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                        Need an account?{" "}
                        <span className="text-neutral-900 font-medium underline underline-offset-4">
                            Sign up
                        </span>
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center py-12">
                    <div className="w-full max-w-md">
                        <div className="mb-10">
                            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                                Sign in.
                            </h1>
                            <p className="mt-3 text-neutral-500">
                                Use the email you signed up with.
                            </p>
                        </div>

                        <div className="mb-6">
                            <GoogleSignInButton label="continue_with" redirectTo={redirectTo} />
                        </div>

                        <div className="flex items-center gap-3 my-6">
                            <span className="h-px flex-1 bg-neutral-200" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                                or
                            </span>
                            <span className="h-px flex-1 bg-neutral-200" />
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                            <Field
                                id="email"
                                label="Email"
                                type="email"
                                value={userInfo.email}
                                onChange={update("email")}
                                autoComplete="email"
                                error={error.email}
                                disabled={state.loading}
                            />
                            <Field
                                id="password"
                                label="Password"
                                type="password"
                                value={userInfo.password}
                                onChange={update("password")}
                                autoComplete="current-password"
                                error={error.password}
                                disabled={state.loading}
                                trailing={
                                    <Link
                                        to="/forgot-password"
                                        className="text-xs text-neutral-500 hover:text-neutral-900"
                                    >
                                        Forgot?
                                    </Link>
                                }
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
                                {state.loading ? "Signing in…" : "Sign in"}
                                {!state.loading && <span aria-hidden className="text-lg">→</span>}
                            </button>
                        </form>

                        <p className="mt-8 text-xs text-neutral-400 text-center leading-relaxed">
                            By signing in you agree to keep showing up.
                        </p>
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
    trailing,
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
    trailing?: React.ReactNode
    error?: string
    hint?: string
    disabled?: boolean
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <label htmlFor={id} className="text-sm font-medium text-neutral-700">
                    {label}
                </label>
                {trailing}
            </div>
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

export default Login
