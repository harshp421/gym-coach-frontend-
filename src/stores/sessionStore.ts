import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { SetLog, WorkoutSessionWithSets } from "../schemas/session"

type SessionState = {
    activeSession: WorkoutSessionWithSets | null
    setActive: (session: WorkoutSessionWithSets | null) => void
    upsertSet: (set: SetLog) => void
    removeSet: (setLogId: string) => void
    clearActive: () => void
}

/**
 * Caches the in-progress session locally so a tab refresh / quick nav doesn't
 * lose the user's place mid-workout. The server is still the source of truth
 * on next read; this is a UX speed cache + offline-tolerant scratchpad.
 */
export const useSessionStore = create<SessionState>()(
    persist(
        (set, get) => ({
            activeSession: null,
            setActive: (session) => set({ activeSession: session }),
            upsertSet: (newSet) => {
                const current = get().activeSession
                if (!current || current.id !== newSet.sessionId) return
                const others = current.sets.filter(
                    (s) =>
                        !(
                            s.planExerciseId === newSet.planExerciseId &&
                            s.setNumber === newSet.setNumber
                        ),
                )
                set({
                    activeSession: {
                        ...current,
                        sets: [...others, newSet].sort(
                            (a, b) =>
                                a.planExerciseId.localeCompare(b.planExerciseId) ||
                                a.setNumber - b.setNumber,
                        ),
                    },
                })
            },
            removeSet: (setLogId) => {
                const current = get().activeSession
                if (!current) return
                set({
                    activeSession: {
                        ...current,
                        sets: current.sets.filter((s) => s.id !== setLogId),
                    },
                })
            },
            clearActive: () => set({ activeSession: null }),
        }),
        {
            name: "gc-session",
            storage: createJSONStorage(() => localStorage),
            partialize: (s) => ({ activeSession: s.activeSession }),
        },
    ),
)
