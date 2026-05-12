import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import type { Exercise } from "../../../schemas/workout"

type Props = {
    exercise: Exercise
    onToggleLike: () => void
    onAddToPlan: () => void
}

/**
 * Single Instagram-style card. Image cycles between the dataset's two
 * frames (start + end position) every 1.5s so the movement reads at a
 * glance. Double-tap the image to like with a heart-pop overlay; the
 * heart appears whether or not the like is new (pure UI affordance).
 */
function ExerciseCard({ exercise, onToggleLike, onAddToPlan }: Props) {
    const liked = exercise.likedByMe === true
    const images = exercise.imageUrls
    const [imgIdx, setImgIdx] = useState(0)
    const [popKey, setPopKey] = useState(0)
    const lastTapRef = useRef(0)

    useEffect(() => {
        if (images.length < 2) return
        const id = window.setInterval(() => {
            setImgIdx((i) => (i + 1) % images.length)
        }, 1500)
        return () => window.clearInterval(id)
    }, [images.length])

    const handleTap = () => {
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
            // Double-tap. Always show the heart pop; only call like if not
            // already liked (Instagram-style — double-tap likes, doesn't toggle).
            setPopKey((k) => k + 1)
            if (!liked) onToggleLike()
            lastTapRef.current = 0
        } else {
            lastTapRef.current = now
        }
    }

    const muscleLine = [
        ...exercise.primaryMuscles,
        exercise.equipment ?? "",
        exercise.mechanic ?? "",
    ]
        .filter(Boolean)
        .join(" · ")

    return (
        <article className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            {/* Image */}
            <div
                role="button"
                tabIndex={0}
                onClick={handleTap}
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleTap()
                }}
                className="relative aspect-square bg-neutral-100 select-none"
                aria-label={`${exercise.name} preview — double-tap to like`}
            >
                {images.length > 0 ? (
                    <img
                        src={images[imgIdx]}
                        alt={exercise.name}
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-7xl font-black">
                        {exercise.name.charAt(0).toUpperCase()}
                    </div>
                )}

                {/* Heart pop overlay — re-keyed each tap to retrigger the animation */}
                <div
                    key={popKey}
                    aria-hidden
                    className={
                        popKey === 0
                            ? "hidden"
                            : "absolute inset-0 flex items-center justify-center pointer-events-none gc-heart-pop"
                    }
                >
                    <HeartIcon
                        filled
                        className="h-24 w-24 text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
                    />
                </div>
            </div>

            {/* Action row */}
            <div className="px-3 py-2 flex items-center gap-2">
                <button
                    type="button"
                    onClick={onToggleLike}
                    aria-pressed={liked}
                    aria-label={liked ? "Unlike" : "Like"}
                    className="p-2 -m-2 rounded-full active:scale-90 transition-transform"
                >
                    <HeartIcon
                        filled={liked}
                        className={`h-7 w-7 transition-colors ${
                            liked ? "text-red-500" : "text-neutral-900"
                        }`}
                    />
                </button>
                <button
                    type="button"
                    onClick={onAddToPlan}
                    aria-label="Add to plan"
                    className="p-2 -m-2 rounded-full active:scale-90 transition-transform"
                >
                    <PlusIcon className="h-7 w-7 text-neutral-900" />
                </button>
                <Link
                    to={`/exercises/${exercise.slug}`}
                    className="ml-auto text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                    Details →
                </Link>
            </div>

            {/* Caption */}
            <div className="px-4 pb-4">
                <Link
                    to={`/exercises/${exercise.slug}`}
                    className="text-base font-semibold hover:underline underline-offset-4 decoration-neutral-300"
                >
                    {exercise.name}
                </Link>
                {muscleLine && (
                    <div className="mt-1 text-xs text-neutral-500 capitalize">
                        {muscleLine}
                    </div>
                )}
            </div>
        </article>
    )
}

function HeartIcon({
    filled,
    className = "",
}: {
    filled?: boolean
    className?: string
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
    )
}

function PlusIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <path d="M12 5v14M5 12h14" />
        </svg>
    )
}

export default ExerciseCard
