const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const presets = require('./presets.js');
const catalog = require('./catalog.js');
const codec = require('./codec.js');
const example = require('./example.json');

test('all color builds contain 50 supported bees and matching supported equipment', () => {
  for (const color of ['white', 'red', 'blue']) {
    const next = presets.applyHive(example, color, { gear: true });
    assert.equal(next.hive.length, 10);
    assert.equal(next.hive.flat().length, 50);
    assert.ok(next.hive.every(row => row.length === 5));
    for (const bee of next.hive.flat()) {
      assert.ok(catalog.bees.some(entry => entry.id === bee.type));
      assert.equal(bee.gifted, true);
      assert.equal(bee.bond, 25600000);
    }
    for (const slot of Object.keys(catalog.gear)) {
      assert.ok(catalog.gear[slot].some(entry => entry.id === next.currentGear[slot]));
      assert.equal(next.owned[next.currentGear[slot]], true);
    }
    assert.deepEqual(codec.decode(codec.encode(next)), next);
  }
  assert.equal(presets.composition('blue').find(bee => bee.id === 'buoyant').count, 17);
  assert.equal(presets.composition('red').find(bee => bee.id === 'spicy').count, 13);
  assert.equal(presets.composition('white').find(bee => bee.id === 'vector').count, 14);
});

test('hive-only presets preserve resources, gear, quests, and unknown fields', () => {
  const save = structuredClone(example);
  save.future = { keep: ['abc', 42] }; save.quests = [{ NPC: 'blackBear', unknown: true }];
  const before = structuredClone(save);
  const next = presets.applyHive(save, 'red', { level: 8, gifted: false });
  assert.deepEqual(save, before);
  for (const key of ['honey', 'pollen', 'currentGear', 'items', 'quests', 'NPCs', 'future']) assert.deepEqual(next[key], save[key]);
  assert.ok(next.hive.flat().every(bee => !bee.gifted && bee.bond === 6000));
  assert.ok(next.discoveredBees.includes('spicy'));
  assert.deepEqual(next.discoveredGifteds, []);
});

test('resize preserves bee metadata and appends empty slots; filling keeps existing bees', () => {
  const save = structuredClone(example);
  save.hive[0][0] = { type: 'digital', gifted: true, bond: 90000, mutation: { stat: 'attack', num: 1, oper: '+' }, beequip: { id: 123 }, radioactive: 5 };
  const next = presets.resizeHive(save, 50);
  assert.deepEqual(next.hive[0][0], save.hive[0][0]);
  assert.equal(next.hive.flat().length, 50);
  assert.ok(next.hive.flat().slice(25).every(bee => bee.type === null));
  const filled = presets.fillEmpty(next, 'basic');
  assert.deepEqual(filled.hive[0][0], save.hive[0][0]);
  assert.equal(filled.hive.flat().filter(bee => bee.type === 'basic').length, 49);
  assert.deepEqual(presets.resizeHive(filled, 25).hive, filled.hive.slice(0, 5));
  assert.equal(save.hive.flat().length, 25);
  for (const count of [24, 51, 30.5, NaN]) assert.throws(() => presets.resizeHive(save, count));
  assert.throws(() => presets.levelBond(21)); assert.throws(() => presets.levelBond(0));
});

test('progress presets top up valid items while preserving cooldowns and ongoing progress', () => {
  const save = structuredClone(example);
  save.items.royalJelly = [200000, 123]; save.honey = 6000000000000000;
  save.future = { hello: 'world' };
  for (const mode of ['headstart', 'endgame', 'everything']) {
    const next = presets.applyProgress(save, mode, 'red');
    assert.deepEqual(next.items.royalJelly, [200000, 123]);
    assert.equal(next.honey, save.honey);
    assert.deepEqual(next.NPCs, save.NPCs); assert.deepEqual(next.future, save.future);
    for (const id of Object.keys(next.items)) assert.ok(catalog.items.some(item => item.id === id), id);
    assert.deepEqual(codec.decode(codec.encode(next)), next);
  }
  const all = presets.applyProgress(example, 'everything');
  assert.equal(all.discoveredBees.length, 46); assert.equal(all.discoveredGifteds.length, 46);
  assert.equal(Object.keys(all.items).length, 81);
  assert.equal(all.hive.flat().length, 50);
  for (const choices of Object.values(catalog.gear)) for (const { id } of choices) if (id !== 'none') assert.equal(all.owned[id], true);
  const start = presets.applyProgress(example, 'headstart');
  assert.equal(start.hive.flat().length, 35); assert.equal(start.honey, 5000000);
});

test('browser catalog and presets work without Node globals', () => {
  const context = vm.createContext({}); context.window = context;
  vm.runInContext(fs.readFileSync(__dirname + '/catalog.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync(__dirname + '/presets.js', 'utf8'), context);
  assert.equal(context.SavePresets.composition('blue').reduce((n, entry) => n + entry.count, 0), 50);
});

if (process.env.BSS_GAME_SOURCE) test('every progress and color preset decodes with the actual game decoder', () => {
  const source = fs.readFileSync(process.env.BSS_GAME_SOURCE, 'utf8');
  const start = source.indexOf('function RUN_SAVE_CODE(string){');
  const end = source.indexOf('let save', start);
  const decode = new Function('string', source.slice(start, end).replace('function RUN_SAVE_CODE(string){', '') + 'return JSON.parse(string);');
  for (const mode of ['headstart', 'endgame', 'everything']) assert.deepEqual(decode(codec.encode(presets.applyProgress(example, mode))), presets.applyProgress(example, mode));
  for (const color of ['red', 'blue', 'white', 'mixed']) assert.deepEqual(decode(codec.encode(presets.applyHive(example, color))), presets.applyHive(example, color));
});
