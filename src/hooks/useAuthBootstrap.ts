import { useEffect } from "react"
import { authApi } from "../lib/endpoints/auth"
import { ApiError } from "../lib/api"
import { cache } from "../lib/cache"
import { clearAllUserState, useAuthStore } from "../stores/authStore"
import { useProfileStore } from "../stores/profileStore"

// Module-level so multiple components mounting the hook in the same page
// load don't fire /auth/me more than once.
let inFlight = false

/**
 * Fires `GET /auth/me` once per page load to validate the persisted user
 * against the server-side session cookie. Without this, anyone landing on
 * a browser that previously held a different user's localStorage would be
 * treated as that user — the cookie may be gone but the hint isn't.
 *
 * Call from App.tsx so it runs exactly once at the root.
 */
export function useAuthBootstrap(): void {
    const bootstrapped = useAuthStore((s) => s.bootstrapped)

    useEffect(() => {
        if (bootstrapped || inFlight) return
        inFlight = true

        authApi
            .me()
            .then((res) => {
                if (res.user) {
                    const current = useAuthStore.getState().user
                    // Identity drift: persisted hint was for a different user
                    // than the cookie actually points at. Wipe per-user caches
                    // so we don't show stale profile/plan/sessions for the
                    // previous user.
                    if (current && current.id !== res.user.id) {
                        useProfileStore.getState().clearProfile()
                        cache.clear()
                    }
                    useAuthStore.getState().setUser(res.user)
                } else {
                    // /auth/me should return user or 401 — defensive fallback.
                    clearAllUserState()
                }
            })
            .catch((err: unknown) => {
                if (err instanceof ApiError && err.statusCode === 401) {
                    // 401: cookie is gone or invalid. onUnauthorized in
                    // authStore already cleared state; this is a no-op safety net.
                    clearAllUserState()
                }
                // Other errors (network, 5xx) — leave the persisted state
                // intact so offline users still see their dashboard. They'll
                // hit fresh 401s only when the network comes back, at which
                // point onUnauthorized cleans up.
            })
            .finally(() => {
                inFlight = false
                if (!useAuthStore.getState().bootstrapped) {
                    useAuthStore.getState().setBootstrapped()
                }
            })
    }, [bootstrapped])
}
