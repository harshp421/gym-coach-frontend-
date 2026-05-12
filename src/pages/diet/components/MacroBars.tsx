type Props = {
    proteinG: number
    carbsG: number
    fatG: number
    /** Optional totals — used as denominator for the % bar fill. */
    proteinTargetG?: number
    carbTargetG?: number
    fatTargetG?: number
}

/**
 * P/C/F as horizontal bars. If a `*TargetG` value is provided, each bar's
 * fill reflects actual ÷ target. Without targets, fill reflects each macro's
 * share of total calories — useful for the "this is what your day looks like"
 * read-out on the plan view.
 */
function MacroBars({
    proteinG,
    carbsG,
    fatG,
    proteinTargetG,
    carbTargetG,
    fatTargetG,
}: Props) {
    const useTargets =
        proteinTargetG != null && carbTargetG != null && fatTargetG != null

    const proteinPct = useTargets
        ? Math.min(1, proteinG / Math.max(proteinTargetG, 1))
        : shareOfKcal(proteinG, 4, proteinG, carbsG, fatG)
    const carbsPct = useTargets
        ? Math.min(1, carbsG / Math.max(carbTargetG, 1))
        : shareOfKcal(carbsG, 4, proteinG, carbsG, fatG)
    const fatPct = useTargets
        ? Math.min(1, fatG / Math.max(fatTargetG, 1))
        : shareOfKcal(fatG, 9, proteinG, carbsG, fatG)

    return (
        <div className="space-y-3">
            <Row
                label="Protein"
                grams={proteinG}
                target={proteinTargetG}
                pct={proteinPct}
            />
            <Row
                label="Carbs"
                grams={carbsG}
                target={carbTargetG}
                pct={carbsPct}
            />
            <Row label="Fat" grams={fatG} target={fatTargetG} pct={fatPct} />
        </div>
    )
}

function Row({
    label,
    grams,
    target,
    pct,
}: {
    label: string
    grams: number
    target?: number
    pct: number
}) {
    return (
        <div>
            <div className="flex items-baseline justify-between text-xs">
                <span className="text-neutral-500 font-medium">{label}</span>
                <span className="font-bold tabular-nums">
                    {Math.round(grams)}g
                    {target != null && (
                        <span className="text-neutral-400 font-medium">
                            {" / "}
                            {Math.round(target)}g
                        </span>
                    )}
                </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <span
                    className="block h-full bg-neutral-900 transition-all duration-500"
                    style={{ width: `${pct * 100}%` }}
                />
            </div>
        </div>
    )
}

// Fallback when no targets are supplied — show each macro's % of total kcal.
function shareOfKcal(
    grams: number,
    kcalPerG: number,
    p: number,
    c: number,
    f: number,
): number {
    const total = p * 4 + c * 4 + f * 9
    if (total <= 0) return 0
    return (grams * kcalPerG) / total
}

export default MacroBars
