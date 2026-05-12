import { api } from "../api"
import type {
    BodyMetric,
    BodyMetricInput,
    CompleteOnboardingInput,
    Profile,
    ProfileUpdate,
} from "../../schemas/profile"

export type GetProfileResponse = {
    profile: Profile
    completedOnboarding: boolean
}

export type CompleteOnboardingResponse = {
    profile: Profile
    bodyMetric: BodyMetric
}

export type ListBodyMetricsQuery = {
    limit?: number
    before?: string // ISO date
}

// Mirrors backend response shape exactly: `{ metrics }` for the list and
// `{ metric }` for the single create result.
export type ListBodyMetricsResponse = {
    metrics: BodyMetric[]
}

export type CreateBodyMetricResponse = {
    metric: BodyMetric
}

export const profileApi = {
    get: () => api.get<GetProfileResponse>("/profile"),

    update: (body: ProfileUpdate) =>
        api.put<{ profile: Profile }>("/profile", { body }),

    completeOnboarding: (body: CompleteOnboardingInput) =>
        api.post<CompleteOnboardingResponse>("/profile/complete-onboarding", {
            body,
        }),
}

export const bodyMetricsApi = {
    list: (query: ListBodyMetricsQuery = {}) =>
        api.get<ListBodyMetricsResponse>("/body-metrics", { query }),

    create: (body: BodyMetricInput) =>
        api.post<CreateBodyMetricResponse>("/body-metrics", { body }),
}
