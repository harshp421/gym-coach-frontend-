type Props = {
    target: number
    /** Optional consumed — without meal logging it's always equal to target. */
    consumed?: number
    /** sm / md / lg sizing presets. */
    size?: "sm" | "md" | "lg"
}

const SIZE: Record<NonNullable<Props["size"]>, { wrap: string; numberCls: string }> = {
    sm: { wrap: "w-24 h-24", numberCls: "text-xl" },
    md: { wrap: "w-32 h-32", numberCls: "text-2xl" },
    lg: { wrap: "w-40 h-40", numberCls: "text-3xl" },
}

/**
 * Calorie target as a ring. Without meal logging there's no real progress
 * to show, so `consumed` defaults to `target` and the ring renders full.
 * Wired this way so we can swap in real progress when logging lands.
 */
function CalorieRing({ target, consumed, size = "md" }: Props) {
    const value = consumed ?? target
    const pct = Math.max(0, Math.min(1, value / Math.max(target, 1)))
    const circumference = 2 * Math.PI * 44 // r=44 in a 100x100 viewBox
    const dash = circumference * pct
    const { wrap, numberCls } = SIZE[size]

    return (
        <div className={`relative ${wrap}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#e7e5e4"
                    strokeWidth="6"
                />
                <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference}`}
                    className="text-neutral-900 transition-all duration-500"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-black tabular-nums ${numberCls}`}>
                    {value.toLocaleString()}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-bold mt-0.5">
                    kcal
                </span>
            </div>
        </div>
    )
}

export default CalorieRing
