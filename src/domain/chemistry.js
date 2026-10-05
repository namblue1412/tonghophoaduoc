// All physical calculations use g, mL, mol internally. UI values carry explicit units.
export const decimal = (value, fallback = 0) => {
  if (value === '' || value == null) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const text = String(value).trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return fallback;
  const number = Number(text);
  return Number.isFinite(number) ? number : fallback;
};
export const massToGrams = (value, unit = 'g') => decimal(value) / (unit === 'mg' ? 1000 : 1);
export const molToDisplay = (mol, unit = 'mol') => mol * (unit === 'mmol' ? 1000 : 1);
export const displayToMol = (value, unit = 'mol') => decimal(value) / (unit === 'mmol' ? 1000 : 1);
export const localDate = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function solutionMoles({ concentration, concentrationPercent, concUnit, concentrationBasis, actualVolume, mw, density, nFactor }) {
  const c = decimal(concentration ?? concentrationPercent, NaN);
  const volume = decimal(actualVolume, NaN);
  const molecularWeight = decimal(mw);
  if (!Number.isFinite(c) || !Number.isFinite(volume) || c < 0 || volume < 0) return { mol: 0, error: 'Nồng độ/thể tích phải là số không âm.' };
  if (concUnit === 'CM') return { mol: c * volume / 1000 };
  if (concUnit === 'N') {
    const z = decimal(nFactor);
    return z > 0 ? { mol: c * volume / (1000 * z), meq: c * volume } : { mol: 0, error: 'Cần hệ số đương lượng z theo phản ứng.' };
  }
  if (concUnit && concUnit !== 'C%') return { mol: 0, error: 'Đơn vị nồng độ không được hỗ trợ.' };
  if (c > 100 || molecularWeight <= 0) return { mol: 0, error: 'C% cần MW > 0 và nồng độ 0–100%.' };
  if (concentrationBasis === 'w/v') return { mol: volume * c / (100 * molecularWeight) };
  if (concentrationBasis === 'w/w' && decimal(density) > 0) return { mol: volume * decimal(density) * c / (100 * molecularWeight) };
  return { mol: 0, error: 'Chọn % w/w hoặc w/v; w/w cần tỷ trọng.' };
}

// Preserve the actual molarity when changing the concentration unit or % basis.
export function convertConcentration(row, concUnit, concentrationBasis = row.concentrationBasis) {
  const source = solutionMoles({ ...row, actualVolume: '1000' });
  if (source.error) return { error: source.error };
  let concentration = source.mol;
  if (concUnit === 'N') {
    const z = decimal(row.nFactor);
    if (z <= 0) return { error: 'Cần z > 0 để đổi sang normality.' };
    concentration *= z;
  } else if (concUnit === 'C%') {
    const mw = decimal(row.mw), density = concentrationBasis === 'w/w' ? decimal(row.density) : 1;
    if (mw <= 0 || density <= 0 || !['w/w', 'w/v'].includes(concentrationBasis)) return { error: 'Cần MW, cơ sở % và tỷ trọng w/w hợp lệ.' };
    concentration = source.mol * mw / (10 * density);
    if (concentration > 100) return { error: 'Kết quả vượt 100%; kiểm tra MW, tỷ trọng và cơ sở %.' };
  } else if (concUnit !== 'CM') return { error: 'Đơn vị không được hỗ trợ.' };
  return { concentration: String(concentration), concentrationPercent: String(concentration), concUnit, concentrationBasis };
}

export function rowAmount(row, units = { mass: 'g', mole: 'mol' }) {
  if (row.type === 'solvent') return { mol: 0 };
  if (row.type === 'base_acid' || row.amountSource === 'solution') return solutionMoles(row);
  const mw = decimal(row.mw);
  const purity = decimal(row.purity, row.purity === '' || row.purity == null ? 100 : NaN);
  if (!Number.isFinite(purity) || purity < 0 || purity > 100) return { mol: 0, error: 'Độ tinh khiết phải nằm trong 0–100%.' };
  if (mw <= 0) return { mol: 0, error: 'Phân tử lượng phải lớn hơn 0.' };
  const source = row.amountSource || (decimal(row.actualMass) > 0 ? 'mass' : 'volume');
  const amount = decimal(source === 'volume' ? row.actualVolume : row.actualMass, source === 'volume' ? (row.actualVolume === '' ? 0 : NaN) : (row.actualMass === '' ? 0 : NaN));
  const density = decimal(row.density, NaN);
  if (!Number.isFinite(amount)) return { mol: 0, error: 'Lượng nạp không phải số hợp lệ.' };
  if (source === 'volume' && amount > 0 && (!Number.isFinite(density) || density <= 0)) return { mol: 0, error: 'Tính mol từ thể tích cần tỷ trọng > 0.' };
  const mass = source === 'volume' ? (amount === 0 ? 0 : amount * density) : massToGrams(amount, units.mass);
  if (mass < 0) return { mol: 0, error: 'Lượng nạp không được âm.' };
  return { mol: mass * purity / (100 * mw) };
}

export function recalculateReagents(rows = [], units = { mass: 'g', mole: 'mol' }) {
  const active = rows.filter((r) => !['solvent', 'base_acid', 'catalyst'].includes(r.type));
  const reference = active.find((r) => r.isLimiting) || active[0];
  const base = reference ? rowAmount(reference, units).mol : 0;
  return rows.map((r) => {
    const result = rowAmount(r, units);
    const ratio = base > 0 ? result.mol / base : 0;
    return { ...r, isLimiting: r.id === reference?.id, moles: molToDisplay(result.mol, units.mole), eq: ratio, molarRatio: ratio, calculationError: result.error || '' };
  });
}

export function theoreticalMass(limitingMoles, targetMW, units = {}, limitingCoefficient = 1, productCoefficient = 1) {
  const mol = displayToMol(limitingMoles, units.mole);
  const mw = decimal(targetMW);
  const inputCoefficient = decimal(limitingCoefficient);
  const outputCoefficient = decimal(productCoefficient);
  if (mol <= 0 || mw <= 0 || inputCoefficient <= 0 || outputCoefficient <= 0) return 0;
  return mol / inputCoefficient * outputCoefficient * mw * (units.mass === 'mg' ? 1000 : 1);
}

export function weighTubes(tubes = [], kind = 'productMass') {
  return tubes.map((t) => {
    const tare = decimal(t.tareMass, NaN), gross = decimal(t.grossMass, NaN);
    const error = !Number.isFinite(tare) || !Number.isFinite(gross) || tare < 0 || gross < tare;
    const missing = (value) => value == null || String(value).trim() === '';
    const message = missing(t.tareMass) || missing(t.grossMass) ? 'Chưa đủ số cân bì/cả bì; ống này chưa được cộng vào khối lượng.' : 'Cả bì phải ≥ bì; số cân không được âm. Kiểm tra số cân, ống này chưa được cộng vào khối lượng.';
    return { ...t, [kind]: error ? 0 : gross - tare, weighingError: error ? message : '' };
  });
}

export function columnEstimate({ diameterCm, bedHeightCm, voidFraction, rfProduct, rfImpurity, fractionMl, endCV }) {
  const d = decimal(diameterCm), h = decimal(bedHeightCm), epsilon = decimal(voidFraction);
  const rf = decimal(rfProduct), impurity = decimal(rfImpurity), fraction = decimal(fractionMl), cvEnd = decimal(endCV);
  if (d <= 0 || h <= 0 || epsilon <= 0 || epsilon >= 1 || rf <= 0 || rf > 1 || impurity <= 0 || impurity > 1 || fraction <= 0 || cvEnd <= 0) return { error: 'D, L, thể tích phân đoạn, số CV phải >0; 0<ε<1 và 0<Rf≤1.' };
  const bedMl = Math.PI * d * d * h / 4;
  const holdUpMl = bedMl * epsilon;
  return { bedMl, holdUpMl, cvProduct: 1 / rf, cvImpurity: 1 / impurity, deltaCV: Math.abs(1 / rf - 1 / impurity), fractions: Math.ceil(cvEnd * holdUpMl / fraction), collectionMl: cvEnd * holdUpMl };
}

export function rfValue(distance, front) {
  const d = decimal(distance, NaN), f = decimal(front, NaN);
  return Number.isFinite(d) && d >= 0 && f > 0 && d <= f ? d / f : null;
}
