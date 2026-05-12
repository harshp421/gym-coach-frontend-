import { create } from "zustand"

export type ToastKind = "success" | "error" | "info"

export type Toast = {
    id: string
    kind: ToastKind
    message: string
}

type ToastState = {
    items: Toast[]
    push: (kind: ToastKind, message: string) => void
    dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
    items: [],
    push: (kind, message) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        set({ items: [...get().items, { id, kind, message }] })
        // Auto-dismiss. 3s for success/info; 5s for errors so the user has
        // time to read.
        const ttl = kind === "error" ? 5000 : 3000
        window.setTimeout(() => {
            set({ items: get().items.filter((t) => t.id !== id) })
        }, ttl)
    },
    dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}))

/**
 * Module-level shortcuts so callers don't need a hook:
 *   toast.success("Profile saved")
 *   toast.error("Couldn't reach the coach")
 */
export const toast = {
    success: (message: string) =>
        useToastStore.getState().push("success", message),
    error: (message: string) => useToastStore.getState().push("error", message),
    info: (message: string) => useToastStore.getState().push("info", message),
}
