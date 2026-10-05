import { decimal, recalculateReagents, theoreticalMass, weighTubes } from './chemistry.js';

export const asArray = (value) => Array.isArray(value) ? value.filter(Boolean) : value && typeof value === 'object' ? Object.values(value).filter(Boolean) : [];
export const duration = (interval) => {
  if (interval?.durationSeconds != null) return Math.max(0, decimal(interval.durationSeconds));
  const start = Date.parse(interval?.startTime), end = Date.parse(interval?.endTime);
  return Number.isFinite(start) && end >= start ? Math.floor((end - start) / 1000) : 0;
};
export const timerTotal = (timer = {}) => asArray(timer.intervals).reduce((sum, it) => sum + duration(it), 0);

export function deriveExperiment(exp) {
  const units = exp.units || { mass: 'g', mole: 'mol' };
  const stoichiometry = recalculateReagents(asArray(exp.stoichiometry), units);
  const limiting = stoichiometry.find((r) => r.isLimiting);
  const target = exp.targetMolecule || {};
  const column = exp.columnAndYield || {};
  const yieldData = column.eppendorfYield || {};
  const mw = target.molecularWeight != null && target.molecularWeight !== '' ? decimal(target.molecularWeight) : decimal(yieldData.targetMW);
  const theo = theoreticalMass(limiting?.moles || 0, mw, units, limiting?.stoichCoefficient ?? 1, target.stoichCoefficient ?? 1);
  const rawTubes = asArray(yieldData.tubes);
  const tubes = weighTubes(rawTubes.length ? rawTubes : [{ id: 'legacy-tube', tareMass: yieldData.tubeTareMass || '0', grossMass: yieldData.tubeGrossMass || '0', tag: 'spc' }]);
  const productMass = tubes.filter((t) => (t.tag || 'spc') === 'spc').reduce((s, t) => s + t.productMass, 0);
  const byproductMass = tubes.filter((t) => t.tag === 'spp').reduce((s, t) => s + t.productMass, 0);
  const yieldPercent = theo > 0 ? productMass / theo * 100 : 0;
  const assay = decimal(yieldData.assayMassPercent, NaN);
  const assayYieldPercent = Number.isFinite(assay) && assay >= 0 && assay <= 100 && yieldData.assayBasis === 'mass' ? yieldPercent * assay / 100 : null;
  const workup = exp.workup || {};
  const rawCrude = asArray(workup.crudeTubes);
  const crudeTubes = weighTubes(rawCrude.length ? rawCrude : [{ id: 'legacy-crude', tareMass: workup.crudeTareMass || '0', grossMass: workup.crudeGrossMass || '0' }], 'crudeMass');
  const crudeMassSource = workup.crudeMassSource || (!rawCrude.length && !decimal(workup.crudeGrossMass) && decimal(workup.crudeMass) > 0 ? 'manual' : 'tubes');
  const crudeMass = crudeMassSource === 'manual' ? Math.max(0, decimal(workup.crudeMass)) : crudeTubes.reduce((s, t) => s + t.crudeMass, 0);
  const fractions = asArray(column.fractions).map((f) => ({ ...f, id: f.id || `fraction-${f.number}` }));
  const available = new Set(fractions.filter((f) => !f.discarded).map((f) => f.number));
  const claimed = new Set();
  const fractionGroups = asArray(column.fractionGroups).map((g) => {
    const nums = asArray(g.fractionNumbers).filter((n) => available.has(n) && !claimed.has(n));
    nums.forEach((n) => claimed.add(n));
    return { ...g, fractionNumbers: nums, range: nums.map((n) => `F${n}`).join(', ') };
  }).filter((g) => g.fractionNumbers.length);
  const syncedFractions = fractions.map((f) => {
    const group = fractionGroups.find((g) => g.fractionNumbers.includes(f.number));
    return { ...f, group: group?.id || null, groupTag: group?.tag || null, groupColor: group?.color || null };
  });
  const timer = exp.reactionTimer || {};
  let intervals = asArray(timer.intervals);
  if (!intervals.length && decimal(timer.totalSeconds) > 0) intervals = [{ id: 'legacy-total', durationSeconds: decimal(timer.totalSeconds), manual: true, note: 'Tổng thời gian legacy; chưa có chi tiết phiên' }];
  intervals = intervals.map((it) => ({ ...it, durationSeconds: duration(it) }));
  return {
    ...exp, schemaVersion: 2, units, stoichiometry,
    equipment: asArray(exp.equipment), tlcTimeline: asArray(exp.tlcTimeline),
    reactionTimer: { ...timer, intervals, totalSeconds: timerTotal({ intervals }) },
    workup: { ...workup, crudeTubes, crudeMassSource, crudeMass },
    columnAndYield: { ...column, fractions: syncedFractions, totalFractions: fractions.length, fractionGroups, fractionTlcPlates: asArray(column.fractionTlcPlates), eppendorfYield: { ...yieldData, targetMW: String(mw), tubes, productMass, byproductMass, theoreticalYield: theo, yieldPercent, assayYieldPercent } }
  };
}

// Recursive patch preserves edits to different fields and nested modules. Arrays remain atomic.
export function changedFields(before, after) {
  if (JSON.stringify(before) === JSON.stringify(after)) return undefined;
  if (before && after && !Array.isArray(before) && !Array.isArray(after) && typeof before === 'object' && typeof after === 'object') {
    const patch = {};
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const value = changedFields(before[key], after[key]);
      if (value !== undefined) patch[key] = value;
    }
    return patch;
  }
  return after === undefined ? null : structuredClone(after);
}
export function mergePatch(target, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return structuredClone(patch);
  const result = { ...(target || {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Khóa dữ liệu không hợp lệ.');
    result[key] = value && typeof value === 'object' && !Array.isArray(value) ? mergePatch(result[key], value) : structuredClone(value);
  }
  return result;
}

export function validateImport(items, { allowDraftWeighing = false } = {}) {
  if (!Array.isArray(items) || !items.length || items.length > 1000) throw new Error('JSON phải chứa 1–1000 thí nghiệm.');
  const scan = (value) => {
    if (Array.isArray(value)) return value.forEach(scan);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Khóa dữ liệu không hợp lệ.');
      if (['uv254', 'uv365', 'reagent', 'imageUrl'].includes(key) && typeof child === 'string' && child && !child.startsWith('data:image/')) throw new Error('Demo chỉ nhập ảnh nhúng cục bộ; không tải ảnh Firebase thật.');
      scan(child);
    }
  };
  scan(items);
  const ids = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || /[.#$\[\]/]/.test(item.id) || ids.has(item.id)) throw new Error('ID thiếu, không hợp lệ hoặc trùng trong tệp.');
    ids.add(item.id);
    if (typeof item.code !== 'string' || typeof item.title !== 'string') throw new Error('Mỗi thí nghiệm cần mã và tên dạng chuỗi.');
    if (!['g', 'mg'].includes(item.units?.mass || 'g') || !['mol', 'mmol'].includes(item.units?.mole || 'mol')) throw new Error('Đơn vị không được hỗ trợ.');
    for (const path of ['stoichiometry', 'tlcTimeline', 'equipment']) if (item[path] != null && !Array.isArray(item[path])) throw new Error(`${path} phải là mảng.`);
    for (const [path, tubes] of [['columnAndYield.eppendorfYield.tubes', asArray(item.columnAndYield?.eppendorfYield?.tubes)], ['workup.crudeTubes', asArray(item.workup?.crudeTubes)]]) {
      for (const [index, tube] of tubes.entries()) {
        const missing = (value) => value == null || String(value).trim() === '';
        const malformed = [tube.tareMass, tube.grossMass].some((value) => !missing(value) && !Number.isFinite(decimal(value, NaN)));
        const incompleteOrInvalid = missing(tube.tareMass) || missing(tube.grossMass) || decimal(tube.tareMass) < 0 || decimal(tube.grossMass) < decimal(tube.tareMass);
        // A main export may contain unfinished lab notes. Preserve them as drafts;
        // weighTubes excludes invalid weights and shows an actionable warning.
        if (malformed || (incompleteOrInvalid && !allowDraftWeighing)) throw new Error(`${item.code}: ${path}[${index}] — số cân không hợp lệ (bì=${tube.tareMass ?? 'trống'}, cả bì=${tube.grossMass ?? 'trống'}).`);
      }
    }
    for (const row of asArray(item.stoichiometry)) for (const field of ['mw', 'actualMass', 'actualVolume', 'purity']) {
      if (row[field] !== '' && row[field] != null && (!Number.isFinite(decimal(row[field], NaN)) || decimal(row[field]) < 0 || (field === 'purity' && decimal(row[field]) > 100))) throw new Error(`Giá trị ${field} không hợp lệ.`);
    }
    const fractionNumbers = new Set();
    for (const fraction of asArray(item.columnAndYield?.fractions)) {
      if (!Number.isInteger(fraction.number) || fraction.number < 1 || fraction.number > 200 || fractionNumbers.has(fraction.number)) throw new Error('Nhãn ống phân đoạn phải là số nguyên 1–200 và không trùng.');
      fractionNumbers.add(fraction.number);
    }
    const claimed = new Set();
    for (const group of asArray(item.columnAndYield?.fractionGroups)) for (const number of asArray(group.fractionNumbers)) {
      if (!fractionNumbers.has(number) || claimed.has(number)) throw new Error('Nhóm gộp chứa ống không tồn tại hoặc trùng nhóm.');
      claimed.add(number);
    }
    for (const plate of asArray(item.tlcTimeline)) {
      if (plate.timestamp && !Number.isFinite(Date.parse(plate.timestamp))) throw new Error('Ngày giờ TLC không hợp lệ.');
      for (const spot of asArray(plate.spots)) if (spot.rf !== '' && spot.rf != null && (!Number.isFinite(decimal(spot.rf, NaN)) || decimal(spot.rf) < 0 || decimal(spot.rf) > 1)) throw new Error('Rf nhập phải trong 0–1.');
    }
  }
  return items.map(deriveExperiment);
}
