import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogKeyAction } from '../src/domain/keyboard.js';
test('Enter confirms single-line fields, Escape closes from multiline fields', () => {
  assert.equal(dialogKeyAction({ key: 'Enter', target: { tagName: 'INPUT', type: 'text' } }), 'confirm');
  assert.equal(dialogKeyAction({ key: 'Escape', target: { tagName: 'TEXTAREA' } }), 'close');
});
test('Enter preserves multiline, native buttons and selects instead of submitting twice', () => {
  for (const tagName of ['TEXTAREA', 'BUTTON', 'A', 'SELECT']) assert.equal(dialogKeyAction({ key: 'Enter', target: { tagName } }), null);
  for (const type of ['checkbox', 'radio', 'file', 'submit']) assert.equal(dialogKeyAction({ key: 'Enter', target: { tagName: 'INPUT', type } }), null);
  assert.equal(dialogKeyAction({ key: 'Enter', target: { isContentEditable: true } }), null);
});
test('IME confirmation, held keys and already handled events do not save', () => {
  for (const flags of [{ isComposing: true }, { keyCode: 229 }, { repeat: true }, { defaultPrevented: true }]) assert.equal(dialogKeyAction({ key: 'Enter', ...flags }), null);
});
