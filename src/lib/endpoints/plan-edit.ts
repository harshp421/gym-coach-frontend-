import { api, ApiError } from "../api"
import type { Goal, WorkoutPlan } from "../../schemas/workout"

// All plan-edit mutations return the full hydrated plan so the UI can
// drop it straight into the cache without a follow-up read.
export type PlanResponse = { plan: WorkoutPlan }

// ---------------------------------------------------------------------------
// Plan-level
// ---------------------------------------------------------------------------

export type UpdatePlanInput = {
    name?: string | null
    notes?: string | null
    goal?: Goal
}

export type CreateEmptyPlanInput = { name?: string }

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------

export type CreateDayInput = {
    name: string
    weekdayHint?: number | null
}

export type UpdateDayInput = {
    name?: string
    weekdayHint?: number | null
}

export type ReorderDaysInput = Array<{ dayId: string; dayIndex: number }>

// ---------------------------------------------------------------------------
// Exercises within a day
// ---------------------------------------------------------------------------

// Provide exactly one of `exerciseId` (built-in) or `userExerciseId`
// (user-authored). Backend rejects both/neither.
export type CreateExerciseInput = {
    exerciseId?: string
    userExerciseId?: string
    targetSets: number
    targetRepsMin: number
    targetRepsMax: number
    targetRpe?: number | null
    restSeconds?: number | null
    notes?: string | null
}

// PATCH on a plan_exercise — partial. Pass `exerciseId` or
// `userExerciseId` (not both) to swap; any of the other fields to edit.
export type UpdateExerciseInput = {
    exerciseId?: string
    userExerciseId?: string
    targetSets?: number
    targetRepsMin?: number
    targetRepsMax?: number
    targetRpe?: number | null
    restSeconds?: number | null
    notes?: string | null
}

export type ReorderExercisesInput = Array<{
    planExerciseId: string
    position: number
}>

export const planEditApi = {
    // Plan-level
    updatePlan: (body: UpdatePlanInput) =>
        api.patch<PlanResponse>("/workouts/plan", { body }),
    createEmptyPlan: (body: CreateEmptyPlanInput = {}) =>
        api.post<PlanResponse>("/workouts/plan/empty", { body }),
    deletePlan: () => api.delete<void>("/workouts/plan"),

    // Days
    createDay: (body: CreateDayInput) =>
        api.post<PlanResponse>("/workouts/plan/days", { body }),
    updateDay: (dayId: string, body: UpdateDayInput) =>
        api.patch<PlanResponse>("/workouts/plan/days/{dayId}", {
            params: { dayId },
            body,
        }),
    deleteDay: (dayId: string) =>
        api.delete<PlanResponse>("/workouts/plan/days/{dayId}", {
            params: { dayId },
        }),
    reorderDays: (body: ReorderDaysInput) =>
        api.post<PlanResponse>("/workouts/plan/days/reorder", { body }),

    // Exercises
    createExercise: (dayId: string, body: CreateExerciseInput) =>
        api.post<PlanResponse>("/workouts/plan/days/{dayId}/exercises", {
            params: { dayId },
            body,
        }),
    updateExercise: (planExerciseId: string, body: UpdateExerciseInput) =>
        api.patch<PlanResponse>(
            "/workouts/plan/exercises/{planExerciseId}",
            { params: { planExerciseId }, body },
        ),
    deleteExercise: (planExerciseId: string) =>
        api.delete<PlanResponse>(
            "/workouts/plan/exercises/{planExerciseId}",
            { params: { planExerciseId } },
        ),
    reorderExercises: (dayId: string, body: ReorderExercisesInput) =>
        api.post<PlanResponse>(
            "/workouts/plan/days/{dayId}/exercises/reorder",
            { params: { dayId }, body },
        ),
}

// ---------------------------------------------------------------------------
// Conflict helpers — discriminate the two known 409s the plan-edit
// surface emits. Backend returns:
//   { error: "session_in_progress", sessionId: "..." }
//   { error: "exercise_has_logs" }
// ---------------------------------------------------------------------------

export type SessionInProgress = { kind: "session_in_progress"; sessionId: string }

export function detectSessionInProgress(err: unknown): SessionInProgress | null {
    if (!(err instanceof ApiError) || err.statusCode !== 409) return null
    const data = err.data as { error?: string; sessionId?: string } | null
    if (data?.error === "session_in_progress" && typeof data.sessionId === "string") {
        return { kind: "session_in_progress", sessionId: data.sessionId }
    }
    return null
}

export function isExerciseHasLogs(err: unknown): boolean {
    if (!(err instanceof ApiError) || err.statusCode !== 409) return false
    const data = err.data as { error?: string } | null
    return data?.error === "exercise_has_logs"
}
