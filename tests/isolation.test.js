import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('demo adapter has no Firebase imports or network calls', () => { const source = fs.readFileSync('src/services/demoBackend.js', 'utf8'); assert.ok(!/from ['"]firebase|https?:\/\/|\bfetch\s*\(/.test(source)); });
test('built bundle contains no real Firebase endpoint or SDK chunks', () => { const files = fs.readdirSync('dist/assets').filter((name) => name.endsWith('.js')); assert.ok(files.length); for (const name of files) { const source = fs.readFileSync(`dist/assets/${name}`, 'utf8'); assert.ok(!/tonghophoad-default|firebaseio\.com|firebasedatabase\.app|identitytoolkit\.googleapis|firebasestorage\.googleapis/.test(source), name); assert.ok(!name.startsWith('firebase-')); } });
test('CSP prohibits external automatic connections and images', () => { const html = fs.readFileSync('dist/index.html', 'utf8'); assert.match(html, /connect-src 'self'/); assert.match(html, /img-src 'self' data: blob:/); assert.ok(!html.includes('fonts.googleapis.com')); });
