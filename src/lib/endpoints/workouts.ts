import { api } from "../api"
import type {
    PlanDay,
    PlanExercise,
    SwapExerciseInput,
    WorkoutPlan,
} from "../../schemas/workout"

/**
 * GET /workouts/plan
 * Returns the user's current active plan (with all days + exercises hydrated),
 * or null if they haven't generated one yet.
 */
export type GetPlanResponse = { plan: WorkoutPlan | null }

/**
 * GET /workouts/plan/today
 * Returns today's day if a plan exists, else null. The doc says: "the day
 * matching today's weekday, or the next unfinished day".
 */
export type GetTodayResponse = { day: PlanDay | null }

export type GeneratePlanResponse = { plan: WorkoutPlan }

export type SwapExerciseResponse = { planExercise: PlanExercise }

export const workoutsApi = {
    getPlan: () => api.get<GetPlanResponse>("/workouts/plan"),

    generatePlan: () =>
        api.post<GeneratePlanResponse>("/workouts/plan/generate"),

    aiGeneratePlan: () =>
        api.post<GeneratePlanResponse>("/workouts/plan/ai-generate"),

    getToday: () => api.get<GetTodayResponse>("/workouts/plan/today"),

    swapExercise: (planExerciseId: string, body: SwapExerciseInput) =>
        api.patch<SwapExerciseResponse>(
            "/workouts/plan/exercises/{planExerciseId}",
            { params: { planExerciseId }, body },
        ),
}
