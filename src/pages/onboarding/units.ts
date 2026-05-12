// Conversions for the imperial display toggle.
// Storage is always metric (cm, kg). UI converts on the way in/out.

export const cmToFeetIn = (cm: number) => {
    const totalIn = cm / 2.54
    const feet = Math.floor(totalIn / 12)
    const inches = Math.round((totalIn - feet * 12) * 10) / 10
    return { feet, inches }
}

export const feetInToCm = (feet: number, inches: number) =>
    Math.round((feet * 30.48 + inches * 2.54) * 10) / 10

export const kgToLb = (kg: number) => Math.round((kg * 2.20462) * 10) / 10

export const lbToKg = (lb: number) => Math.round((lb / 2.20462) * 100) / 100
