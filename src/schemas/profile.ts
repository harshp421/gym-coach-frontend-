import { z } from "zod"

export const SEX = ["male", "female", "other"] as const
export const GOAL = ["cut", "maintain", "bulk", "recomp"] as const
export const ACTIVITY = [
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
] as const
export const EXPERIENCE = ["beginner", "intermediate", "advanced"] as const
export const EQUIPMENT = [
    "full_gym",
    "home_basic",
    "dumbbells_only",
    "bodyweight",
] as const
export const DIET = [
    "omnivore",
    "vegetarian",
    "vegan",
    "keto",
    "paleo",
    "other",
] as const
export const UNITS = ["metric", "imperial"] as const

export type Sex = (typeof SEX)[number]
export type Goal = (typeof GOAL)[number]
export type ActivityLevel = (typeof ACTIVITY)[number]
export type ExperienceLevel = (typeof EXPERIENCE)[number]
export type EquipmentAccess = (typeof EQUIPMENT)[number]
export type DietType = (typeof DIET)[number]
export type Units = (typeof UNITS)[number]

const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")

const heightCm = z
    .number({ message: "Height is required" })
    .positive("Must be positive")
    .max(272, "Too tall")

const weightKg = z
    .number({ message: "Weight is required" })
    .positive("Must be positive")
    .max(635, "Too heavy")

const bodyFatPct = z
    .number()
    .min(2, "Too low")
    .max(75, "Too high")

const waistCm = z.number().positive("Must be positive").max(300, "Too large")

/**
 * The full profile, as it lives on the server.
 * Returned by GET /profile and POST /profile/complete-onboarding.
 */
export const profileSchema = z.object({
    userId: z.string(),
    dateOfBirth: isoDate.nullable(),
    sex: z.enum(SEX).nullable(),
    heightCm: z.number().nullable(),
    goal: z.enum(GOAL).nullable(),
    targetWeightKg: z.number().nullable(),
    activityLevel: z.enum(ACTIVITY).nullable(),
    experienceLevel: z.enum(EXPERIENCE).nullable(),
    trainingDaysPerWeek: z.number().int().nullable(),
    equipmentAccess: z.enum(EQUIPMENT).nullable(),
    dietType: z.enum(DIET).nullable(),
    allergies: z.array(z.string()).default([]),
    dislikes: z.array(z.string()).default([]),
    timezone: z.string().nullable(),
    units: z.enum(UNITS),
    onboardingCompletedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
})

export type Profile = z.infer<typeof profileSchema>

/**
 * Partial profile updates — used for autosaving wizard progress via PUT /profile.
 * Every field optional; we only send what changed.
 */
export const profileUpdateSchema = z.object({
    dateOfBirth: isoDate.optional(),
    sex: z.enum(SEX).optional(),
    heightCm: heightCm.optional(),
    goal: z.enum(GOAL).optional(),
    targetWeightKg: weightKg.optional(),
    activityLevel: z.enum(ACTIVITY).optional(),
    experienceLevel: z.enum(EXPERIENCE).optional(),
    trainingDaysPerWeek: z.number().int().min(1).max(7).optional(),
    equipmentAccess: z.enum(EQUIPMENT).optional(),
    dietType: z.enum(DIET).optional(),
    allergies: z.array(z.string().min(1)).optional(),
    dislikes: z.array(z.string().min(1)).optional(),
    timezone: z.string().min(1).optional(),
    units: z.enum(UNITS).optional(),
})

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

/**
 * Body metric entry — POST /body-metrics.
 * Server enforces "at least one of weight/bodyFat/waist" but we mirror it here.
 */
export const bodyMetricSchema = z
    .object({
        recordedAt: isoDate.optional(),
        weightKg: weightKg.optional(),
        bodyFatPct: bodyFatPct.optional(),
        waistCm: waistCm.optional(),
        notes: z.string().max(500).optional(),
    })
    .refine(
        (m) =>
            m.weightKg !== undefined ||
            m.bodyFatPct !== undefined ||
            m.waistCm !== undefined,
        { message: "Add at least one measurement" },
    )

export type BodyMetricInput = z.infer<typeof bodyMetricSchema>

export type BodyMetric = {
    id: string
    userId: string
    recordedAt: string
    weightKg: number | null
    bodyFatPct: number | null
    waistCm: number | null
    notes: string | null
    createdAt: string
}

/**
 * Wizard final submit — POST /profile/complete-onboarding.
 * All required fields per the doc, plus the seed weight.
 * Optional: targetWeightKg, allergies, dislikes (arrays default to []).
 */
export const completeOnboardingSchema = z.object({
    dateOfBirth: isoDate,
    sex: z.enum(SEX),
    heightCm,
    goal: z.enum(GOAL),
    targetWeightKg: weightKg.optional(),
    activityLevel: z.enum(ACTIVITY),
    experienceLevel: z.enum(EXPERIENCE),
    trainingDaysPerWeek: z.number().int().min(1).max(7),
    equipmentAccess: z.enum(EQUIPMENT),
    dietType: z.enum(DIET),
    allergies: z.array(z.string().min(1)).default([]),
    dislikes: z.array(z.string().min(1)).default([]),
    timezone: z.string().min(1, "Timezone is required"),
    units: z.enum(UNITS).default("metric"),

    // Seed body metric — first row in body_metrics, written atomically.
    initialWeightKg: weightKg,
})

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>
