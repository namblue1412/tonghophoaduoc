import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDecimal, emptyReagentInputs } from '../src/domain/display.js';
import { deriveExperiment } from '../src/domain/experiment.js';
import { cycleFraction, deleteAccidentalFraction, resizeFractions } from '../src/domain/fractions.js';

test('five decimal places with comma for every measurement and blank stays blank', () => {
  assert.equal(formatDecimal(0.06009999999999993), '0,06010');
  assert.equal(formatDecimal('0,9263'), '0,92630');
  assert.equal(formatDecimal(60.1), '60,10000');
  assert.equal(formatDecimal(100), '100,00000');
  assert.equal(formatDecimal(1e-9), '0,00000');
  assert.equal(formatDecimal('', ''), '');
  assert.equal(formatDecimal(-1e-10), '0,00000');
});
test('new reagent defaults never invent measured amount, density, or notes', () => {
  const result = emptyReagentInputs({ id: 'row', mw: '150', purity: '98', actualMass: '1', actualVolume: '5', density: '1.33', notes: 'preset' });
  assert.equal(result.purity, '100');
  for (const field of ['actualMass', 'actualVolume', 'density', 'notes', 'theoMass']) assert.equal(result[field], '');
  assert.equal(result.mw, '150');
});
test('screenshot weighing and theoretical yield agree in g and mg without display rounding affecting storage', () => {
  const raw = { units: { mass: 'g', mole: 'mol' }, stoichiometry: [{ id: 'sm', type: 'starting_material', mw: '270,42', actualMass: '0.0297', purity: '100', isLimiting: true }], targetMolecule: { molecularWeight: '394,99' }, workup: { crudeTubes: [{ tareMass: '0.9185', grossMass: '0.9747' }, { tareMass: '0.9199', grossMass: '0.9238' }] } };
  const grams = deriveExperiment(raw);
  assert.equal(formatDecimal(grams.workup.crudeTubes[0].crudeMass), '0,05620');
  assert.equal(formatDecimal(grams.workup.crudeTubes[1].crudeMass), '0,00390');
  assert.equal(formatDecimal(grams.workup.crudeMass), '0,06010');
  const theory = grams.columnAndYield.eppendorfYield.theoreticalYield;
  assert.equal(formatDecimal(theory), '0,04338');
  const mg = structuredClone(raw); mg.units = { mass: 'mg', mole: 'mmol' }; mg.stoichiometry[0].actualMass = '29.7';
  mg.workup.crudeTubes = [{ tareMass: '918.5', grossMass: '974.7' }, { tareMass: '919.9', grossMass: '923.8' }];
  const milligrams = deriveExperiment(mg);
  assert.equal(formatDecimal(milligrams.workup.crudeMass), '60,10000');
  assert.ok(Math.abs(theory * 1000 - milligrams.columnAndYield.eppendorfYield.theoreticalYield) < 1e-10);
  assert.ok(Math.abs(grams.workup.crudeMass / theory - milligrams.workup.crudeMass / milligrams.columnAndYield.eppendorfYield.theoreticalYield) < 1e-12);
});
const column = () => ({ fractions: [1, 2, 3].map((number) => ({ number, spotPattern: 'empty', group: null })), fractionGroups: [], fractionTlcPlates: [] });
test('physical disposal cycles to discarded then back to empty without removing the tube', () => {
  let c = column();
  for (const state of ['product', 'impurity', 'mixed', 'discarded', 'empty']) {
    c = cycleFraction(c, 2);
    assert.equal(c.fractions[1].spotPattern, state);
    assert.equal(c.fractions[1].discarded, state === 'discarded');
    assert.deepEqual(c.fractions.map((f) => f.number), [1, 2, 3]);
  }
});
test('accidental deletion preserves physical numbers when resizing after a gap', () => {
  const c = deleteAccidentalFraction(column(), 2);
  assert.deepEqual(c.fractions.map((f) => f.number), [1, 3]);
  assert.deepEqual(resizeFractions(c, 3).fractions.map((f) => f.number), [1, 3, 4]);
});
test('accidental deletion refuses used, discarded, grouped, and TLC-referenced tubes', () => {
  let c = cycleFraction(column(), 2);
  assert.throws(() => deleteAccidentalFraction(c, 2));
  c = column(); c.fractionTlcPlates = [{ spottedFractions: 'f2, F3' }];
  assert.throws(() => deleteAccidentalFraction(c, 2));
  c = column(); c.fractionGroups = [{ fractionNumbers: [2] }];
  assert.throws(() => deleteAccidentalFraction(c, 2));
});
