import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { User } from "../lib/endpoints/auth"
import { configureApi } from "../lib/api"
import { useProfileStore } from "./profileStore"
import { cache } from "../lib/cache"

type AuthState = {
    user: User | null
    /**
     * False until `/auth/me` has resolved once for this page load.
     * Persisting `user` to localStorage is a UX hint only — it can be stale
     * after a cookie expiry, so callers (Protected/PublicOnly routes) MUST
     * wait for `bootstrapped` before trusting `user`.
     */
    bootstrapped: boolean
    setUser: (user: User) => void
    clearUser: () => void
    setBootstrapped: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            bootstrapped: false,
            // Any successful identity refresh implies bootstrap is done.
            setUser: (user) => set({ user, bootstrapped: true }),
            clearUser: () => set({ user: null, bootstrapped: true }),
            setBootstrapped: () => set({ bootstrapped: true }),
        }),
        {
            name: "gc-auth",
            storage: createJSONStorage(() => localStorage),
            // Only `user` survives reload. `bootstrapped` MUST reset so the
            // next page load re-validates against /auth/me.
            partialize: (s) => ({ user: s.user }),
        },
    ),
)

/**
 * Wipe everything tied to the current user — auth, profile, and the in-
 * memory cache. Used on 401s and on confirmed sign-outs.
 */
export function clearAllUserState(): void {
    useAuthStore.getState().clearUser()
    useProfileStore.getState().clearProfile()
    cache.clear()
}

// 401 from anywhere in the app → assume cookie is dead, wipe stale state.
configureApi({
    onUnauthorized: () => {
        clearAllUserState()
    },
})
