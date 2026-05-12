import { z } from "zod"

// Mirrored from backend/src/features/exercises/exercises.types.ts.
// Exercises are read-only; no zod validation needed for inputs, just types.
export type ExerciseLevel = "beginner" | "intermediate" | "advanced"
export type ExerciseMechanic = "compound" | "isolation"
export type ExerciseForce = "push" | "pull" | "static"
export type ExerciseOrigin = "system" | "user"

export type Exercise = {
    id: string
    externalId: string | null
    slug: string
    name: string
    force: ExerciseForce | null
    level: ExerciseLevel
    mechanic: ExerciseMechanic | null
    equipment: string | null
    category: string
    primaryMuscles: string[]
    secondaryMuscles: string[]
    instructions: string[]
    imageUrls: string[]
    origin: ExerciseOrigin
    /** Populated by the gallery feed; absent on picker list / detail. */
    likedByMe?: boolean
    createdAt: string
    updatedAt: string
}

// Mirrored from backend/src/features/workouts/workout.types.ts (Date → string
// across the wire).
export type SplitType =
    | "full_body"
    | "upper_lower"
    | "push_pull_legs"
    | "bro_split"
    | "custom"

export type Goal = "cut" | "maintain" | "bulk" | "recomp"

export type PlanExercise = {
    id: string
    planDayId: string
    position: number
    targetSets: number
    targetRepsMin: number
    targetRepsMax: number
    targetRpe: number | null
    restSeconds: number | null
    notes: string | null
    exercise: Exercise
}

export type PlanDay = {
    id: string
    planId: string
    dayIndex: number
    name: string
    weekdayHint: number | null
    exercises: PlanExercise[]
}

export type WorkoutPlan = {
    id: string
    userId: string
    status: "active" | "archived"
    splitType: SplitType
    daysPerWeek: number
    goal: Goal
    name: string | null
    notes: string | null
    generatedAt: string
    createdAt: string
    updatedAt: string
    days: PlanDay[]
}

// PATCH /workouts/plan/exercises/:id
export const swapExerciseSchema = z.object({
    exerciseId: z.string().uuid("Invalid exercise id"),
})
export type SwapExerciseInput = z.infer<typeof swapExerciseSchema>

// Display helpers — small enough to live with the schema.
export const SPLIT_LABEL: Record<SplitType, string> = {
    full_body: "Full body",
    upper_lower: "Upper / Lower",
    push_pull_legs: "Push / Pull / Legs",
    bro_split: "Bro split",
    custom: "Custom",
}
