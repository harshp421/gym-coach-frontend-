// Backend convention: 0 = Mon, 6 = Sun. JS Date.getDay() is Sun=0..Sat=6.

export const WEEKDAY_SHORT = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
] as const

export const WEEKDAY_LONG = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
] as const

export const todayWeekdayIndex = () => (new Date().getDay() + 6) % 7

/**
 * Pick the lowest weekday index (Mon=0) not already used by existing days.
 * Falls back to dayIndex % 7 once every weekday is taken, so a 7+ day plan
 * still gets deterministic hints. Used when adding a new day so the UI
 * never has to render "Any day" as a default.
 */
export function nextFreeWeekday(
    days: { weekdayHint: number | null }[],
): number {
    const used = new Set(
        days.map((d) => d.weekdayHint).filter((w): w is number => w !== null),
    )
    for (let i = 0; i < 7; i++) {
        if (!used.has(i)) return i
    }
    return days.length % 7
}
