/** Modifier D&D: floor((skor − 10) / 2). */
export const abilityModifier = (score: number) => Math.floor((score - 10) / 2);

/** Tampilan modifier bertanda, mis. "+3" atau "−2". */
export const formatModifier = (value: number) => (value >= 0 ? `+${value}` : String(value));
