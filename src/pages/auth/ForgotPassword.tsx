import { useState } from "react"
import { Link } from "react-router-dom"
import { forgotPasswordSchema, zodErrors } from "../../schemas/auth"
import { authApi } from "../../lib/endpoints/auth"
import { useQuery } from "../../hooks/useQuery"

const dotPattern: React.CSSProperties = {
    backgroundImage: "radial-gradient(circle, #d6d3d1 1.2px, transparent 1.2px)",
    backgroundSize: "22px 22px",
}

function ForgotPassword() {
    const [email, setEmail] = useState("")
    const [error, setError] = useState<{ email?: string }>({})
    const [sent, setSent] = useState(false)

    const { state, call } = useQuery(authApi.forgotPassword)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const result = forgotPasswordSchema.safeParse({ email })
        if (!result.success) {
            setError(zodErrors(result.error))
            return
        }
        setError({})
        try {
            await call(result.data)
            setSent(true)
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
                        Forgot it?
                    </span>
                    <h2 className="mt-4 text-5xl xl:text-6xl font-black tracking-tight leading-[1.02]">
                        It happens.{" "}
                        <span className="text-neutral-300">We'll send you a link.</span>
                    </h2>
                    <p className="mt-6 text-neutral-600 leading-relaxed">
                        Enter your email and we'll send a one-time reset link. Good for one hour.
                    </p>
                </div>

                <div
                    aria-hidden
                    className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400"
                >
                    Encrypted · One-time use · Expires in 1h
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
                        Remembered it?{" "}
                        <span className="text-neutral-900 font-medium underline underline-offset-4">
                            Sign in
                        </span>
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center py-12">
                    <div className="w-full max-w-md">
                        {sent ? (
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                                    Check your inbox.
                                </h1>
                                <p className="mt-3 text-neutral-500">
                                    If <span className="text-neutral-900 font-medium">{email}</span>{" "}
                                    is on file, a reset link is on the way.
                                </p>
                                <Link
                                    to="/login"
                                    className="mt-10 inline-flex items-center justify-center gap-2 min-h-14 px-6 rounded-full bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
                                >
                                    Back to sign in
                                    <span aria-hidden className="text-lg">→</span>
                                </Link>
                                <p className="mt-6 text-sm text-neutral-500">
                                    Didn't get it?{" "}
                                    <button
                                        type="button"
                                        onClick={() => setSent(false)}
                                        className="text-neutral-900 font-medium underline underline-offset-4"
                                    >
                                        Try a different email
                                    </button>
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-10">
                                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                                        Reset password.
                                    </h1>
                                    <p className="mt-3 text-neutral-500">
                                        We'll email you a one-time link.
                                    </p>
                                </div>

                                <form
                                    onSubmit={handleSubmit}
                                    noValidate
                                    className="flex flex-col gap-5"
                                >
                                    <Field
                                        id="email"
                                        label="Email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            if (error.email)
                                                setError((prev) => ({ ...prev, email: undefined }))
                                        }}
                                        autoComplete="email"
                                        error={error.email}
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
                                        {state.loading ? "Sending…" : "Send reset link"}
                                        {!state.loading && <span aria-hidden className="text-lg">→</span>}
                                    </button>
                                </form>
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
    disabled,
}: {
    id: string
    label: string
    type: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    autoComplete?: string
    error?: string
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
            {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
    )
}

export default ForgotPassword
