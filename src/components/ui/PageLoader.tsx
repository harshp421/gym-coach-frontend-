import Spinner from "./Spinner"

type Props = {
    message?: string
}

/**
 * Full-screen centered loader for first-load states where there's nothing
 * else to show yet. Once we have cached data, prefer skeletons in place.
 */
function PageLoader({ message }: Props) {
    return (
        <main className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
            <div className="flex flex-col items-center text-center text-neutral-500">
                <span className="text-xl font-black tracking-tight text-neutral-900">
                    GC
                </span>
                <Spinner size="lg" className="mt-6 text-neutral-700" />
                {message && (
                    <p className="mt-4 text-sm">{message}</p>
                )}
            </div>
        </main>
    )
}

export default PageLoader
