const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

type Props = {
    value: number
    onChange: (dayIndex: number) => void
}

/**
 * Horizontal pill row for picking which of the 7 days to view. Mobile-first;
 * overflows to horizontal scroll on very narrow screens so the active pill
 * stays tappable.
 */
function DayPicker({ value, onChange }: Props) {
    return (
        <div className="overflow-x-auto">
            <div className="flex gap-1.5 w-max">
                {WEEKDAYS.map((label, i) => {
                    const active = value === i
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onChange(i)}
                            aria-pressed={active}
                            className={`shrink-0 min-h-11 px-4 rounded-full text-xs font-bold uppercase tracking-[0.12em] border transition-colors ${
                                active
                                    ? "bg-neutral-900 text-white border-neutral-900"
                                    : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900"
                            }`}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default DayPicker
