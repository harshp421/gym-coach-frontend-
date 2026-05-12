import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "../stores/authStore"
import PageLoader from "../components/ui/PageLoader"

/**
 * Gate for authenticated routes. Trusts ONLY the server-validated user,
 * not the persisted hint — so a browser holding a previous user's
 * localStorage with no valid cookie gets bounced to /login, not silently
 * onboarded as the stale identity.
 */
const ProtectedRoute = () => {
    const user = useAuthStore((s) => s.user)
    const bootstrapped = useAuthStore((s) => s.bootstrapped)
    const location = useLocation()

    if (!bootstrapped) {
        return <PageLoader />
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />
    }
    return <Outlet />
}

export default ProtectedRoute
