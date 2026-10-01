import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { makeTlcZip } from '../src/services/downloads.js';
test('one ZIP preserves three images and original capture metadata', () => {
  const url = 'data:image/png;base64,AQID';
  const files = unzipSync(makeTlcZip({ uv254: url, uv365: url, reagent: url }, 'TLC_1', { timestamp: '2026-09-29T03:00:00Z' }));
  assert.equal(Object.keys(files).length, 4);
  assert.deepEqual([...files['TLC_1_uv254.png']], [1, 2, 3]);
  assert.equal(JSON.parse(strFromU8(files['metadata.json'])).timestamp, '2026-09-29T03:00:00Z');
});
test('local SVG data URL is decoded and ZIP paths are safe', () => {
  const files = unzipSync(makeTlcZip({ uv254: 'data:image/svg+xml,%3Csvg%2F%3E' }, '../TLC'));
  assert.ok(Object.keys(files).every((name) => !name.includes('/') && !name.includes('..')));
  assert.equal(strFromU8(Object.values(files).find((_, i) => Object.keys(files)[i].endsWith('.svg'))), '<svg/>');
});
test('ZIP refuses remote images and empty image sets', () => {
  assert.throws(() => makeTlcZip({ uv254: 'https://example.invalid/a.png' }, 'TLC'));
  assert.throws(() => makeTlcZip({}, 'TLC'));
});
