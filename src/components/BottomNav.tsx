import { Link, useLocation } from "react-router-dom"

type Item = {
    to: string
    label: string
    /** Pathname prefixes that should also light up this tab as active. */
    matches?: string[]
    Icon: (props: { filled: boolean; className?: string }) => React.JSX.Element
}

const ITEMS: Item[] = [
    { to: "/dashboard", label: "Home", Icon: HomeIcon },
    {
        to: "/workouts/plan",
        label: "Plan",
        matches: ["/workouts/"],
        Icon: DumbbellIcon,
    },
    {
        to: "/gallery",
        label: "Discover",
        matches: ["/gallery", "/exercises/"],
        Icon: GalleryIcon,
    },
    { to: "/coach", label: "Coach", matches: ["/coach"], Icon: CoachIcon },
    { to: "/profile", label: "Profile", matches: ["/profile"], Icon: UserIcon },
]

/**
 * Floating glass tab bar for mobile. Each tab gets a black-pill background
 * + filled icon when active. Hidden at lg+ — desktop uses inline header
 * links. Respects safe-area-inset-bottom for notched devices.
 */
function BottomNav() {
    const { pathname } = useLocation()

    const isActive = (item: Item) => {
        if (item.to === "/dashboard") return pathname === "/dashboard"
        if (pathname === item.to) return true
        return item.matches?.some((p) => pathname.startsWith(p)) ?? false
    }

    return (
        <div
            aria-hidden={false}
            className="fixed inset-x-3 bottom-3 z-30 lg:hidden pointer-events-none"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <nav
                aria-label="Primary"
                className="pointer-events-auto mx-auto max-w-md rounded-3xl bg-white/85 backdrop-blur-xl border border-neutral-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.18)]"
            >
                <ul className="flex items-stretch px-1.5 py-1.5">
                    {ITEMS.map((item) => {
                        const active = isActive(item)
                        const { Icon } = item
                        return (
                            <li key={item.to} className="flex-1">
                                <Link
                                    to={item.to}
                                    aria-current={active ? "page" : undefined}
                                    aria-label={item.label}
                                    className="group flex flex-col items-center justify-center py-1.5 active:scale-[0.94] transition-transform"
                                >
                                    <span
                                        className={`flex items-center justify-center w-14 h-8 rounded-2xl transition-colors duration-200 ${
                                            active
                                                ? "bg-neutral-900"
                                                : "bg-transparent group-hover:bg-neutral-100"
                                        }`}
                                    >
                                        <Icon
                                            filled={active}
                                            className={
                                                active
                                                    ? "text-white"
                                                    : "text-neutral-500 group-hover:text-neutral-900"
                                            }
                                        />
                                    </span>
                                    <span
                                        className={`mt-1 text-[10px] font-bold tracking-[0.12em] uppercase transition-colors ${
                                            active
                                                ? "text-neutral-900"
                                                : "text-neutral-400 group-hover:text-neutral-700"
                                        }`}
                                    >
                                        {item.label}
                                    </span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Icons — outline by default, filled when `filled` is true. 20x20 viewBox.
// ---------------------------------------------------------------------------

function HomeIcon({ filled, className }: { filled: boolean; className?: string }) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 22 22"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={filled ? 0 : 1.7}
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <path d="M3 11.2 11 4l8 7.2V19a1 1 0 0 1-1 1h-4v-6h-6v6H4a1 1 0 0 1-1-1v-7.8Z" />
        </svg>
    )
}

function DumbbellIcon({
    filled,
    className,
}: {
    filled: boolean
    className?: string
}) {
    if (filled) {
        return (
            <svg
                width="20"
                height="20"
                viewBox="0 0 22 22"
                fill="currentColor"
                className={className}
                aria-hidden
            >
                <rect x="2" y="7.5" width="2.5" height="7" rx="0.8" />
                <rect x="4.5" y="5.5" width="2.5" height="11" rx="0.8" />
                <rect x="15" y="5.5" width="2.5" height="11" rx="0.8" />
                <rect x="17.5" y="7.5" width="2.5" height="7" rx="0.8" />
                <rect x="6.8" y="10" width="8.4" height="2" rx="0.8" />
            </svg>
        )
    }
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 22 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <path d="M3 8v6M5 6v10M17 6v10M19 8v6M6 11h10" />
        </svg>
    )
}

function GalleryIcon({
    filled,
    className,
}: {
    filled: boolean
    className?: string
}) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 22 22"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={filled ? 0 : 1.7}
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="12" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="12" width="7" height="7" rx="1.5" />
            <rect x="12" y="12" width="7" height="7" rx="1.5" />
        </svg>
    )
}

function CoachIcon({
    filled,
    className,
}: {
    filled: boolean
    className?: string
}) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 22 22"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={filled ? 0 : 1.7}
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <path d="M4 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        </svg>
    )
}

function UserIcon({
    filled,
    className,
}: {
    filled: boolean
    className?: string
}) {
    if (filled) {
        return (
            <svg
                width="20"
                height="20"
                viewBox="0 0 22 22"
                fill="currentColor"
                className={className}
                aria-hidden
            >
                <circle cx="11" cy="8" r="3.5" />
                <path d="M4 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5v1H4v-1Z" />
            </svg>
        )
    }
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 22 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            className={className}
            aria-hidden
        >
            <circle cx="11" cy="8" r="3.5" />
            <path d="M4 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
        </svg>
    )
}

export default BottomNav
