import { asArray } from './experiment.js';
const STATES = ['empty', 'product', 'impurity', 'mixed', 'discarded'];

export function cycleFraction(column, number) {
  const fractions = asArray(column.fractions).map((f) => {
    if (f.number !== number) return f;
    const state = f.discarded ? 'discarded' : f.spotPattern || 'empty';
    const next = STATES[(STATES.indexOf(state) + 1) % STATES.length];
    return { ...f, discarded: next === 'discarded', spotPattern: next, tlcChecked: next !== 'empty', ...(next === 'discarded' ? { group: null, groupTag: null, groupColor: null } : {}) };
  });
  const discarded = fractions.find((f) => f.number === number)?.discarded;
  const groups = discarded ? asArray(column.fractionGroups).map((g) => ({ ...g, fractionNumbers: asArray(g.fractionNumbers).filter((n) => n !== number) })).filter((g) => g.fractionNumbers.length) : column.fractionGroups;
  return { ...column, fractions, fractionGroups: groups };
}

export function deleteAccidentalFraction(column, number) {
  const fractions = asArray(column.fractions);
  const tube = fractions.find((f) => f.number === number);
  if (!tube || fractions.length <= 1) throw new Error('Cần giữ ít nhất một ống.');
  const groupHistory = asArray(column.fractionGroups).some((g) => asArray(g.fractionNumbers).includes(number));
  const tlcHistory = asArray(column.fractionTlcPlates).some((plate) => String(plate.spottedFractions || '').match(/\d+/g)?.some((n) => Number(n) === number));
  if (tube.discarded || tube.tlcChecked || tube.group || tube.note || (tube.spotPattern && tube.spotPattern !== 'empty') || groupHistory || tlcHistory) throw new Error(`F${number} đã có dữ liệu. Đổi trạng thái thành Bỏ để giữ lịch sử, hoặc kiểm tra dữ liệu trước khi xóa ống thêm nhầm.`);
  // Never renumber other physical tubes or rewrite their TLC references.
  const remaining = fractions.filter((f) => f.number !== number);
  return { ...column, fractions: remaining, totalFractions: remaining.length };
}

export function resizeFractions(column, count) {
  let result = { ...column, fractions: [...asArray(column.fractions)] };
  while (result.fractions.length > count) result = deleteAccidentalFraction(result, result.fractions.at(-1).number);
  while (result.fractions.length < count) {
    const number = Math.max(0, ...result.fractions.map((f) => f.number)) + 1;
    if (number > 200) throw new Error('Nhãn ống tối đa F200.');
    result.fractions.push({ number, tlcChecked: false, spotPattern: 'empty', group: null, note: '' });
  }
  return { ...result, totalFractions: result.fractions.length };
}
