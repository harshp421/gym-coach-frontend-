import { Link, useNavigate } from "react-router-dom"

type Props = {
    /**
     * Explicit destination. When set, renders as a <Link> so the user gets
     * the right URL on hover/right-click. Use this when the back target is
     * deterministic (e.g. a detail page always goes back to its list).
     */
    to?: string
    /** Optional override for the aria-label. Defaults to "Back". */
    label?: string
}

/**
 * Circular back button — matches the coach page header (size-9 outline
 * circle, chevron icon). Drop into a page's top-left header slot.
 *
 * Without `to`, falls back to history.back() so the user lands wherever
 * they came from (handles deep links gracefully: if there's no history,
 * navigate(-1) is a no-op and the user can still tap the dashboard tab).
 */
function BackButton({ to, label = "Back" }: Props) {
    const navigate = useNavigate()
    const baseClass =
        "size-9 inline-flex items-center justify-center rounded-full border border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"

    if (to) {
        return (
            <Link to={to} aria-label={label} className={baseClass}>
                <BackIcon />
            </Link>
        )
    }
    return (
        <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={label}
            className={baseClass}
        >
            <BackIcon />
        </button>
    )
}

function BackIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
                d="M10 3l-5 5 5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export default BackButton
