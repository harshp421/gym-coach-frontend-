import { Outlet } from "react-router-dom"
import { useAuthStore } from "../stores/authStore"
import VerifyEmailRequired from "../pages/auth/VerifyEmailRequired"
import PageLoader from "../components/ui/PageLoader"

/**
 * Sits below OnboardingGate. Blocks every authenticated route until the
 * user has verified their email. By design this renders the verification
 * screen *as* the route — there's no underlying app rendered behind it,
 * so the user can't bypass the gate by removing a modal via CSS.
 *
 * /onboarding intentionally lives OUTSIDE this gate so a user finishing
 * the wizard isn't trapped before they've finished telling us about
 * themselves.
 */
const EmailVerifiedGate = () => {
    const user = useAuthStore((s) => s.user)
    const bootstrapped = useAuthStore((s) => s.bootstrapped)

    if (!bootstrapped) return <PageLoader />

    // ProtectedRoute already handles missing user; defensive return here.
    if (!user) return <PageLoader />

    if (!user.emailVerified) {
        return <VerifyEmailRequired />
    }

    return <Outlet />
}

export default EmailVerifiedGate
