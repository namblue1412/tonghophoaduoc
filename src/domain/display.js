import { decimal } from './chemistry.js';

// Display only: never feed rounded text back into scientific calculations.
export function formatDecimal(value, empty = '—') {
  if (value == null || String(value).trim() === '') return empty;
  const number = decimal(value, NaN);
  if (!Number.isFinite(number)) return empty;
  const rounded = number.toFixed(5);
  return (rounded === '-0.00000' ? '0.00000' : rounded).replace('.', ',');
}

export function emptyReagentInputs(seed) {
  return { ...seed, purity: '100', actualMass: '', actualVolume: '', density: '', notes: '', theoMass: '', moles: 0, eq: 0, molarRatio: 0 };
}
