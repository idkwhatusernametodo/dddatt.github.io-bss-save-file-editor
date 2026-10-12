/* Save editing helpers. Game schemas: https://github.com/Dddatt/bss/blob/main/index.js */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./codec'), require('./catalog'), require('./presets'), require('./game-data'));
  else root.SaveTools = factory(root.SaveCodec, root.GameCatalog, root.SavePresets, root.GameData);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(codec, catalog, presets, data) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function number(value, min = 0, max = Number.MAX_SAFE_INTEGER, integer = false) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`Use ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}.`);
    return value;
  }
  function level(bee) {
    let result = 1;
    for (let i = 1; i <= 20; i++) if ((bee.bond || 0) >= presets.levelBond(i)) result = i;
    return result;
  }
  function discover(save) {
    save.discoveredBees ??= []; save.discoveredGifteds ??= [];
    for (const bee of save.hive.flat()) if (bee.type) {
      if (!save.discoveredBees.includes(bee.type)) save.discoveredBees.push(bee.type);
      if (bee.gifted && !save.discoveredGifteds.includes(bee.type)) save.discoveredGifteds.push(bee.type);
    }
    save.stats ??= {}; save.stats.beeTypes = save.discoveredBees.length;
  }
  function bulkBees(save, options) {
    const next = clone(save);
    const bond = options.level === undefined ? null : presets.levelBond(options.level);
    const valid = ['attack', 'abilityRate', 'gatherAmount', 'convertAmount', 'maxEnergy'];
    if (options.mutation && (!valid.includes(options.mutation.stat) || !['+', '*'].includes(options.mutation.oper))) throw new Error('Choose a supported mutation.');
    if (options.mutation) number(options.mutation.num, options.mutation.oper === '*' ? 0.01 : 0);
    for (const bee of next.hive.flat()) if (bee.type) {
      if (bond !== null) bee.bond = bond;
      if (options.gifted !== undefined) bee.gifted = !!options.gifted;
      if (options.mutation !== undefined) {
        if (options.mutation === null) delete bee.mutation;
        else bee.mutation = clone(options.mutation);
      }
    }
    discover(next); return next;
  }
  function hiveStats(save) {
    const bees = save.hive.flat().filter(bee => bee.type);
    const colors = { red: 0, blue: 0, white: 0, unknown: 0 };
    for (const bee of bees) { const color = data.bees[bee.type]?.color || 'unknown'; colors[color] = (colors[color] || 0) + 1; }
    return { slots: save.hive.flat().length, active: bees.length, types: new Set(bees.map(b => b.type)).size, gifted: bees.filter(b => b.gifted).length, giftedTypes: new Set(bees.filter(b => b.gifted).map(b => b.type)).size, events: bees.filter(b => (data.bees[b.type]?.group || '').toLowerCase() === 'event' || (data.bees[b.type]?.rarity || '').toLowerCase() === 'event').length, averageLevel: bees.length ? bees.reduce((sum, bee) => sum + level(bee), 0) / bees.length : 0, colors };
  }
  function syncBeequips(save) {
    const equipment = save.currentGear.beequips || [];
    if (equipment.length) {
      save.extraInfo ??= {};
      save.extraInfo.beequipIds = Math.max(save.extraInfo.beequipIds || 0, ...equipment.map(item => (Number(item.id) || 0) + 1));
    }
    const byId = new Map(equipment.map(item => [item.id, item]));
    const assigned = new Set();
    save.hive.forEach((row, y) => row.forEach((bee, x) => {
      if (!bee.beequip) return;
      const item = byId.get(bee.beequip.id);
      if (!bee.type || !item || assigned.has(item.id)) { delete bee.beequip; return; }
      item.bee = [x, y]; assigned.add(item.id); bee.beequip = clone(item);
    }));
    for (const item of equipment) if (!assigned.has(item.id)) item.bee = null;
    return save;
  }
  function inventory(save, group, quantity) {
    number(quantity, 0, Number.MAX_SAFE_INTEGER, true);
    const next = clone(save);
    const groups = {
      eggs: catalog.items.filter(item => /egg$/i.test(item.id)).map(item => item.id),
      materials: ['redExtract','blueExtract','glitter','glue','oil','enzymes','tropicalDrink','softWax','hardWax','causticWax','swirledWax','turpentine','superSmoothie'],
      consumables: ['royalJelly','starJelly','treat','ticket','gumdrops','stinger','microConverter','fieldDice','smoothDice','loadedDice','redExtract','blueExtract','glitter','glue','oil','enzymes','tropicalDrink','purplePotion','superSmoothie'],
      all: catalog.items.map(item => item.id)
    };
    if (!groups[group]) throw new Error('Choose an inventory shortcut.');
    for (const id of groups[group].filter(id => catalog.items.some(item => item.id === id))) {
      if (Array.isArray(next.items[id])) next.items[id][0] = quantity;
      else next.items[id] = quantity;
    }
    return next;
  }
  function drives(save, values) {
    const next = clone(save); next.extraInfo ??= {}; next.extraInfo.drives ??= {};
    for (const color of ['red','blue','white','glitched']) next.extraInfo.drives[color] = number(values[color], 0, 50, true);
    next.extraInfo.drives.maxed = ['red','blue','white','glitched'].every(color => next.extraInfo.drives[color] === 50);
    return next;
  }
  function balloon(save, pollen, blessing) {
    number(pollen, 0, Number.MAX_SAFE_INTEGER, true); number(blessing, 0, 1000, true);
    const next = clone(save);
    // The game recomputes blessing from maxPollen each frame; write both values.
    const maxPollen = blessing ? Math.floor(Math.pow((blessing + 4) / 2, 7)) : pollen;
    number(maxPollen, 0, Number.MAX_SAFE_INTEGER, true);
    if (pollen && blessing && pollen > maxPollen) throw new Error('This blessing is too small for that much balloon pollen. Increase the blessing or reduce pollen.');
    const size = pollen ? Math.pow(pollen, 1 / 7) / 10 + 0.4 : 0;
    next.hiveBalloon = { ...next.hiveBalloon, pollen, blessing, maxPollen: Math.max(pollen, maxPollen), size, displaySize: size, deflateTimer: 10 };
    return next;
  }
  function parseStats(text, beequip = false) {
    if (!text) return [];
    return text.split(',').filter(Boolean).map(raw => {
      const m = raw.trim().match(/^([+*])(-?\d+(?:\.\d+)?)\s+(\w+)(?:\(([+-]?\d+(?:\.\d+)?)\))?$/);
      if (m) return { op: m[1], value: Number(m[2]), stat: m[3], wax: Number(m[4] || 0) };
      const p = raw.trim().match(/^P\s+(\w+)$/);
      return p ? { op: 'P', stat: p[1] } : { raw };
    });
  }
  function serializeStats(entries, beequip = false) {
    return entries.map(entry => {
      if (entry.raw !== undefined) return entry.raw;
      if (entry.op === 'P' && !beequip) return 'P ' + entry.stat;
      if (!['+', '*'].includes(entry.op) || !/^\w+$/.test(entry.stat)) throw new Error('Invalid bonus.');
      number(entry.value, entry.op === '*' ? 0.01 : 0);
      const wax = number(entry.wax || 0, -Number.MAX_SAFE_INTEGER);
      return entry.op + entry.value + ' ' + entry.stat + (beequip ? '(' + (wax >= 0 ? '+' : '') + wax + ')' : '');
    }).join(',');
  }
  function amulet(save, slot, entries, passives) {
    const meta = data.amuletSlots.find(entry => entry.id === slot);
    if (!meta) throw new Error('Choose a supported amulet.');
    const validStats = new Set(data.playerStats.map(entry => entry.id));
    for (const entry of entries) if (!entry.raw && !validStats.has(entry.stat)) throw new Error('Choose a supported amulet stat.');
    const names = [...new Set(passives.filter(Boolean))];
    if (names.length > (meta.maxPassives || 0)) throw new Error('Too many passives for this amulet.');
    for (const id of names) if (!(meta.passives || []).includes(id)) throw new Error('Choose a supported passive for this amulet.');
    const next = clone(save);
    for (const other of data.amuletSlots) if (other.family === meta.family && other.id !== slot) delete next.currentGear[other.id];
    next.currentGear[slot] = serializeStats([...entries, ...names.map(stat => ({ op: 'P', stat }))]);
    return next;
  }
  function effect(save, id, amount, seconds) {
    const meta = data.effects.find(entry => entry.id === id);
    if (!meta || meta.isPassive) throw new Error('Choose a supported buff.');
    if (meta.amountFromCooldown && seconds !== null) amount = seconds / meta.maxCooldown;
    number(amount, meta.amountFromCooldown ? 0.000001 : 1, meta.maxAmount ?? Number.MAX_SAFE_INTEGER);
    if (seconds !== null) number(seconds, 0.01, meta.maxCooldown ?? Number.MAX_SAFE_INTEGER);
    if (seconds === null && meta.maxCooldown !== null) throw new Error('This buff has a finite duration.');
    const next = clone(save); next.effects ??= [];
    const existing = next.effects.find(entry => entry.type === id);
    if (existing) Object.assign(existing, { amount, cooldown: seconds });
    else next.effects.push({ type: id, amount, cooldown: seconds });
    return next;
  }
  function derivedStat(save, key) {
    if (key === 'beeTypes') return (save.discoveredBees || []).length;
    const match = key.match(/^beesToLevel(\d+)$/);
    if (match) return save.hive.flat().filter(bee => bee.type && level(bee) >= Number(match[1])).length;
    return save.stats?.[key] || 0;
  }
  function questProgress(save, index, portion, progress) {
    const next = clone(save), req = next.quests?.[index]?.req?.[portion];
    if (!Array.isArray(req) || typeof req[1] !== 'number') throw new Error('This quest requirement is unsupported.');
    number(progress, 0, req[1]);
    req[2] = derivedStat(next, req[0]) - progress;
    req[3] = progress >= req[1];
    return next;
  }
  function addQuest(save, id) {
    const meta = data.quests.find(entry => entry.id === id);
    if (!meta) throw new Error('Choose a quest from the list.');
    const next = clone(save); next.quests ??= []; next.NPCs[meta.NPC] ??= { index: 0, index_beesmas: 0 };
    if (next.quests.some(quest => quest.NPC === meta.NPC && !!quest.isBeesmasQuest === !!meta.isBeesmasQuest)) throw new Error('Remove the current quest from this NPC before adding another.');
    next.NPCs[meta.NPC][meta.isBeesmasQuest ? 'index_beesmas' : 'index'] = meta.npcIndex;
    next.quests.unshift({ name: meta.name, NPC: meta.NPC, isBeesmasQuest: !!meta.isBeesmasQuest, req: meta.req.map(req => [req[0], req[1], /^(beeTypes|beesToLevel)/.test(req[0]) ? 0 : derivedStat(next, req[0])]) });
    return next;
  }
  function makeBuild(save, name, includeResources = false) {
    name = String(name).trim(); if (!name || name.length > 80) throw new Error('Name your build (1–80 characters).');
    const build = { format: 'bss-editor-build', version: 1, name, hive: clone(save.hive), currentGear: clone(save.currentGear) };
    if (includeResources) build.resources = { honey: save.honey || 0, pollen: save.pollen || 0, items: clone(save.items), drives: clone(save.extraInfo?.drives || {}) };
    return build;
  }
  function applyBuild(save, build) {
    if (!build || build.format !== 'bss-editor-build' || build.version !== 1 || typeof build.name !== 'string' || build.name.length > 80 || !Array.isArray(build.hive) || !build.currentGear || typeof build.currentGear !== 'object' || Array.isArray(build.currentGear)) throw new Error('Choose a BSS editor build file.');
    const next = clone(save);
    next.hive = clone(build.hive); next.currentGear = { ...next.currentGear, ...clone(build.currentGear) };
    if (next.hive.flat().length < 25 || next.hive.flat().length > 50 || next.hive.some((row, index) => !Array.isArray(row) || row.length > 5 || !row.length || (index < next.hive.length - 1 && row.length !== 5))) throw new Error('Builds must have 25–50 slots in rows of five (the final row can be shorter).');
    for (const bee of next.hive.flat()) if (bee.type && !catalog.bees.some(entry => entry.id === bee.type)) throw new Error('This build contains an unknown bee.');
    if (build.resources) {
      number(build.resources.honey); number(build.resources.pollen);
      next.honey = build.resources.honey; next.pollen = build.resources.pollen;
      for (const [id, value] of Object.entries(build.resources.items || {})) {
        if (!catalog.items.some(entry => entry.id === id)) continue;
        const amount = Array.isArray(value) ? value[0] : value; number(amount, 0, Number.MAX_SAFE_INTEGER, true);
        if (Array.isArray(next.items[id])) next.items[id][0] = amount; else next.items[id] = amount;
      }
      if (['red','blue','white','glitched'].every(id => typeof build.resources.drives?.[id] === 'number')) {
        const d = drives(next, build.resources.drives); next.extraInfo = d.extraInfo;
      }
    }
    next.owned ??= {};
    for (const slot of Object.keys(catalog.gear)) {
      const id = next.currentGear[slot];
      if (id && id !== 'none') {
        if (!catalog.gear[slot].some(entry => entry.id === id)) throw new Error('Build has unsupported equipment.');
        next.owned[id] = true;
      }
    }
    discover(next); syncBeequips(next); codec.encode(next); return next;
  }
  function customize(save, options) {
    let next = presets.applyHive(save, options.color, { level: options.level, gifted: options.gifted, gear: options.gear });
    next = presets.resizeHive(next, options.count);
    if (options.honey !== null) next.honey = number(options.honey);
    if (options.supplies !== null) next = inventory(next, 'all', options.supplies);
    syncBeequips(next); discover(next); return next;
  }
  function diff(before, after, path = '') {
    if (equal(before, after)) return [];
    if (before && after && typeof before === 'object' && typeof after === 'object' && Array.isArray(before) === Array.isArray(after)) {
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
      return [...keys].flatMap(key => diff(before[key], after[key], path ? path + '.' + key : key));
    }
    return [{ path, before, after }];
  }
  class History {
    constructor(save, limit = 100) { this.entries = [{ save: clone(save), label: 'Imported save' }]; this.index = 0; this.limit = limit; this.key = null; this.time = 0; }
    record(save, label = 'Edit', key = null) {
      if (equal(this.entries[this.index].save, save)) return;
      const now = Date.now(), coalesce = key && key === this.key && now - this.time < 1000 && this.index > 0 && this.index === this.entries.length - 1;
      if (coalesce) this.entries[this.index] = { save: clone(save), label };
      else { this.entries.splice(this.index + 1); this.entries.push({ save: clone(save), label }); if (this.entries.length > this.limit + 1) this.entries.shift(); this.index = this.entries.length - 1; }
      this.key = key; this.time = now;
    }
    get canUndo() { return this.index > 0; }
    get canRedo() { return this.index < this.entries.length - 1; }
    undo() { if (this.canUndo) this.index--; this.key = null; return clone(this.entries[this.index].save); }
    redo() { if (this.canRedo) this.index++; this.key = null; return clone(this.entries[this.index].save); }
  }
  function beequip(save, id, changes, slot = null) {
    const next = clone(save); next.currentGear.beequips ??= []; next.extraInfo ??= {};
    let item = next.currentGear.beequips.find(entry => entry.id === id);
    const type = changes.type || item?.type;
    const meta = data.beequips.find(entry => entry.id === type);
    if (!meta) throw new Error('Choose a supported beequip.');
    if (!item) {
      const taken = next.currentGear.beequips.map(entry => entry.id);
      const newId = Math.max(next.extraInfo.beequipIds || 0, 0, ...taken.map(value => value + 1));
      next.extraInfo.beequipIds = newId + 1;
      item = { type, id: newId, bee: null, stats: clone(meta.stats), potential: 3, waxes: [] };
      next.currentGear.beequips.push(item);
    }
    if (changes.potential !== undefined) item.potential = number(changes.potential, 1, 5, true);
    if (changes.stats) {
      for (const kind of ['bee','player']) {
        const allowed = new Set(meta[kind === 'bee' ? 'beeStats' : 'playerStats']);
        for (const stat of parseStats(changes.stats[kind], true)) if (!stat.raw && !allowed.has(stat.stat)) throw new Error('This bonus is not supported by this beequip.');
      }
      item.stats = clone(changes.stats);
    }
    // Unassign the old location before replacing or removing its target.
    for (const bee of next.hive.flat()) if (bee.beequip?.id === item.id) delete bee.beequip;
    item.bee = null;
    if (slot !== null) {
      number(slot, 0, next.hive.flat().length - 1, true);
      const target = next.hive.flat()[slot];
      if (!target.type) throw new Error('Choose an occupied hive slot.');
      if (level(target) < meta.level || (meta.gifted && !target.gifted) || (meta.color !== 'any' && meta.color !== 'all' && meta.color !== data.bees[target.type]?.color) || (meta.types?.length && !meta.types.includes(target.type))) throw new Error('That bee does not meet this beequip’s level, color, or type requirements.');
      if (target.beequip) { const displaced = next.currentGear.beequips.find(entry => entry.id === target.beequip.id); if (displaced) displaced.bee = null; }
      item.bee = [slot % 5, Math.floor(slot / 5)]; target.beequip = clone(item);
    }
    return next;
  }
  function removeBeequip(save, id) {
    const next = clone(save);
    next.currentGear.beequips = (next.currentGear.beequips || []).filter(entry => entry.id !== id);
    for (const bee of next.hive.flat()) if (bee.beequip?.id === id) delete bee.beequip;
    return next;
  }
  return { clone, number, level, discover, bulkBees, hiveStats, syncBeequips, inventory, drives, balloon, parseStats, serializeStats, amulet, effect, derivedStat, questProgress, addQuest, makeBuild, applyBuild, customize, diff, History, beequip, removeBeequip };
});
