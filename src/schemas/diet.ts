import { z } from "zod"

// Mirrored from backend/src/features/diet/diet.types.ts + diet.schemas.ts.
// Kept in sync manually for now; if either side drifts, the questionnaire
// 400s with a clear field error and we know to update.

export type CookingTime = "quick" | "moderate" | "leisurely"
export type BudgetTier = "budget" | "mid" | "premium"

export const ALLOWED_CUISINES = [
    "indian",
    "mediterranean",
    "american",
    "asian",
    "mexican",
    "italian",
    "middle_eastern",
    "other",
] as const

export type Cuisine = (typeof ALLOWED_CUISINES)[number]

export type DietPreferences = {
    userId: string
    mealsPerDay: number
    cookingTime: CookingTime
    cuisines: Cuisine[]
    budgetTier: BudgetTier
    favoriteFoods: string[]
    includeSnacks: boolean
    completedAt: string | null
    createdAt: string
    updatedAt: string
}

export type Meal = {
    dayIndex: number
    slot: string
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    ingredients: string[]
    prepNotes: string | null
}

export type DietPlan = {
    id: string
    userId: string
    status: "active" | "archived"
    calorieTarget: number
    proteinTargetG: number
    carbTargetG: number
    fatTargetG: number
    notes: string | null
    meals: Meal[]
    generatedAt: string
    createdAt: string
    updatedAt: string
}

// Questionnaire form schema — matches backend completePreferencesSchema.
export const completePreferencesSchema = z.object({
    mealsPerDay: z.number().int().min(2, "Pick 2 or more").max(6),
    cookingTime: z.enum(["quick", "moderate", "leisurely"], {
        message: "Pick a cooking time",
    }),
    cuisines: z.array(z.enum(ALLOWED_CUISINES)).max(8),
    budgetTier: z.enum(["budget", "mid", "premium"], {
        message: "Pick a budget",
    }),
    favoriteFoods: z.array(z.string().min(1).max(40)).max(20),
    includeSnacks: z.boolean(),
})

export type CompletePreferencesInput = z.infer<
    typeof completePreferencesSchema
>
