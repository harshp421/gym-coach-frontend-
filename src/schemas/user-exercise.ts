import { z } from "zod"

export type UserExercise = {
    id: string
    userId: string
    name: string
    slug: string
    primaryMuscles: string[]
    secondaryMuscles: string[]
    equipment: string | null
    mechanic: "compound" | "isolation" | null
    level: "beginner" | "intermediate" | "advanced"
    instructions: string[]
    demoUrl: string | null
    archivedAt: string | null
    createdAt: string
    updatedAt: string
}

const NAME = z.string().trim().min(1, "Name can't be empty").max(80, "Too long")
const MUSCLE = z.string().trim().min(1).max(40)

export const userExerciseSchema = z.object({
    name: NAME,
    primaryMuscles: z.array(MUSCLE).min(1, "Pick at least one muscle").max(5),
    secondaryMuscles: z.array(MUSCLE).max(10).default([]),
    equipment: z.string().trim().max(40).optional(),
    mechanic: z.enum(["compound", "isolation"]).nullable().optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
    instructions: z.array(z.string().trim().min(1).max(1000)).max(20).default([]),
    demoUrl: z.string().trim().url().max(500).nullable().optional(),
})
export type UserExerciseInput = z.infer<typeof userExerciseSchema>

// Common preset chips for the muscle inputs.
export const MUSCLE_PRESETS = [
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "forearms",
    "abdominals",
    "obliques",
    "quadriceps",
    "hamstrings",
    "glutes",
    "calves",
    "lats",
    "traps",
] as const
