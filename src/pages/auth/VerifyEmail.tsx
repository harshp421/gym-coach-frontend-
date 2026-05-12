import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { authApi } from "../../lib/endpoints/auth"
import { useQuery } from "../../hooks/useQuery"
import { useAuthStore } from "../../stores/authStore"

const dotPattern: React.CSSProperties = {
    backgroundImage: "radial-gradient(circle, #d6d3d1 1.2px, transparent 1.2px)",
    backgroundSize: "22px 22px",
}

function VerifyEmail() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token") ?? ""
    const ran = useRef(false)
    const user = useAuthStore((s) => s.user)

    const { state, call } = useQuery(authApi.verifyEmail)
    const [resentAt, setResentAt] = useState<number | null>(null)
    const { state: resendState, call: resend } = useQuery(authApi.resendVerification)

    useEffect(() => {
        if (!token || ran.current) return
        ran.current = true
        call(token).catch(() => {
            // shown via state.error
        })
    }, [token, call])

    const handleResend = async () => {
        try {
            await resend()
            setResentAt(Date.now())
        } catch {
            // shown via resendState.error
        }
    }

    if (!token) {
        return <Shell title="Missing link." body={<MissingLink />} />
    }

    return (
        <Shell
            title={
                state.loading
                    ? "Verifying…"
                    : state.data
                      ? "Email verified."
                      : "Couldn't verify."
            }
            body={
                state.loading ? (
                    <p className="mt-3 text-neutral-500">
                        Hang tight — confirming your email address.
                    </p>
                ) : state.data ? (
                    <Verified />
                ) : (
                    <FailedToVerify
                        message={
                            state.error?.userMessage ||
                            state.error?.message ||
                            "This link is invalid or expired."
                        }
                        canResend={!!user}
                        onResend={handleResend}
                        loading={resendState.loading}
                        resentAt={resentAt}
                        resendError={
                            resendState.error?.userMessage ||
                            resendState.error?.message ||
                            null
                        }
                    />
                )
            }
        />
    )
}

function Verified() {
    return (
        <>
            <p className="mt-3 text-neutral-500">
                Your email is confirmed. You can sign in now.
            </p>
            <Link
                to="/login"
                className="mt-10 inline-flex items-center justify-center gap-2 min-h-14 px-6 rounded-full bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
            >
                Sign in
                <span aria-hidden className="text-lg">→</span>
            </Link>
        </>
    )
}

function FailedToVerify({
    message,
    canResend,
    onResend,
    loading,
    resentAt,
    resendError,
}: {
    message: string
    canResend: boolean
    onResend: () => void
    loading: boolean
    resentAt: number | null
    resendError: string | null
}) {
    return (
        <>
            <p className="mt-3 text-neutral-500">{message}</p>

            <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5">
                {canResend ? (
                    <>
                        <p className="text-sm text-neutral-600">
                            Send a fresh verification link to your account email.
                        </p>

                        {resendError && (
                            <div
                                role="alert"
                                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                            >
                                {resendError}
                            </div>
                        )}

                        {resentAt && !resendError && (
                            <div
                                role="status"
                                className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                            >
                                Sent. Give it a minute.
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onResend}
                            disabled={loading}
                            className="mt-4 inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-full border border-neutral-900 text-neutral-900 font-semibold active:scale-[0.98] transition-all hover:bg-neutral-900 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? "Sending…" : "Resend verification email"}
                        </button>
                    </>
                ) : (
                    <p className="text-sm text-neutral-600">
                        Sign in first, then we can send you a new verification link.
                    </p>
                )}
            </div>

            <p className="mt-6 text-sm text-neutral-500">
                <Link
                    to="/login"
                    className="text-neutral-900 font-medium underline underline-offset-4"
                >
                    Back to sign in
                </Link>
            </p>
        </>
    )
}

function MissingLink() {
    return (
        <>
            <p className="mt-3 text-neutral-500">
                The verification link is missing or malformed. Open the latest email we sent
                you, or sign in and request a new one.
            </p>
            <Link
                to="/login"
                className="mt-10 inline-flex items-center justify-center gap-2 min-h-14 px-6 rounded-full bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
            >
                Back to sign in
                <span aria-hidden className="text-lg">→</span>
            </Link>
        </>
    )
}

function Shell({ title, body }: { title: string; body: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900 grid lg:grid-cols-2">
            <aside
                className="relative hidden lg:flex flex-col justify-between px-12 py-10"
                style={dotPattern}
            >
                <Link to="/" className="flex items-baseline gap-3">
                    <span className="text-xl font-black tracking-tight">GC</span>
                    <span className="text-xs text-neutral-400 font-medium tabular-nums">
                        v0.1
                    </span>
                </Link>

                <div className="max-w-md">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                        One last step
                    </span>
                    <h2 className="mt-4 text-5xl xl:text-6xl font-black tracking-tight leading-[1.02]">
                        Confirm it's you.{" "}
                        <span className="text-neutral-300">Then we can start.</span>
                    </h2>
                    <p className="mt-6 text-neutral-600 leading-relaxed">
                        Email verification keeps your plan, logs, and progress tied to an
                        address you actually own.
                    </p>
                </div>

                <div
                    aria-hidden
                    className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400"
                >
                    One-time use · Expires in 1h
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
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                            {title}
                        </h1>
                        {body}
                    </div>
                </div>
            </section>
        </main>
    )
}

export default VerifyEmail
