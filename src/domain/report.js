import { decimal, theoreticalMass } from './chemistry.js';

export const REPORT_SECTIONS = [
  ['chemicals', 'Mục tiêu và hóa chất'], ['conditions', 'Điều kiện phản ứng'],
  ['reactionTlc', 'TLC theo dõi phản ứng'], ['workup', 'Xử lý sau phản ứng'],
  ['results', 'Khối lượng và hiệu suất'], ['purity', 'Các chất thu được / TLC sau cột'],
  ['sessions', 'Các phiên khuấy'], ['column', 'Cột và phân đoạn'],
  ['weighing', 'Cân trừ bì'], ['analytics', 'Định danh sản phẩm'], ['safety', 'Tham chiếu an toàn']
];
export function blankReportProduct(massUnit = 'g') {
  return { id: crypto.randomUUID(), name: '', formula: '', mw: '', mass: '', massUnit, stoichCoefficient: '', properties: '', imageUrl: '', plates: Array.from({ length: 3 }, () => ({ eluent: '', rf: '', stainName: '', notes: '', timestamp: null, images: { uv254: '', uv365: '', reagent: '' } })) };
}
export function productReportYield(product, experiment) {
  const limiting = experiment.stoichiometry.find((r) => r.isLimiting);
  const mw = decimal(product.mw, NaN), mass = decimal(product.mass, NaN);
  const coefficient = product.stoichCoefficient === '' || product.stoichCoefficient == null ? 1 : decimal(product.stoichCoefficient, NaN);
  if (!(mw > 0) || !Number.isFinite(mass) || mass < 0 || !(coefficient > 0)) return null;
  const theo = theoreticalMass(limiting?.moles || 0, mw, { ...experiment.units, mass: product.massUnit || experiment.units.mass }, limiting?.stoichCoefficient ?? 1, coefficient);
  return theo > 0 ? mass / theo * 100 : null;
}
export function validateReportProducts(products) {
  if (!Array.isArray(products)) throw new Error('Danh sách chất thu được phải là mảng.');
  const ids = new Set();
  for (const product of products) {
    if (!product?.id || ids.has(product.id)) throw new Error('ID chất thu được thiếu hoặc trùng.');
    ids.add(product.id);
    if (product.massUnit && !['g', 'mg'].includes(product.massUnit)) throw new Error('Đơn vị khối lượng chất thu được không hợp lệ.');
    if (!product.name?.trim()) throw new Error('Nhập mã hoặc tên chất thu được.');
    for (const key of ['mw', 'mass', 'stoichCoefficient']) {
      const value = product[key];
      if (value !== '' && value != null && (!Number.isFinite(decimal(value, NaN)) || decimal(value) < 0 || (key !== 'mass' && decimal(value) === 0))) throw new Error(`${product.name}: ${key} không hợp lệ.`);
    }
    if (!Array.isArray(product.plates) || product.plates.length !== 3) throw new Error('Mỗi chất cần 3 vị trí bản TLC sau cột.');
    for (const plate of product.plates) {
      if (!plate || typeof plate !== 'object') throw new Error('Bản TLC không hợp lệ.');
      if (plate.rf !== '' && plate.rf != null && (!Number.isFinite(decimal(plate.rf, NaN)) || decimal(plate.rf) < 0 || decimal(plate.rf) > 1)) throw new Error(`${product.name}: Rf phải trong khoảng 0–1.`);
    }
  }
}
