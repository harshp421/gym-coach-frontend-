import { useEffect, useRef } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useProfileStore } from "../stores/profileStore"
import { useQuery } from "../hooks/useQuery"
import { profileApi } from "../lib/endpoints/profile"

/**
 * Sits inside ProtectedRoute. Bootstraps the profile once per session and
 * keeps the user on /onboarding until they finish, then keeps them off it.
 */
const OnboardingGate = () => {
    const location = useLocation()
    const profile = useProfileStore((s) => s.profile)
    const completedOnboarding = useProfileStore((s) => s.completedOnboarding)
    const setProfile = useProfileStore((s) => s.setProfile)

    const { state, call: fetchProfile } = useQuery(profileApi.get)
    const fetched = useRef(false)

    useEffect(() => {
        if (fetched.current) return
        if (profile && completedOnboarding) return
        fetched.current = true
        fetchProfile()
            .then((res) => setProfile(res.profile, res.completedOnboarding))
            .catch(() => {
                // 404 / network / 401 — leave store as-is.
                // 401 already clears auth via api.ts onUnauthorized.
            })
    }, [profile, completedOnboarding, fetchProfile, setProfile])

    if (state.loading && !profile) {
        return (
            <main className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-neutral-500">
                Loading your profile…
            </main>
        )
    }

    const onOnboardingPath = location.pathname === "/onboarding"

    if (!completedOnboarding && !onOnboardingPath) {
        return <Navigate to="/onboarding" replace />
    }
    if (completedOnboarding && onOnboardingPath) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}

export default OnboardingGate
