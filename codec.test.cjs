const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { decode, encode } = require('./codec.js');
const example = JSON.parse(fs.readFileSync(__dirname + '/example.json', 'utf8'));
test('example save survives encoding and decoding exactly', () => { assert.deepEqual(decode(encode(example)), example); });
test('edited resource, hive, item, and additional fields survive', () => {
  const save = structuredClone(example); save.honey = 123456789; save.items.royalJelly = 100;
  save.hive[0][0] = { type: 'basic', gifted: false, bond: 150, mutation: null };
  save.future = { nested: [true, false, null, -3.5, 'BrownBearAmuletFieldTokens'], text: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' };
  assert.deepEqual(decode(encode(save)), save);
});
test('rejects malformed codes, unrelated JSON, reserved symbols, and unsafe numbers', () => {
  assert.throws(() => decode('not-a-save'));
  assert.throws(() => encode({}));
  assert.throws(() => encode({ ...example, honey: Infinity }));
  assert.throws(() => encode({ ...example, honey: Number.MAX_SAFE_INTEGER + 1 }));
  assert.throws(() => encode({ ...example, test: 'Θ' }));
});
test('browser API loads without Node globals', () => {
  const context = vm.createContext({}); vm.runInContext(fs.readFileSync(__dirname + '/codec.js', 'utf8'), context);
  assert.equal(typeof context.SaveCodec.decode, 'function');
});
if (process.env.BSS_ORIGINAL_SAVE) test('original user code round-trips byte for byte', () => {
  const code = fs.readFileSync(process.env.BSS_ORIGINAL_SAVE, 'utf8').trim();
  assert.equal(encode(decode(code)), code);
});
