import type { Meal } from "../../../schemas/diet"

type Props = { meal: Meal }

function MealCard({ meal }: Props) {
    return (
        <article className="rounded-2xl bg-white border border-neutral-200 p-5">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    {meal.slot}
                </span>
                <span className="text-xs font-bold tabular-nums text-neutral-700">
                    {meal.calories} kcal
                </span>
            </div>

            <h3 className="mt-2 text-xl font-bold tracking-tight leading-snug">
                {meal.name}
            </h3>

            <div className="mt-2 flex items-center gap-3 text-[11px] font-medium tabular-nums">
                <Macro label="P" value={meal.proteinG} />
                <Macro label="C" value={meal.carbsG} />
                <Macro label="F" value={meal.fatG} />
            </div>

            <ul className="mt-4 text-sm text-neutral-700 space-y-1.5">
                {meal.ingredients.map((ing, i) => (
                    <li key={i} className="flex gap-2.5">
                        <span aria-hidden className="text-neutral-300 mt-0.5">
                            ·
                        </span>
                        <span className="flex-1">{ing}</span>
                    </li>
                ))}
            </ul>

            {meal.prepNotes && (
                <p className="mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500 leading-relaxed">
                    {meal.prepNotes}
                </p>
            )}
        </article>
    )
}

function Macro({ label, value }: { label: string; value: number }) {
    return (
        <span className="inline-flex items-baseline gap-1">
            <span className="text-neutral-400">{label}</span>
            <span className="text-neutral-900 font-bold">{Math.round(value)}g</span>
        </span>
    )
}

export default MealCard
