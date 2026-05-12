declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string
                        callback: (response: { credential: string }) => void
                        auto_select?: boolean
                        cancel_on_tap_outside?: boolean
                        ux_mode?: "popup" | "redirect"
                    }) => void
                    renderButton: (
                        parent: HTMLElement,
                        options: {
                            type?: "standard" | "icon"
                            theme?: "outline" | "filled_blue" | "filled_black"
                            size?: "large" | "medium" | "small"
                            text?: "signin_with" | "signup_with" | "continue_with" | "signin"
                            shape?: "rectangular" | "pill" | "circle" | "square"
                            logo_alignment?: "left" | "center"
                            width?: number | string
                        },
                    ) => void
                    prompt: () => void
                    cancel: () => void
                    disableAutoSelect: () => void
                }
            }
        }
    }
}

const GIS_SRC = "https://accounts.google.com/gsi/client"
let scriptPromise: Promise<void> | null = null

export function loadGoogleIdentity(): Promise<void> {
    if (typeof window === "undefined") return Promise.reject(new Error("no window"))
    if (window.google?.accounts?.id) return Promise.resolve()
    if (scriptPromise) return scriptPromise

    scriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${GIS_SRC}"]`,
        )
        if (existing) {
            existing.addEventListener("load", () => resolve())
            existing.addEventListener("error", () =>
                reject(new Error("Failed to load Google Identity Services")),
            )
            return
        }
        const script = document.createElement("script")
        script.src = GIS_SRC
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error("Failed to load Google Identity Services"))
        document.head.appendChild(script)
    })

    return scriptPromise
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as
    | string
    | undefined
