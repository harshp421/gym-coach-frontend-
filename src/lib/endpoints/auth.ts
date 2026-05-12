import { api } from "../api"
import type {
    ForgotPasswordFields,
    LoginFields,
    RegisterFields,
} from "../../schemas/auth"

export type User = {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    emailVerified: string | null
    createdAt: string
    updatedAt: string
}

export type AuthResponse = { user: User }

export const authApi = {
    register: (body: RegisterFields) =>
        api.post<AuthResponse>("/auth/register", { body }),

    login: (body: LoginFields) =>
        api.post<AuthResponse>("/auth/login", { body }),

    logout: () => api.post<{ ok: true }>("/auth/logout"),

    me: () => api.get<AuthResponse>("/auth/me"),

    forgotPassword: (body: ForgotPasswordFields) =>
        api.post<{ ok: true }>("/auth/forgot-password", { body }),

    resetPassword: (body: { token: string; password: string }) =>
        api.post<{ ok: true }>("/auth/reset-password", { body }),

    verifyEmail: (token: string) =>
        api.post<{ ok: true }>("/auth/verify-email", { body: { token } }),

    // requires auth cookie; identifies the user from the session, not the body
    resendVerification: () =>
        api.post<{ ok: true }>("/auth/resend-verification"),

    oauth: (provider: "google" | "apple", idToken: string) =>
        api.post<AuthResponse>("/auth/oauth", { body: { provider, idToken } }),
}
