import { useState } from "react"
import { Link } from "react-router-dom"
import { userExercisesApi } from "../../lib/endpoints/user-exercises"
import { useQuery } from "../../hooks/useQuery"
import { useCachedQuery } from "../../hooks/useCachedQuery"
import { invalidatePrefix } from "../../lib/cache"
import { confirm } from "../../stores/confirmStore"
import { toast } from "../../stores/toastStore"
import BackButton from "../../components/BackButton"
import type {
    UserExercise,
    UserExerciseInput,
} from "../../schemas/user-exercise"
import Spinner from "../../components/ui/Spinner"
import Skeleton from "../../components/ui/Skeleton"
import BottomNav from "../../components/BottomNav"
import ExerciseForm from "./components/ExerciseForm"

type Mode = { kind: "list" } | { kind: "create" } | { kind: "edit"; pe: UserExercise }

const CACHE_KEY_ACTIVE = "user-exercises:list"
const CACHE_KEY_ALL = "user-exercises:list:all"

function MyExercises() {
    const [showArchived, setShowArchived] = useState(false)
    const [mode, setMode] = useState<Mode>({ kind: "list" })

    const { state } = useCachedQuery(
        showArchived ? CACHE_KEY_ALL : CACHE_KEY_ACTIVE,
        () => userExercisesApi.list({ includeArchived: showArchived }),
        { ttl: 60_000 },
    )

    const { state: createState, call: create } = useQuery(userExercisesApi.create)
    const { state: updateState, call: update } = useQuery(userExercisesApi.update)
    const { state: archiveState, call: archive } = useQuery(
        userExercisesApi.archive,
    )
    const { state: restoreState, call: restore } = useQuery(
        userExercisesApi.restore,
    )

    // After any mutation, drop the merged exercise list cache too — the
    // ExercisePicker reads from `exercises:*` and needs to see new rows.
    const invalidateAll = () => {
        invalidatePrefix("user-exercises:")
        invalidatePrefix("exercises:")
    }

    const handleCreate = async (values: UserExerciseInput) => {
        await create(values)
        invalidateAll()
        setMode({ kind: "list" })
        toast.success(`"${values.name}" added`)
    }

    const handleUpdate = async (id: string, values: UserExerciseInput) => {
        await update(id, values)
        invalidateAll()
        setMode({ kind: "list" })
        toast.success("Saved")
    }

    const handleArchive = async (id: string, name: string) => {
        const ok = await confirm({
            title: `Archive "${name}"?`,
            body: "Plans that use it keep working. You can restore it later.",
            confirmLabel: "Archive",
        })
        if (!ok) return
        try {
            await archive(id)
            invalidateAll()
            toast.info(`"${name}" archived`)
        } catch {
            toast.error("Couldn't archive")
        }
    }

    const handleRestore = async (id: string, name: string) => {
        try {
            await restore(id)
            invalidateAll()
            toast.success(`"${name}" restored`)
        } catch {
            toast.error("Couldn't restore")
        }
    }

    const items = state.data?.items ?? []
    const active = items.filter((e) => !e.archivedAt)
    const archived = items.filter((e) => !!e.archivedAt)

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="max-w-3xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BackButton to="/dashboard" />
                    <Link to="/dashboard" className="text-xl font-black tracking-tight">
                        GC
                    </Link>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    My exercises
                </span>
            </header>

            <section className="max-w-3xl mx-auto px-6 sm:px-10 pb-32 lg:pb-24">
                {mode.kind === "list" && (
                    <>
                        <div className="flex items-end justify-between gap-3 mb-6">
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                                    Your exercises.
                                </h1>
                                <p className="mt-2 text-neutral-500">
                                    Add lifts the catalog doesn't have.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMode({ kind: "create" })}
                                className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                            >
                                + New
                            </button>
                        </div>

                        {state.loading && items.length === 0 && (
                            <div className="flex flex-col gap-3">
                                <Skeleton height={92} rounded="2xl" />
                                <Skeleton height={92} rounded="2xl" />
                                <Skeleton height={92} rounded="2xl" />
                            </div>
                        )}

                        {state.error && !state.loading && (
                            <ErrorBox
                                message={
                                    state.error.userMessage ||
                                    state.error.message ||
                                    "Couldn't load exercises."
                                }
                            />
                        )}

                        {!state.loading && active.length === 0 && (
                            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                                <p className="text-sm text-neutral-500">
                                    Nothing here yet — create your first.
                                </p>
                            </div>
                        )}

                        {active.length > 0 && (
                            <ul className="flex flex-col gap-2">
                                {active.map((ex) => (
                                    <ExerciseRow
                                        key={ex.id}
                                        ex={ex}
                                        onEdit={() => setMode({ kind: "edit", pe: ex })}
                                        onArchive={() => handleArchive(ex.id, ex.name)}
                                        archiving={archiveState.loading}
                                    />
                                ))}
                            </ul>
                        )}

                        <div className="mt-8 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setShowArchived((v) => !v)}
                                className="text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-4"
                            >
                                {showArchived
                                    ? "Hide archived"
                                    : "Show archived"}
                            </button>
                        </div>

                        {showArchived && archived.length > 0 && (
                            <ul className="mt-3 flex flex-col gap-2 opacity-70">
                                {archived.map((ex) => (
                                    <li
                                        key={ex.id}
                                        className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-4 flex items-center justify-between gap-4"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-base font-semibold line-through decoration-neutral-400">
                                                {ex.name}
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                archived
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRestore(ex.id, ex.name)}
                                            disabled={restoreState.loading}
                                            className="text-xs text-neutral-700 hover:text-neutral-900 underline underline-offset-4 disabled:opacity-50"
                                        >
                                            Restore
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}

                {mode.kind === "create" && (
                    <FormShell title="New exercise">
                        <ExerciseForm
                            submitting={createState.loading}
                            error={
                                createState.error?.userMessage ||
                                createState.error?.message ||
                                null
                            }
                            onSubmit={handleCreate}
                            onCancel={() => setMode({ kind: "list" })}
                        />
                    </FormShell>
                )}

                {mode.kind === "edit" && (
                    <FormShell title="Edit exercise">
                        <ExerciseForm
                            initial={mode.pe}
                            submitting={updateState.loading}
                            error={
                                updateState.error?.userMessage ||
                                updateState.error?.message ||
                                null
                            }
                            onSubmit={(values) => handleUpdate(mode.pe.id, values)}
                            onCancel={() => setMode({ kind: "list" })}
                        />
                    </FormShell>
                )}
            </section>
            <BottomNav />
        </main>
    )
}

function ExerciseRow({
    ex,
    onEdit,
    onArchive,
    archiving,
}: {
    ex: UserExercise
    onEdit: () => void
    onArchive: () => void
    archiving: boolean
}) {
    return (
        <li className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
                <div className="text-base font-semibold">{ex.name}</div>
                <div className="mt-1 text-xs text-neutral-500">
                    {ex.primaryMuscles.join(", ") || "—"}
                    {ex.equipment ? ` · ${ex.equipment}` : ""}
                    {ex.mechanic ? ` · ${ex.mechanic}` : ""}
                </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
                <button
                    type="button"
                    onClick={onEdit}
                    className="text-neutral-700 hover:text-neutral-900 underline underline-offset-4"
                >
                    Edit
                </button>
                <button
                    type="button"
                    onClick={onArchive}
                    disabled={archiving}
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-red-600 disabled:opacity-50"
                >
                    {archiving && <Spinner size="sm" />}
                    Archive
                </button>
            </div>
        </li>
    )
}

function FormShell({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.05]">
                {title}.
            </h1>
            <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
                {children}
            </div>
        </div>
    )
}

function ErrorBox({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
            {message}
        </div>
    )
}

// Re-export so other modules can invalidate the cache after they create
// custom exercises (e.g. an inline-create flow inside ExercisePicker).
export { CACHE_KEY_ACTIVE as USER_EXERCISES_CACHE_KEY }

export default MyExercises
