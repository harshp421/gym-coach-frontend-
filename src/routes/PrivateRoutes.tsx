import { Route } from "react-router-dom"
import ProtectedRoute from "./ProtectedRoute"
import OnboardingGate from "./OnboardingGate"
import EmailVerifiedGate from "./EmailVerifiedGate"
import Onboarding from "../pages/onboarding/Onboarding"
import Dashboard from "../pages/Dashboard"
import PlanView from "../pages/workouts/PlanView"
import TodayView from "../pages/workouts/TodayView"
import DayView from "../pages/workouts/DayView"
import SessionView from "../pages/workouts/SessionView"
import ExerciseDetail from "../pages/exercises/ExerciseDetail"
import MyExercises from "../pages/exercises/MyExercises"
import Gallery from "../pages/gallery/Gallery"
import DietPlanView from "../pages/diet/DietPlan"
import DietQuestionnaire from "../pages/diet/DietQuestionnaire"
import ProgressView from "../pages/progress/ProgressView"
import CoachView from "../pages/coach/CoachView"
import ProfileView from "../pages/profile/ProfileView"

// Layered gates:
//   ProtectedRoute    — must be authed (cookie)
//     OnboardingGate  — must have finished onboarding (or be on /onboarding)
//       Onboarding    — exempt from EmailVerifiedGate so the user can
//                       complete the wizard right after register
//       EmailVerifiedGate — must have verified email → blocks dashboard+
const privateRoutes = [
    <Route key="protected" element={<ProtectedRoute />}>
        <Route element={<OnboardingGate />}>
            <Route path="/onboarding" element={<Onboarding />} />

            <Route element={<EmailVerifiedGate />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/workouts/plan" element={<PlanView />} />
                <Route path="/workouts/today" element={<TodayView />} />
                <Route path="/workouts/day/:dayIndex" element={<DayView />} />
                <Route path="/workouts/sessions/:id" element={<SessionView />} />
                <Route path="/exercises/mine" element={<MyExercises />} />
                <Route path="/exercises/:slug" element={<ExerciseDetail />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/diet" element={<DietPlanView />} />
                <Route path="/diet/questionnaire" element={<DietQuestionnaire />} />
                <Route path="/progress" element={<ProgressView />} />
                <Route path="/coach" element={<CoachView />} />
                <Route path="/profile" element={<ProfileView />} />
            </Route>
        </Route>
    </Route>,
]

export default privateRoutes
