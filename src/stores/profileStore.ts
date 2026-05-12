import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Profile } from "../schemas/profile"

type ProfileState = {
    profile: Profile | null
    completedOnboarding: boolean
    setProfile: (profile: Profile, completedOnboarding: boolean) => void
    clearProfile: () => void
}

export const useProfileStore = create<ProfileState>()(
    persist(
        (set) => ({
            profile: null,
            completedOnboarding: false,
            setProfile: (profile, completedOnboarding) =>
                set({ profile, completedOnboarding }),
            clearProfile: () =>
                set({ profile: null, completedOnboarding: false }),
        }),
        {
            name: "gc-profile",
            storage: createJSONStorage(() => localStorage),
            partialize: (s) => ({
                profile: s.profile,
                completedOnboarding: s.completedOnboarding,
            }),
        },
    ),
)
