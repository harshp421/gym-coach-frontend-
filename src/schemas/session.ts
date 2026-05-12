import { z } from "zod"

// Mirrored from backend/src/features/workouts/sessions.types.ts. Date fields
// arrive as ISO strings.
export type WorkoutSession = {
    id: string
    userId: string
    planId: string
    planDayId: string
    startedAt: string
    completedAt: string | null
    notes: string | null
    createdAt: string
    updatedAt: string
}

export type SetLog = {
    id: string
    sessionId: string
    planExerciseId: string
    setNumber: number
    weightKg: number | null
    reps: number
    rpe: number | null
    notes: string | null
    loggedAt: string
}

// Set log + PR flag — only returned by the per-exercise history endpoint.
export type SetLogWithPr = SetLog & { isPr: boolean }

export type WorkoutSessionWithSets = WorkoutSession & { sets: SetLog[] }

export type SessionSummary = {
    totalSets: number
    totalReps: number
    totalVolumeKg: number
}

export type WorkoutSessionListItem = WorkoutSession & { summary: SessionSummary }

export type ExerciseHistoryEntry = {
    sessionId: string
    startedAt: string
    completedAt: string | null
    sets: SetLogWithPr[]
}

// POST /workouts/sessions/:id/sets — UPSERT body
export const logSetSchema = z.object({
    planExerciseId: z.string().uuid("Invalid exercise"),
    setNumber: z.number().int().min(1).max(50),
    weightKg: z.number().min(0).max(1000).optional(),
    reps: z
        .number({ message: "How many reps?" })
        .int()
        .min(1, "At least 1 rep")
        .max(500),
    rpe: z.number().min(1).max(10).optional(),
    notes: z.string().max(500).optional(),
})
export type LogSetInput = z.infer<typeof logSetSchema>
