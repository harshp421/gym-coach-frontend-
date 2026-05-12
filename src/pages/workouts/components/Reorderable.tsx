type Props = {
    canMoveUp: boolean
    canMoveDown: boolean
    onMoveUp: () => void
    onMoveDown: () => void
    disabled?: boolean
    label?: string
}

/**
 * Up/down chevron pair for reordering a row. Touch-friendly (44px tap
 * targets), accessible, no library. Drag-and-drop is a future polish.
 */
function Reorderable({
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    disabled,
    label = "row",
}: Props) {
    return (
        <div className="inline-flex items-center gap-0.5 shrink-0">
            <button
                type="button"
                onClick={onMoveUp}
                disabled={disabled || !canMoveUp}
                aria-label={`Move ${label} up`}
                className="size-8 inline-flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            >
                ↑
            </button>
            <button
                type="button"
                onClick={onMoveDown}
                disabled={disabled || !canMoveDown}
                aria-label={`Move ${label} down`}
                className="size-8 inline-flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            >
                ↓
            </button>
        </div>
    )
}

export default Reorderable
