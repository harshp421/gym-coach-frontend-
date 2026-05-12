import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { authApi } from "../../lib/endpoints/auth"
import { clearAllUserState, useAuthStore } from "../../stores/authStore"
import { toast } from "../../stores/toastStore"
import Spinner from "../../components/ui/Spinner"

// Background poll cadence. Eight seconds keeps the "I verified in another
// tab" experience tight without hammering /auth/me.
const POLL_INTERVAL_MS = 8_000

// Backend already enforces ~60s server-side via the rateLimit("auth")
// bucket; we mirror it on the client so the button shows a useful timer
// instead of just bouncing off the 429.
const RESEND_COOLDOWN_S = 60

/**
 * Full-screen "verify your email" page. Looks like a modal but IS the
 * entire route — nothing else is rendered behind it. CSS tampering won't
 * reveal a dashboard because no dashboard is in the React tree.
 */
function VerifyEmailRequired() {
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)
    const setUser = useAuthStore((s) => s.setUser)

    const [resending, setResending] = useState(false)
    const [checking, setChecking] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(0)

    // Cooldown countdown — ticks once a second when active.
    useEffect(() => {
        if (secondsLeft <= 0) return
        const id = window.setInterval(() => {
            setSecondsLeft((s) => Math.max(0, s - 1))
        }, 1000)
        return () => window.clearInterval(id)
    }, [secondsLeft])

    // Auto-detect verification done in another tab. When /auth/me returns
    // emailVerified populated, the gate above flips to <Outlet /> and the
    // user lands on the dashboard without lifting a finger here.
    useEffect(() => {
        if (!user || user.emailVerified) return
        const id = window.setInterval(async () => {
            try {
                const res = await authApi.me()
                if (res.user.emailVerified) {
                    setUser(res.user)
                }
            } catch {
                // 401s already clear state via api.ts onUnauthorized.
            }
        }, POLL_INTERVAL_MS)
        return () => window.clearInterval(id)
    }, [user, setUser])

    const handleCheck = async () => {
        if (checking) return
        setChecking(true)
        try {
            const res = await authApi.me()
            if (res.user.emailVerified) {
                setUser(res.user)
                toast.success("Verified — welcome in.")
            } else {
                toast.info("Not yet — check your inbox.")
            }
        } catch {
            toast.error("Couldn't check status. Try again.")
        } finally {
            setChecking(false)
        }
    }

    const handleResend = async () => {
        if (resending || secondsLeft > 0) return
        setResending(true)
        try {
            await authApi.resendVerification()
            setSecondsLeft(RESEND_COOLDOWN_S)
            toast.success(`Sent another link to ${user?.email ?? "you"}.`)
        } catch (err) {
            const msg =
                (err as { userMessage?: string; message?: string })
                    ?.userMessage ||
                (err as Error)?.message ||
                "Couldn't resend right now"
            toast.error(msg)
        } finally {
            setResending(false)
        }
    }

    const handleSignOut = async () => {
        try {
            await authApi.logout()
        } catch {
            // Even if the server call fails, we still want to drop local state.
        }
        clearAllUserState()
        navigate("/", { replace: true })
    }

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md rounded-3xl bg-white border border-neutral-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.18)] p-8 sm:p-10">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    One last step
                </span>
                <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight leading-[1.05]">
                    Verify your email.
                </h1>
                <p className="mt-4 text-neutral-600 leading-relaxed">
                    We sent a verification link to{" "}
                    <span className="font-semibold text-neutral-900 break-all">
                        {user?.email ?? "your email"}
                    </span>
                    . Open it on this device to continue.
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                    Already clicked it? We'll detect it within a few seconds.
                </p>

                <div className="mt-8 flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={handleCheck}
                        disabled={checking}
                        className="inline-flex items-center justify-center gap-2 min-h-14 px-6 rounded-full bg-neutral-900 text-white font-semibold active:scale-[0.98] transition-all hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {checking && <Spinner size="sm" />}
                        {checking ? "Checking…" : "I verified — check now"}
                        {!checking && <span aria-hidden className="text-lg">→</span>}
                    </button>
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending || secondsLeft > 0}
                        className="inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-full border border-neutral-300 text-neutral-900 text-sm font-semibold hover:border-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {resending && <Spinner size="sm" />}
                        {secondsLeft > 0
                            ? `Resend in ${secondsLeft}s`
                            : resending
                              ? "Sending…"
                              : "Resend link"}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-4"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </main>
    )
}

export default VerifyEmailRequired
