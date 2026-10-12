import test from 'node:test';
import assert from 'node:assert/strict';
import { blankReportProduct, productReportYield, validateReportProducts, REPORT_SECTIONS } from '../src/domain/report.js';
import { deriveExperiment, validateImport } from '../src/domain/experiment.js';

test('three independent blank TLC plates, each with three image slots', () => {
  const p = blankReportProduct();
  assert.equal(p.plates.length, 3);
  assert.equal(p.mw, ''); assert.equal(p.mass, '');
  p.plates[0].images.uv254 = 'test';
  assert.equal(p.plates[1].images.uv254, '');
  assert.equal(p.plates[2].rf, '');
});
test('post-column Rf zero valid, invalid Rf and duplicate products rejected', () => {
  const p = { ...blankReportProduct(), name: 'P1' };
  p.plates[0].rf = '0'; validateReportProducts([p]);
  p.plates[0].rf = '1,00001'; assert.throws(() => validateReportProducts([p]));
  p.plates[0].rf = ''; assert.throws(() => validateReportProducts([p, p]));
});
test('per-product yield stays physical through unit switches without altering original results', () => {
  const exp = { units: { mass: 'g', mole: 'mol' }, stoichiometry: [{ isLimiting: true, moles: 0.01 }] };
  const p = { mw: '200', mass: '1600', massUnit: 'mg', stoichCoefficient: '' };
  assert.equal(productReportYield(p, exp), 80);
  assert.equal(productReportYield(p, { units: { mass: 'mg', mole: 'mmol' }, stoichiometry: [{ isLimiting: true, moles: 10 }] }), 80);
  assert.equal(productReportYield({ ...p, mw: '' }, exp), null);
});
test('saved three-system TLC survives derivation and import, unsafe values rejected', () => {
  const p = { ...blankReportProduct(), name: 'P1', mw: '200', mass: '0,02' };
  p.plates.forEach((t, i) => { t.eluent = `System ${i}`; t.rf = String(i / 3); });
  const exp = { id: 'REPORT-TEST', title: 'Test', code: 'P', reportProducts: [p], stoichiometry: [] };
  assert.deepEqual(deriveExperiment(exp).reportProducts, [p]);
  assert.deepEqual(validateImport([exp])[0].reportProducts, [p]);
  p.plates[1].rf = 'Infinity'; assert.throws(() => validateImport([exp]));
  assert.equal(new Set(REPORT_SECTIONS.map(([key]) => key)).size, REPORT_SECTIONS.length);
  assert.ok(!REPORT_SECTIONS.some(([key]) => key === 'auditTrail'));
});
