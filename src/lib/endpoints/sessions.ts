import { api } from "../api"
import type {
    ExerciseHistoryEntry,
    LogSetInput,
    SetLog,
    WorkoutSession,
    WorkoutSessionListItem,
    WorkoutSessionWithSets,
} from "../../schemas/session"

export type CreateSessionResponse = { session: WorkoutSession }
export type GetActiveResponse = { session: WorkoutSessionWithSets | null }
export type GetSessionResponse = { session: WorkoutSessionWithSets }
export type CompleteSessionResponse = { session: WorkoutSession }
export type LogSetResponse = { setLog: SetLog }
export type ListRecentResponse = {
    items: WorkoutSessionListItem[]
    nextBefore: string | null
}
export type ExerciseHistoryResponse = { items: ExerciseHistoryEntry[] }

export const sessionsApi = {
    create: (planDayId: string) =>
        api.post<CreateSessionResponse>("/workouts/sessions", {
            body: { planDayId },
        }),

    getActive: () =>
        api.get<GetActiveResponse>("/workouts/sessions/active"),

    get: (id: string) =>
        api.get<GetSessionResponse>("/workouts/sessions/{id}", {
            params: { id },
        }),

    complete: (id: string, notes?: string) =>
        api.patch<CompleteSessionResponse>(
            "/workouts/sessions/{id}/complete",
            { params: { id }, body: { notes } },
        ),

    abandon: (id: string) =>
        api.delete<void>("/workouts/sessions/{id}", { params: { id } }),

    logSet: (sessionId: string, body: LogSetInput) =>
        api.post<LogSetResponse>("/workouts/sessions/{id}/sets", {
            params: { id: sessionId },
            body,
        }),

    deleteSet: (sessionId: string, setLogId: string) =>
        api.delete<void>("/workouts/sessions/{id}/sets/{setLogId}", {
            params: { id: sessionId, setLogId },
        }),

    listRecent: (query: { limit?: number; before?: string } = {}) =>
        api.get<ListRecentResponse>("/workouts/sessions", { query }),

    exerciseHistory: (planExerciseId: string, query: { limit?: number } = {}) =>
        api.get<ExerciseHistoryResponse>(
            "/workouts/exercises/{planExerciseId}/history",
            { params: { planExerciseId }, query },
        ),
}
