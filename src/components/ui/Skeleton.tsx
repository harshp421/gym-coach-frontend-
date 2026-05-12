type Props = {
    className?: string
    /** Optional explicit dimensions for one-offs that don't want utility classes. */
    width?: number | string
    height?: number | string
    rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
}

const ROUND: Record<NonNullable<Props["rounded"]>, string> = {
    sm: "rounded",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
}

/**
 * Pulsing placeholder for content that's loading. Always neutral; the
 * design depends on calm.
 */
function Skeleton({
    className = "",
    width,
    height,
    rounded = "md",
}: Props) {
    return (
        <span
            aria-hidden
            className={`block bg-neutral-200/70 animate-pulse ${ROUND[rounded]} ${className}`}
            style={{ width, height }}
        />
    )
}

export default Skeleton
