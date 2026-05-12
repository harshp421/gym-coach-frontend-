import { create } from "zustand"

export type ConfirmOptions = {
    title: string
    body?: string
    confirmLabel?: string
    cancelLabel?: string
    /** Marks the action as irreversible — confirm button gets a red treatment. */
    destructive?: boolean
}

type Pending = ConfirmOptions & {
    resolve: (ok: boolean) => void
}

type ConfirmState = {
    pending: Pending | null
    open: (p: Pending) => void
    close: (ok: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
    pending: null,
    open: (pending) => set({ pending }),
    close: (ok) => {
        const p = get().pending
        if (p) p.resolve(ok)
        set({ pending: null })
    },
}))

/**
 * Drop-in replacement for `window.confirm` that renders a real modal.
 * Returns a promise resolving to `true` on confirm, `false` on cancel /
 * backdrop click / Esc.
 *
 *   const ok = await confirm({
 *       title: "Remove Bench Press from this day?",
 *       destructive: true,
 *   })
 *   if (!ok) return
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        useConfirmStore.getState().open({ ...options, resolve })
    })
}
