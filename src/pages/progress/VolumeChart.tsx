import type { WorkoutSessionListItem } from "../../schemas/session"

type Props = {
    /**
     * Sessions in newest-first order. We'll reverse for x-axis.
     * Sessions with totalVolumeKg = 0 still show, just as a tick mark.
     */
    sessions: WorkoutSessionListItem[]
}

const HEIGHT = 140
const PADDING_Y = 14
const PADDING_X = 8

const fmtKg = (kg: number) => {
    if (kg >= 10000) return `${Math.round(kg / 1000)}k kg`
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`
    return `${Math.round(kg)} kg`
}

const fmtDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        })
    } catch {
        return iso.slice(0, 10)
    }
}

/**
 * Inline SVG bar chart of volume per session, newest on the right.
 * Monochrome to match the palette. No tooltip — labels are baked in
 * because hover is unreliable on touch.
 */
function VolumeChart({ sessions }: Props) {
    const ordered = [...sessions].reverse()
    const max = Math.max(1, ...ordered.map((s) => s.summary.totalVolumeKg))

    if (ordered.length === 0) return null

    const inner = HEIGHT - PADDING_Y * 2
    // Width is responsive via viewBox + preserveAspectRatio.
    const slotWidth = 12
    const gap = 4
    const totalW = ordered.length * (slotWidth + gap) - gap + PADDING_X * 2
    const barW = slotWidth

    return (
        <figure className="rounded-2xl bg-white border border-neutral-200 p-5">
            <figcaption className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Volume per session
                </span>
                <span className="text-xs text-neutral-500 tabular-nums">
                    peak {fmtKg(max)}
                </span>
            </figcaption>

            <div className="mt-4 overflow-x-auto">
                <svg
                    viewBox={`0 0 ${totalW} ${HEIGHT}`}
                    width={totalW}
                    height={HEIGHT}
                    className="block"
                    role="img"
                    aria-label="Volume per session bar chart"
                >
                    {/* Axis baseline */}
                    <line
                        x1={PADDING_X}
                        x2={totalW - PADDING_X}
                        y1={HEIGHT - PADDING_Y}
                        y2={HEIGHT - PADDING_Y}
                        stroke="#e5e5e5"
                        strokeWidth={1}
                    />

                    {ordered.map((s, i) => {
                        const x = PADDING_X + i * (slotWidth + gap)
                        const h = (s.summary.totalVolumeKg / max) * inner
                        const y = HEIGHT - PADDING_Y - h
                        const inProgress = s.completedAt === null
                        return (
                            <g key={s.id}>
                                <rect
                                    x={x}
                                    y={Math.min(y, HEIGHT - PADDING_Y - 2)}
                                    width={barW}
                                    height={Math.max(h, 2)}
                                    rx={2}
                                    fill={inProgress ? "#a3a3a3" : "#171717"}
                                />
                            </g>
                        )
                    })}
                </svg>
            </div>

            <div className="mt-3 flex items-baseline justify-between text-[10px] uppercase tracking-wider text-neutral-400 tabular-nums">
                <span>{fmtDate(ordered[0]!.startedAt)}</span>
                <span>{fmtDate(ordered[ordered.length - 1]!.startedAt)}</span>
            </div>
        </figure>
    )
}

export default VolumeChart
