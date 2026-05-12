import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { profileApi, bodyMetricsApi } from "../../lib/endpoints/profile"
import {
    ACTIVITY,
    DIET,
    EQUIPMENT,
    EXPERIENCE,
    GOAL,
    UNITS,
    bodyMetricSchema,
    type ActivityLevel,
    type BodyMetric,
    type DietType,
    type EquipmentAccess,
    type ExperienceLevel,
    type Goal,
    type Profile,
    type ProfileUpdate,
    type Sex,
    type Units,
} from "../../schemas/profile"
import { useQuery } from "../../hooks/useQuery"
import { useCachedQuery } from "../../hooks/useCachedQuery"
import { cache, invalidatePrefix } from "../../lib/cache"
import { useProfileStore } from "../../stores/profileStore"
import { toast } from "../../stores/toastStore"
import { cmToFeetIn, feetInToCm, kgToLb, lbToKg } from "../onboarding/units"
import Spinner from "../../components/ui/Spinner"
import Skeleton from "../../components/ui/Skeleton"
import BottomNav from "../../components/BottomNav"

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

const SEX_LABEL: Record<Sex, string> = {
    male: "Male",
    female: "Female",
    other: "Other",
}

const GOAL_INFO: Record<Goal, { label: string; tag: string }> = {
    cut: { label: "Cut", tag: "Lose fat" },
    maintain: { label: "Maintain", tag: "Hold the line" },
    bulk: { label: "Bulk", tag: "Add muscle" },
    recomp: { label: "Recomp", tag: "Both, slowly" },
}

const ACTIVITY_INFO: Record<ActivityLevel, { label: string; desc: string }> = {
    sedentary: { label: "Sedentary", desc: "Desk job, little exercise" },
    light: { label: "Light", desc: "Light exercise 1–3 days/week" },
    moderate: { label: "Moderate", desc: "Moderate exercise 3–5 days/week" },
    active: { label: "Active", desc: "Hard exercise 6–7 days/week" },
    very_active: { label: "Very active", desc: "Hard exercise + physical job" },
}

const EXPERIENCE_INFO: Record<ExperienceLevel, { label: string; desc: string }> =
    {
        beginner: { label: "Beginner", desc: "New, or under a year" },
        intermediate: { label: "Intermediate", desc: "1–3 years, consistent" },
        advanced: { label: "Advanced", desc: "3+ years, structured" },
    }

const EQUIPMENT_INFO: Record<EquipmentAccess, { label: string; desc: string }> =
    {
        full_gym: { label: "Full gym", desc: "Racks, machines, cables" },
        home_basic: { label: "Home basic", desc: "Bench, barbell, plates" },
        dumbbells_only: { label: "Dumbbells only", desc: "A pair, adjustable" },
        bodyweight: { label: "Bodyweight", desc: "No equipment" },
    }

const DIET_INFO: Record<DietType, { label: string; tag: string }> = {
    omnivore: { label: "Omnivore", tag: "Anything goes" },
    vegetarian: { label: "Vegetarian", tag: "No meat" },
    vegan: { label: "Vegan", tag: "Plant only" },
    keto: { label: "Keto", tag: "Low carb" },
    paleo: { label: "Paleo", tag: "Whole foods" },
    other: { label: "Other", tag: "I'll tell the coach" },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function ProfileView() {
    const { state: profileState, refetch: refetchProfile } = useCachedQuery(
        "profile",
        () => profileApi.get(),
        { ttl: 60_000 },
    )
    const { state: metricsState, refetch: refetchMetrics } = useCachedQuery(
        "body-metrics:list:limit=14",
        () => bodyMetricsApi.list({ limit: 14 }),
        { ttl: 30_000 },
    )

    const profile = profileState.data?.profile ?? null

    if (profileState.loading && !profile) {
        return (
            <Shell>
                <ProfileSkeleton />
            </Shell>
        )
    }

    if (profileState.error && !profile) {
        return (
            <Shell>
                <ErrorBox
                    message={
                        profileState.error.userMessage ||
                        profileState.error.message ||
                        "Couldn't load your profile."
                    }
                />
            </Shell>
        )
    }

    if (!profile) return <Shell>{null}</Shell>

    return (
        <Shell>
            <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Profile
                </span>
                <h1 className="mt-3 text-5xl sm:text-6xl font-black tracking-tight leading-[1.02]">
                    Your details.
                </h1>
                <p className="mt-3 text-neutral-500">
                    Anything that changes your plan or daily targets goes here.
                </p>
            </div>

            <ProfileEditor
                profile={profile}
                onSaved={async (next) => {
                    cache.set("profile", {
                        profile: next,
                        completedOnboarding: true,
                    })
                    invalidatePrefix("workouts:")
                    await refetchProfile()
                }}
            />

            <BodyMetricsSection
                profile={profile}
                metrics={metricsState.data?.metrics ?? []}
                loading={
                    metricsState.loading && !metricsState.data
                }
                onLogged={async () => {
                    invalidatePrefix("body-metrics:")
                    await refetchMetrics()
                }}
            />
        </Shell>
    )
}

// ---------------------------------------------------------------------------
// Editor — every wizard field, on one scrollable page
// ---------------------------------------------------------------------------

type Draft = {
    dateOfBirth: string
    sex: Sex | null
    heightCm: number | null
    goal: Goal | null
    targetWeightKg: number | null
    activityLevel: ActivityLevel | null
    experienceLevel: ExperienceLevel | null
    trainingDaysPerWeek: number | null
    equipmentAccess: EquipmentAccess | null
    dietType: DietType | null
    allergies: string[]
    dislikes: string[]
    units: Units
}

const draftFromProfile = (p: Profile): Draft => ({
    dateOfBirth: p.dateOfBirth ?? "",
    sex: p.sex,
    heightCm: p.heightCm,
    goal: p.goal,
    targetWeightKg: p.targetWeightKg,
    activityLevel: p.activityLevel,
    experienceLevel: p.experienceLevel,
    trainingDaysPerWeek: p.trainingDaysPerWeek,
    equipmentAccess: p.equipmentAccess,
    dietType: p.dietType,
    allergies: p.allergies ?? [],
    dislikes: p.dislikes ?? [],
    units: p.units,
})

/**
 * Build the partial PUT body — only fields that changed. Empty string for
 * date is treated as "leave alone" (the wizard requires it; we don't want
 * an accidental clear here).
 */
function buildUpdate(initial: Draft, current: Draft): ProfileUpdate {
    const out: ProfileUpdate = {}
    if (current.dateOfBirth && current.dateOfBirth !== initial.dateOfBirth) {
        out.dateOfBirth = current.dateOfBirth
    }
    if (current.sex && current.sex !== initial.sex) out.sex = current.sex
    if (current.heightCm && current.heightCm !== initial.heightCm)
        out.heightCm = current.heightCm
    if (current.goal && current.goal !== initial.goal) out.goal = current.goal
    if (current.targetWeightKg !== initial.targetWeightKg) {
        if (current.targetWeightKg && current.targetWeightKg > 0) {
            out.targetWeightKg = current.targetWeightKg
        }
        // Note: backend partial schema doesn't accept null to clear; users
        // who want to clear can edit again later. Acceptable for v1.
    }
    if (current.activityLevel && current.activityLevel !== initial.activityLevel)
        out.activityLevel = current.activityLevel
    if (
        current.experienceLevel &&
        current.experienceLevel !== initial.experienceLevel
    )
        out.experienceLevel = current.experienceLevel
    if (
        current.trainingDaysPerWeek &&
        current.trainingDaysPerWeek !== initial.trainingDaysPerWeek
    )
        out.trainingDaysPerWeek = current.trainingDaysPerWeek
    if (
        current.equipmentAccess &&
        current.equipmentAccess !== initial.equipmentAccess
    )
        out.equipmentAccess = current.equipmentAccess
    if (current.dietType && current.dietType !== initial.dietType)
        out.dietType = current.dietType
    if (
        JSON.stringify(current.allergies.slice().sort()) !==
        JSON.stringify(initial.allergies.slice().sort())
    )
        out.allergies = current.allergies
    if (
        JSON.stringify(current.dislikes.slice().sort()) !==
        JSON.stringify(initial.dislikes.slice().sort())
    )
        out.dislikes = current.dislikes
    if (current.units !== initial.units) out.units = current.units
    return out
}

function ProfileEditor({
    profile,
    onSaved,
}: {
    profile: Profile
    onSaved: (next: Profile) => void | Promise<void>
}) {
    const setStoreProfile = useProfileStore((s) => s.setProfile)
    const initial = draftFromProfile(profile)
    const [draft, setDraft] = useState<Draft>(initial)
    const { state: updateState, call: update } = useQuery(profileApi.update)

    useEffect(() => {
        setDraft(draftFromProfile(profile))
    }, [profile])

    const update1 = (patch: Partial<Draft>) =>
        setDraft((d) => ({ ...d, ...patch }))

    const diff = buildUpdate(initial, draft)
    const dirty = Object.keys(diff).length > 0

    const handleSave = async () => {
        if (!dirty || updateState.loading) return
        try {
            const res = await update(diff)
            setStoreProfile(res.profile, true)
            await onSaved(res.profile)
            toast.success("Profile saved")
        } catch {
            // shown via updateState.error
        }
    }

    const isImperial = draft.units === "imperial"
    const showTarget = draft.goal === "cut" || draft.goal === "bulk"

    return (
        <div className="mt-10 flex flex-col gap-6">
            <Card title="Body">
                <Field label="Date of birth">
                    <input
                        type="date"
                        value={draft.dateOfBirth}
                        onChange={(e) =>
                            update1({ dateOfBirth: e.target.value })
                        }
                        max={new Date().toISOString().slice(0, 10)}
                        className={INPUT_CLASS}
                    />
                </Field>

                <Field label="Sex">
                    <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(SEX_LABEL) as Sex[]).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => update1({ sex: s })}
                                className={pillClass(draft.sex === s)}
                            >
                                {SEX_LABEL[s]}
                            </button>
                        ))}
                    </div>
                </Field>

                <Field
                    label={isImperial ? "Height (ft / in)" : "Height (cm)"}
                >
                    <HeightInput
                        cm={draft.heightCm}
                        imperial={isImperial}
                        onChange={(heightCm) => update1({ heightCm })}
                    />
                </Field>

                <Field
                    label={
                        showTarget
                            ? isImperial
                                ? "Target weight (lb)"
                                : "Target weight (kg)"
                            : null
                    }
                    hint="Optional; only shown for cut / bulk goals"
                >
                    {showTarget && (
                        <input
                            type="number"
                            inputMode="decimal"
                            placeholder={isImperial ? "165" : "75"}
                            step={0.1}
                            min={0}
                            value={
                                draft.targetWeightKg === null
                                    ? ""
                                    : isImperial
                                      ? kgToLb(draft.targetWeightKg)
                                      : draft.targetWeightKg
                            }
                            onChange={(e) => {
                                const raw = e.target.value
                                if (raw === "") {
                                    update1({ targetWeightKg: null })
                                    return
                                }
                                const num = Number(raw)
                                if (!Number.isFinite(num)) return
                                update1({
                                    targetWeightKg: isImperial
                                        ? lbToKg(num)
                                        : num,
                                })
                            }}
                            className={INPUT_CLASS}
                        />
                    )}
                </Field>
            </Card>

            <Card title="Plan & training">
                <Field label="Goal">
                    <div className="grid grid-cols-2 gap-3">
                        {GOAL.map((g) => (
                            <Choice
                                key={g}
                                selected={draft.goal === g}
                                onClick={() => update1({ goal: g })}
                                title={GOAL_INFO[g].label}
                                sub={GOAL_INFO[g].tag}
                            />
                        ))}
                    </div>
                </Field>

                <Field label="Activity level">
                    <div className="flex flex-col gap-2">
                        {ACTIVITY.map((a) => (
                            <Row
                                key={a}
                                selected={draft.activityLevel === a}
                                onClick={() => update1({ activityLevel: a })}
                                title={ACTIVITY_INFO[a].label}
                                sub={ACTIVITY_INFO[a].desc}
                            />
                        ))}
                    </div>
                </Field>

                <Field label="Experience">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {EXPERIENCE.map((e) => (
                            <Choice
                                key={e}
                                selected={draft.experienceLevel === e}
                                onClick={() => update1({ experienceLevel: e })}
                                title={EXPERIENCE_INFO[e].label}
                                sub={EXPERIENCE_INFO[e].desc}
                            />
                        ))}
                    </div>
                </Field>

                <Field label="Training days per week">
                    <div className="grid grid-cols-7 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() =>
                                    update1({ trainingDaysPerWeek: n })
                                }
                                className={`${pillClass(draft.trainingDaysPerWeek === n)} tabular-nums`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </Field>

                <Field label="Equipment access">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {EQUIPMENT.map((k) => (
                            <Choice
                                key={k}
                                selected={draft.equipmentAccess === k}
                                onClick={() => update1({ equipmentAccess: k })}
                                title={EQUIPMENT_INFO[k].label}
                                sub={EQUIPMENT_INFO[k].desc}
                            />
                        ))}
                    </div>
                </Field>
            </Card>

            <Card title="Diet">
                <Field label="Diet type">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {DIET.map((d) => (
                            <Choice
                                key={d}
                                selected={draft.dietType === d}
                                onClick={() => update1({ dietType: d })}
                                title={DIET_INFO[d].label}
                                sub={DIET_INFO[d].tag}
                            />
                        ))}
                    </div>
                </Field>

                <Field label="Allergies" hint="Things to never include.">
                    <PillInput
                        values={draft.allergies}
                        onChange={(allergies) => update1({ allergies })}
                        placeholder="nuts, dairy…"
                    />
                </Field>

                <Field label="Dislikes" hint="Foods to avoid by preference.">
                    <PillInput
                        values={draft.dislikes}
                        onChange={(dislikes) => update1({ dislikes })}
                        placeholder="mushrooms…"
                    />
                </Field>
            </Card>

            <Card title="Units">
                <div className="inline-flex self-start rounded-full border border-neutral-300 bg-white p-1 text-xs font-medium">
                    {UNITS.map((u) => (
                        <button
                            key={u}
                            type="button"
                            onClick={() => update1({ units: u })}
                            className={`px-3 py-1.5 rounded-full transition-colors ${
                                draft.units === u
                                    ? "bg-neutral-900 text-white"
                                    : "text-neutral-500 hover:text-neutral-900"
                            }`}
                        >
                            {u === "metric" ? "cm / kg" : "ft / lb"}
                        </button>
                    ))}
                </div>
            </Card>

            {updateState.error && (
                <ErrorBox
                    message={
                        updateState.error.userMessage ||
                        updateState.error.message ||
                        "Couldn't save."
                    }
                />
            )}

            <div className="sticky bottom-4 z-10 flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || updateState.loading}
                    className="inline-flex items-center gap-2 min-h-12 px-6 rounded-full bg-neutral-900 text-white text-sm font-semibold shadow-lg hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {updateState.loading && <Spinner size="sm" />}
                    {updateState.loading
                        ? "Saving…"
                        : dirty
                          ? "Save changes"
                          : "Saved"}
                </button>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Body metrics — log + recent
// ---------------------------------------------------------------------------

function BodyMetricsSection({
    profile,
    metrics,
    loading,
    onLogged,
}: {
    profile: Profile
    metrics: BodyMetric[]
    loading: boolean
    onLogged: () => void | Promise<void>
}) {
    const isImperial = profile.units === "imperial"
    const latest = metrics[0]
    const { state, call: create } = useQuery(bodyMetricsApi.create)

    const [weight, setWeight] = useState("")
    const [bodyFat, setBodyFat] = useState("")
    const [waist, setWaist] = useState("")
    const [error, setError] = useState<string | null>(null)

    const handleLog = async () => {
        setError(null)
        const wKg =
            weight === ""
                ? undefined
                : isImperial
                  ? lbToKg(Number(weight))
                  : Number(weight)
        const bf = bodyFat === "" ? undefined : Number(bodyFat)
        const waistVal =
            waist === ""
                ? undefined
                : isImperial
                  ? Number(waist) * 2.54
                  : Number(waist)

        const candidate = {
            weightKg: wKg,
            bodyFatPct: bf,
            waistCm: waistVal,
        }
        const result = bodyMetricSchema.safeParse(candidate)
        if (!result.success) {
            setError(result.error.issues[0]?.message ?? "Add a value")
            return
        }
        try {
            await create(result.data)
            setWeight("")
            setBodyFat("")
            setWaist("")
            await onLogged()
            toast.success("Logged. Nice.")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't log metrics")
        }
    }

    return (
        <div className="mt-10">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Body metrics
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight leading-[1.05]">
                Track your weight.
            </h2>
            <p className="mt-2 text-neutral-500 max-w-md">
                Log today's numbers. Multiple logs the same day overwrite the
                latest.
            </p>

            <div className="mt-6 rounded-2xl bg-white border border-neutral-200 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label={isImperial ? "Weight (lb)" : "Weight (kg)"}>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder={isImperial ? "165" : "75"}
                            step={0.1}
                            className={INPUT_CLASS}
                        />
                    </Field>
                    <Field label="Body fat (%)">
                        <input
                            type="number"
                            inputMode="decimal"
                            value={bodyFat}
                            onChange={(e) => setBodyFat(e.target.value)}
                            placeholder="optional"
                            step={0.1}
                            className={INPUT_CLASS}
                        />
                    </Field>
                    <Field label={isImperial ? "Waist (in)" : "Waist (cm)"}>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={waist}
                            onChange={(e) => setWaist(e.target.value)}
                            placeholder="optional"
                            step={0.1}
                            className={INPUT_CLASS}
                        />
                    </Field>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                {state.error && !error && (
                    <div
                        role="alert"
                        className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {state.error.userMessage || state.error.message}
                    </div>
                )}

                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={handleLog}
                        disabled={state.loading}
                        className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                    >
                        {state.loading && <Spinner size="sm" />}
                        {state.loading ? "Logging…" : "Log metrics"}
                    </button>
                </div>
            </div>

            {loading && metrics.length === 0 ? (
                <Skeleton className="mt-4" height={180} rounded="2xl" />
            ) : (
                <RecentMetrics latest={latest} items={metrics} isImperial={isImperial} />
            )}
        </div>
    )
}

function RecentMetrics({
    latest,
    items,
    isImperial,
}: {
    latest: BodyMetric | undefined
    items: BodyMetric[]
    isImperial: boolean
}) {
    if (items.length === 0) {
        return (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
                No metrics yet. Log your first above.
            </div>
        )
    }

    const formatWeight = (kg: number | null) =>
        kg === null ? "—" : isImperial ? `${kgToLb(kg)} lb` : `${kg} kg`
    const formatWaist = (cm: number | null) =>
        cm === null ? "—" : isImperial ? `${(cm / 2.54).toFixed(1)} in` : `${cm} cm`

    return (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-baseline justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Latest
                </span>
                {latest && (
                    <span className="text-xs text-neutral-400 tabular-nums">
                        {fmtDate(latest.recordedAt)}
                    </span>
                )}
            </div>

            {latest && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <Stat label="Weight" value={formatWeight(latest.weightKg)} />
                    <Stat
                        label="Body fat"
                        value={
                            latest.bodyFatPct === null
                                ? "—"
                                : `${latest.bodyFatPct}%`
                        }
                    />
                    <Stat label="Waist" value={formatWaist(latest.waistCm)} />
                </div>
            )}

            <ul className="border-t border-neutral-200 divide-y divide-neutral-200">
                {items.map((m) => (
                    <li
                        key={m.id}
                        className="py-2 flex items-baseline justify-between text-sm"
                    >
                        <span className="text-xs text-neutral-500 tabular-nums">
                            {fmtDate(m.recordedAt)}
                        </span>
                        <span className="tabular-nums">
                            {m.weightKg !== null && (
                                <>{formatWeight(m.weightKg)}</>
                            )}
                            {m.bodyFatPct !== null && (
                                <span className="text-neutral-400">
                                    {" "}
                                    · {m.bodyFatPct}% bf
                                </span>
                            )}
                            {m.waistCm !== null && (
                                <span className="text-neutral-400">
                                    {" "}
                                    · {formatWaist(m.waistCm)} waist
                                </span>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Reusable bits
// ---------------------------------------------------------------------------

const INPUT_CLASS =
    "w-full min-h-12 px-4 text-base rounded-xl bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors disabled:opacity-50"

function pillClass(selected: boolean): string {
    return `min-h-12 rounded-xl border text-sm font-medium transition-colors ${
        selected
            ? "bg-neutral-900 text-white border-neutral-900"
            : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
    }`
}

function Card({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <section className="rounded-2xl bg-white border border-neutral-200 p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                {title}
            </h2>
            <div className="mt-4 flex flex-col gap-5">{children}</div>
        </section>
    )
}

function Field({
    label,
    hint,
    children,
}: {
    label: string | null
    hint?: string
    children?: React.ReactNode
}) {
    if (!label && !children) return null
    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className="text-sm font-medium text-neutral-700">
                    {label}
                </label>
            )}
            {children}
            {hint && <span className="text-xs text-neutral-500">{hint}</span>}
        </div>
    )
}

function Choice({
    selected,
    onClick,
    title,
    sub,
}: {
    selected: boolean
    onClick: () => void
    title: string
    sub: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-left rounded-2xl border p-4 transition-colors ${
                selected
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
            }`}
        >
            <div className="text-base font-semibold">{title}</div>
            <div
                className={`mt-1 text-xs ${
                    selected ? "text-neutral-300" : "text-neutral-500"
                }`}
            >
                {sub}
            </div>
        </button>
    )
}

function Row({
    selected,
    onClick,
    title,
    sub,
}: {
    selected: boolean
    onClick: () => void
    title: string
    sub: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-left min-h-14 px-5 py-3 rounded-xl border transition-colors ${
                selected
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900"
            }`}
        >
            <div className="text-sm font-semibold">{title}</div>
            <div
                className={`text-xs ${
                    selected ? "text-neutral-300" : "text-neutral-500"
                }`}
            >
                {sub}
            </div>
        </button>
    )
}

function HeightInput({
    cm,
    imperial,
    onChange,
}: {
    cm: number | null
    imperial: boolean
    onChange: (cm: number | null) => void
}) {
    if (imperial) {
        const ft = cm ? cmToFeetIn(cm) : null
        return (
            <div className="flex gap-3">
                <input
                    type="number"
                    inputMode="numeric"
                    placeholder="ft"
                    min={0}
                    max={8}
                    value={ft?.feet ?? ""}
                    onChange={(e) => {
                        const f = Number(e.target.value)
                        if (e.target.value === "") return onChange(null)
                        if (!Number.isFinite(f)) return
                        onChange(feetInToCm(f, ft?.inches ?? 0))
                    }}
                    className={INPUT_CLASS}
                />
                <input
                    type="number"
                    inputMode="decimal"
                    placeholder="in"
                    min={0}
                    max={11.9}
                    step={0.1}
                    value={ft?.inches ?? ""}
                    onChange={(e) => {
                        const i = Number(e.target.value)
                        if (e.target.value === "") return onChange(null)
                        if (!Number.isFinite(i)) return
                        onChange(feetInToCm(ft?.feet ?? 0, i))
                    }}
                    className={INPUT_CLASS}
                />
            </div>
        )
    }
    return (
        <input
            type="number"
            inputMode="decimal"
            placeholder="178"
            min={0}
            max={272}
            step={0.1}
            value={cm ?? ""}
            onChange={(e) => {
                if (e.target.value === "") return onChange(null)
                const n = Number(e.target.value)
                if (Number.isFinite(n)) onChange(n)
            }}
            className={INPUT_CLASS}
        />
    )
}

function PillInput({
    values,
    onChange,
    placeholder,
}: {
    values: string[]
    onChange: (next: string[]) => void
    placeholder: string
}) {
    const [draft, setDraft] = useState("")

    const add = (raw: string) => {
        const v = raw.trim().toLowerCase()
        if (!v || values.includes(v)) {
            setDraft("")
            return
        }
        onChange([...values, v])
        setDraft("")
    }
    const remove = (v: string) => onChange(values.filter((x) => x !== v))

    return (
        <div className="flex flex-wrap items-center gap-2 min-h-12 rounded-xl bg-white border border-neutral-300 focus-within:border-neutral-900 px-3 py-2 transition-colors">
            {values.map((v) => (
                <span
                    key={v}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-neutral-900 text-white text-xs font-medium"
                >
                    {v}
                    <button
                        type="button"
                        onClick={() => remove(v)}
                        aria-label={`Remove ${v}`}
                        className="size-5 inline-flex items-center justify-center rounded-full hover:bg-neutral-700"
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault()
                        add(draft)
                    } else if (e.key === "Backspace" && !draft && values.length) {
                        onChange(values.slice(0, -1))
                    }
                }}
                onBlur={() => draft && add(draft)}
                placeholder={values.length === 0 ? placeholder : ""}
                className="flex-1 min-w-[6rem] bg-transparent text-base outline-none"
            />
        </div>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-stone-50 border border-neutral-200 p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                {label}
            </div>
            <div className="mt-1 text-lg font-black tracking-tight tabular-nums">
                {value}
            </div>
        </div>
    )
}

const fmtDate = (iso: string): string => {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        })
    } catch {
        return iso.slice(0, 10)
    }
}

function ProfileSkeleton() {
    return (
        <div>
            <Skeleton width={80} height={11} />
            <Skeleton className="mt-3" width="55%" height={56} />
            <Skeleton className="mt-3" width="40%" height={20} />
            <div className="mt-10 flex flex-col gap-6">
                {[1, 2, 3].map((n) => (
                    <Skeleton key={n} height={220} rounded="2xl" />
                ))}
            </div>
        </div>
    )
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="max-w-3xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
                <Link to="/dashboard" className="text-xl font-black tracking-tight">
                    GC
                </Link>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Profile
                </span>
            </header>
            <section className="max-w-3xl mx-auto px-6 sm:px-10 pb-32 lg:pb-24">
                {children}
            </section>
            <BottomNav />
        </main>
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

export default ProfileView
