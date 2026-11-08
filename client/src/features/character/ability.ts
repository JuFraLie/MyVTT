import type { CharacterAbilities } from '@myvtt/shared';

/** Modifier D&D: floor((skor − 10) / 2). */
export const abilityModifier = (score: number) => Math.floor((score - 10) / 2);

/** Tampilan modifier bertanda, mis. "+3" atau "−2". */
export const formatModifier = (value: number) => (value >= 0 ? `+${value}` : String(value));

/** Enam kemampuan berurutan — dipakai grid edit (E1) dan baris tap-to-roll (E2). */
export const ABILITY_LIST: { key: keyof CharacterAbilities; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];
