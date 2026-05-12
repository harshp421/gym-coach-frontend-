import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { GOOGLE_CLIENT_ID, loadGoogleIdentity } from "../../lib/google"
import { authApi } from "../../lib/endpoints/auth"
import { useAuthStore } from "../../stores/authStore"
import { useQuery } from "../../hooks/useQuery"
import { cache } from "../../lib/cache"

type Props = {
    label?: "signin_with" | "signup_with" | "continue_with"
    redirectTo?: string
}

function GoogleSignInButton({ label = "continue_with", redirectTo = "/dashboard" }: Props) {
    const navigate = useNavigate()
    const setUser = useAuthStore((s) => s.setUser)
    const containerRef = useRef<HTMLDivElement>(null)
    const [scriptError, setScriptError] = useState<string | null>(null)
    const { state, call } = useQuery(authApi.oauth)

    useEffect(() => {
        const clientId = GOOGLE_CLIENT_ID
        if (!clientId) {
            setScriptError("Google sign-in not configured")
            return
        }
        let cancelled = false

        if (import.meta.env.DEV) {
            // The 401 invalid_client error from Google's popup means this
            // pair isn't registered in the Cloud Console — log them so you
            // can copy/paste into Authorized JavaScript origins.
            console.info(
                `[google] client_id=${clientId} origin=${window.location.origin}`,
            )
        }

        loadGoogleIdentity()
            .then(() => {
                if (cancelled || !containerRef.current || !window.google) return
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: async (response) => {
                        try {
                            const { user } = await call("google", response.credential)
                            // Drop any stale cache from a prior session.
                            cache.clear()
                            setUser(user)
                            navigate(redirectTo, { replace: true })
                        } catch {
                            // surfaced via state.error
                        }
                    },
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    ux_mode: "popup",
                })
                window.google.accounts.id.renderButton(containerRef.current, {
                    type: "standard",
                    theme: "outline",
                    size: "large",
                    text: label,
                    shape: "pill",
                    logo_alignment: "center",
                    width: containerRef.current.offsetWidth || 320,
                })
            })
            .catch((err: Error) => {
                if (!cancelled) setScriptError(err.message)
            })

        return () => {
            cancelled = true
        }
    }, [call, setUser, navigate, redirectTo, label])

    if (scriptError) {
        return (
            <div className="text-xs text-neutral-500 text-center">
                {scriptError === "Google sign-in not configured"
                    ? "Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in."
                    : scriptError}
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                ref={containerRef}
                className="w-full flex justify-center"
                aria-busy={state.loading}
            />
            {state.loading && (
                <span className="text-xs text-neutral-500">Signing you in…</span>
            )}
            {state.error && (
                <span className="text-xs text-red-600">
                    {state.error.userMessage || state.error.message}
                </span>
            )}
        </div>
    )
}

export default GoogleSignInButton
