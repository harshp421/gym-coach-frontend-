import { api } from "../api"
import type {
    CompletePreferencesInput,
    DietPlan,
    DietPreferences,
} from "../../schemas/diet"

export type GetPreferencesResponse = {
    preferences: DietPreferences
    hasAnswered: boolean
}

export type PreferencesResponse = { preferences: DietPreferences }
export type PlanResponse = { plan: DietPlan | null }
export type GeneratePlanResponse = { plan: DietPlan }

export const dietApi = {
    getPreferences: () =>
        api.get<GetPreferencesResponse>("/diet/preferences"),

    updatePreferences: (body: Partial<CompletePreferencesInput>) =>
        api.put<PreferencesResponse>("/diet/preferences", { body }),

    completePreferences: (body: CompletePreferencesInput) =>
        api.post<PreferencesResponse>("/diet/preferences/complete", { body }),

    getPlan: () => api.get<PlanResponse>("/diet/plan"),

    // Long call (~10–15s on Groq). Caller is responsible for showing a
    // loading state — useQuery's `loading` flag works fine for this.
    generatePlan: () =>
        api.post<GeneratePlanResponse>("/diet/plan/generate", {}),
}
