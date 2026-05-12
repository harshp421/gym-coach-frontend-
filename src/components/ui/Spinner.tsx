type Props = {
    size?: "sm" | "md" | "lg"
    /** Tailwind text-color class; the spinner uses currentColor. */
    className?: string
    label?: string
}

const SIZE_PX: Record<NonNullable<Props["size"]>, number> = {
    sm: 14,
    md: 18,
    lg: 28,
}

/**
 * Monochrome SVG spinner. Inherits color from `currentColor` so it sits
 * comfortably on any background — e.g. white on a black button, or
 * neutral-700 in a card. Don't add color decoration.
 */
function Spinner({ size = "md", className = "", label }: Props) {
    const px = SIZE_PX[size]
    return (
        <span
            role="status"
            aria-label={label ?? "Loading"}
            className={`inline-block ${className}`}
            style={{ width: px, height: px }}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                width={px}
                height={px}
                className="animate-spin"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.18"
                />
                <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>
        </span>
    )
}

export default Spinner
