import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useProfileStore } from "../../stores/profileStore"
import { useQuery } from "../../hooks/useQuery"
import { invalidatePrefix } from "../../lib/cache"
import { profileApi } from "../../lib/endpoints/profile"
import {
    completeOnboardingSchema,
    type ActivityLevel,
    type DietType,
    type EquipmentAccess,
    type ExperienceLevel,
    type Goal,
    type Profile,
    type Sex,
    type Units,
} from "../../schemas/profile"
import AboutYou from "./steps/AboutYou"
import YourGoal from "./steps/YourGoal"
import YourTraining from "./steps/YourTraining"
import YourEating from "./steps/YourEating"

export type WizardState = {
    // Step 1
    dateOfBirth: string
    sex: Sex | null
    heightCm: number | null
    initialWeightKg: number | null
    // Step 2
    goal: Goal | null
    targetWeightKg: number | null
    activityLevel: ActivityLevel | null
    // Step 3
    experienceLevel: ExperienceLevel | null
    trainingDaysPerWeek: number | null
    equipmentAccess: EquipmentAccess | null
    // Step 4
    dietType: DietType | null
    allergies: string[]
    dislikes: string[]
    // Meta
    units: Units
    timezone: string
}

const initial = (): WizardState => ({
    dateOfBirth: "",
    sex: null,
    heightCm: null,
    initialWeightKg: null,
    goal: null,
    targetWeightKg: null,
    activityLevel: null,
    experienceLevel: null,
    trainingDaysPerWeek: null,
    equipmentAccess: null,
    dietType: null,
    allergies: [],
    dislikes: [],
    units: "metric",
    timezone:
        typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : "UTC",
})

const TOTAL_STEPS = 4

function Onboarding() {
    const navigate = useNavigate()
    const setProfile = useProfileStore((s) => s.setProfile)
    const completedOnboarding = useProfileStore((s) => s.completedOnboarding)

    const [step, setStep] = useState(0)
    const [values, setValues] = useState<WizardState>(initial)

    const { state: getState, call: getProfile } = useQuery(profileApi.get)
    const { state: submitState, call: submit } = useQuery(
        profileApi.completeOnboarding,
    )

    // Bootstrap: load existing profile to prefill saved progress.
    useEffect(() => {
        getProfile()
            .then((res) => {
                if (res.completedOnboarding) {
                    navigate("/dashboard", { replace: true })
                    return
                }
                setValues((v) => prefillFromProfile(v, res.profile))
            })
            .catch(() => {
                // 404 is fine — no profile yet.
            })
    }, [getProfile, navigate])

    // If the store already says we're done, leave immediately.
    useEffect(() => {
        if (completedOnboarding) navigate("/dashboard", { replace: true })
    }, [completedOnboarding, navigate])

    const update = useMemo(
        () => (patch: Partial<WizardState>) =>
            setValues((prev) => ({ ...prev, ...patch })),
        [],
    )

    const handleNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
    const handleBack = () => setStep((s) => Math.max(s - 1, 0))

    const handleSubmit = async () => {
        const parsed = completeOnboardingSchema.safeParse({
            dateOfBirth: values.dateOfBirth,
            sex: values.sex,
            heightCm: values.heightCm,
            goal: values.goal,
            targetWeightKg: values.targetWeightKg ?? undefined,
            activityLevel: values.activityLevel,
            experienceLevel: values.experienceLevel,
            trainingDaysPerWeek: values.trainingDaysPerWeek,
            equipmentAccess: values.equipmentAccess,
            dietType: values.dietType,
            allergies: values.allergies,
            dislikes: values.dislikes,
            timezone: values.timezone,
            units: values.units,
            initialWeightKg: values.initialWeightKg,
        })
        if (!parsed.success) {
            // Shouldn't happen if step validation works — jump back to step 1.
            setStep(0)
            return
        }
        try {
            const res = await submit(parsed.data)
            setProfile(res.profile, true)
            // Profile + body metrics changed; drop any cached reads that
            // depend on them so the dashboard fetches fresh on next render.
            invalidatePrefix("profile")
            invalidatePrefix("body-metrics")
            invalidatePrefix("workouts:")
            navigate("/dashboard", { replace: true })
        } catch {
            // shown via submitState.error
        }
    }

    return (
        <main className="min-h-screen bg-stone-50 text-neutral-900">
            <header className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur border-b border-neutral-200">
                <div className="max-w-2xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between">
                    <span className="text-xl font-black tracking-tight">GC</span>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500 tabular-nums">
                        Step {step + 1} of {TOTAL_STEPS}
                    </span>
                </div>
                <div className="h-1 bg-neutral-200">
                    <div
                        className="h-full bg-neutral-900 transition-all duration-300"
                        style={{
                            width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
                        }}
                    />
                </div>
            </header>

            <section className="max-w-2xl mx-auto px-6 sm:px-10 py-10 sm:py-14">
                {getState.loading && !values.dateOfBirth && (
                    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-500">
                        Loading your saved progress…
                    </div>
                )}

                {step === 0 && (
                    <AboutYou
                        values={values}
                        onChange={update}
                        onNext={handleNext}
                    />
                )}
                {step === 1 && (
                    <YourGoal
                        values={values}
                        onChange={update}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                )}
                {step === 2 && (
                    <YourTraining
                        values={values}
                        onChange={update}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                )}
                {step === 3 && (
                    <YourEating
                        values={values}
                        onChange={update}
                        onSubmit={handleSubmit}
                        onBack={handleBack}
                        submitting={submitState.loading}
                        submitError={
                            submitState.error?.userMessage ||
                            submitState.error?.message ||
                            null
                        }
                    />
                )}
            </section>
        </main>
    )
}

function prefillFromProfile(base: WizardState, profile: Profile): WizardState {
    return {
        ...base,
        dateOfBirth: profile.dateOfBirth ?? base.dateOfBirth,
        sex: profile.sex ?? base.sex,
        heightCm: profile.heightCm ?? base.heightCm,
        goal: profile.goal ?? base.goal,
        targetWeightKg: profile.targetWeightKg ?? base.targetWeightKg,
        activityLevel: profile.activityLevel ?? base.activityLevel,
        experienceLevel: profile.experienceLevel ?? base.experienceLevel,
        trainingDaysPerWeek:
            profile.trainingDaysPerWeek ?? base.trainingDaysPerWeek,
        equipmentAccess: profile.equipmentAccess ?? base.equipmentAccess,
        dietType: profile.dietType ?? base.dietType,
        allergies: profile.allergies?.length ? profile.allergies : base.allergies,
        dislikes: profile.dislikes?.length ? profile.dislikes : base.dislikes,
        timezone: profile.timezone ?? base.timezone,
        units: profile.units ?? base.units,
    }
}

export default Onboarding
