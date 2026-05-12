import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { resetPasswordSchema, zodErrors } from "../../schemas/auth"
import { authApi } from "../../lib/endpoints/auth"
import { useQuery } from "../../hooks/useQuery"

const dotPattern: React.CSSProperties = {
    backgroundImage: "radial-gradient(circle, #d6d3d1 1.2px, transparent 1.2px)",
    backgroundSize: "22px 22px",
}

function ResetPassword() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token") ?? ""

    const [values, setValues] = useState({
        password: "",
        confirmPassword: "",
    })
    const [error, setError] = useState<{
        password?: string
        confirmPassword?: string
    }>({})
    const [done, setDone] = useState(false)

    const { state, call } = useQuery(authApi.resetPassword)

    const update = (field: keyof typeof values) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setValues((prev) => ({ ...prev, [field]: e.target.value }))
            if (error[field]) setError((prev) => ({ ...prev, [field]: undefined }))
        }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const result = resetPasswordSchema.safeParse(values)
        if (!result.success) {
            setError(zodErrors(result.error))
            return
        }
        setError({})
        try {
            await call({ token, password: result.data.password })
            setDone(true)
        } catch {
            // shown via state.error
        }
    }

    if (!token) {
        return (
            <main className="min-h-screen bg-stone-50 text-neutral-900 flex items-center justify-center px-6">
                <div className="max-w-md text-center">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                        Link expired or missing.
                    </h1>
                    <p className="mt-3 text-neutral-500">
                        Reset links are one-time-use and good for an hour. Request a new one.
                    </p>
                    <Link
                        to="/forgot-password"
                        className="mt-8 inline-flex items-center justify-center gap-2 min-h-14 px-6 rounded-full bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
                    >
                        Request a new link
                        <span aria-hidden className="text-lg">→</span>
                    </Link>
                </div>
            </main>
        )
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
                        One last step
                    </span>
                    <h2 className="mt-4 text-5xl xl:text-6xl font-black tracking-tight leading-[1.02]">
                        Pick a new password.{" "}
                        <span className="text-neutral-300">Make it count.</span>
                    </h2>
                    <p className="mt-6 text-neutral-600 leading-relaxed">
                        Use at least 8 characters. A mix of words is stronger than a string of
                        symbols.
                    </p>
                </div>

                <div
                    aria-hidden
                    className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400"
                >
                    End-to-end encrypted · Hashed at rest
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
                        Back to{" "}
                        <span className="text-neutral-900 font-medium underline underline-offset-4">
                            sign in
                        </span>
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center py-12">
                    <div className="w-full max-w-md">
                        {done ? (
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                                    Password updated.
                                </h1>
                                <p className="mt-3 text-neutral-500">
                                    You can sign in with your new password now.
                                </p>
                                <Link
                                    to="/login"
                                    className="mt-10 inline-flex items-center justify-center gap-2 min-h-14 px-6 rounded-full bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
                                >
                                    Sign in
                                    <span aria-hidden className="text-lg">→</span>
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="mb-10">
                                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                                        New password.
                                    </h1>
                                    <p className="mt-3 text-neutral-500">
                                        Use at least 8 characters.
                                    </p>
                                </div>

                                <form
                                    onSubmit={handleSubmit}
                                    noValidate
                                    className="flex flex-col gap-5"
                                >
                                    <Field
                                        id="password"
                                        label="New password"
                                        type="password"
                                        value={values.password}
                                        onChange={update("password")}
                                        autoComplete="new-password"
                                        error={error.password}
                                        disabled={state.loading}
                                    />
                                    <Field
                                        id="confirmPassword"
                                        label="Confirm password"
                                        type="password"
                                        value={values.confirmPassword}
                                        onChange={update("confirmPassword")}
                                        autoComplete="new-password"
                                        error={error.confirmPassword}
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
                                        {state.loading ? "Updating…" : "Update password"}
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

export default ResetPassword
