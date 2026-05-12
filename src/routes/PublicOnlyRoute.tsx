import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../stores/authStore"
import PageLoader from "../components/ui/PageLoader"

/**
 * Used to redirect already-logged-in users away from /login and /register.
 * If we have a persisted user hint we wait for /auth/me to confirm —
 * otherwise a stale hint would bounce real visitors to /dashboard, where
 * ProtectedRoute would then bounce them back. With the bootstrap, either
 * the cookie is good (redirect once, cleanly) or it's not (stay on /login).
 */
const PublicOnlyRoute = () => {
    const user = useAuthStore((s) => s.user)
    const bootstrapped = useAuthStore((s) => s.bootstrapped)

    // Only wait when there's a hint to verify. No hint → show the public
    // page immediately (avoids gating /login behind a network call for
    // first-time visitors).
    if (!bootstrapped && user) return <PageLoader />

    if (user) return <Navigate to="/dashboard" replace />
    return <Outlet />
}

export default PublicOnlyRoute
