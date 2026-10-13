(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./features'), require('./presets'), require('./codec'), require('./game-data'));
  else root.EditorTools = factory(root.SaveTools, root.SavePresets, root.SaveCodec, root.GameData);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(tools, presets, codec, data) {
  'use strict';
  function slot(save, index) { tools.number(index, 0, save.hive.flat().length - 1, true); return save.hive[Math.floor(index / 5)][index % 5]; }
  function compatible(bee) {
    if (!bee.beequip) return true;
    const meta = data.beequips.find(item => item.id === bee.beequip.type);
    return meta && bee.type && tools.level(bee) >= meta.level && (!meta.gifted || bee.gifted) && (['all','any'].includes(meta.color) || meta.color === data.bees[bee.type]?.color) && (!meta.types.length || meta.types.includes(bee.type));
  }
  function repair(next) {
    for (const bee of next.hive.flat()) if (!compatible(bee)) delete bee.beequip;
    tools.syncBeequips(next); tools.discover(next); codec.encode(next); return next;
  }
  function editSelected(save, indexes, options) {
    if (!indexes.length) throw new Error('Select at least one bee.');
    for (const index of indexes) slot(save,index);
    const next = tools.clone(save), edited = tools.bulkBees(save, options);
    for (const index of new Set(indexes)) next.hive[Math.floor(index/5)][index%5] = tools.clone(slot(edited,index));
    return repair(next);
  }
  function copyBee(save, from, to) {
    if (from === to) throw new Error('Choose a different destination slot.');
    const source = slot(save,from); slot(save,to);
    const next = tools.clone(save), bee = tools.clone(source);
    // A beequip is one owned object, so copying a bee does not duplicate it.
    delete bee.beequip;
    next.hive[Math.floor(to/5)][to%5] = bee; return repair(next);
  }
  function swapBees(save, from, to) {
    slot(save,from); slot(save,to); const next = tools.clone(save);
    const a = slot(next,from), b = slot(next,to);
    next.hive[Math.floor(from/5)][from%5] = b; next.hive[Math.floor(to/5)][to%5] = a;
    return repair(next);
  }
  function guided(save, options) {
    let next;
    if (options.stage === 'hive') next = presets.applyHive(save,options.color,{level:options.level,gifted:options.gifted,gear:options.gear});
    else {
      if (!['headstart','endgame','everything'].includes(options.stage)) throw new Error('Choose a preset stage.');
      next = presets.applyProgress(save,options.stage,options.color);
      if (options.stage !== 'everything') next = presets.applyHive(next,options.color,{level:options.level,gifted:options.gifted,gear:options.stage === 'headstart' ? false : options.gear});
      else next = tools.bulkBees(next,{level:options.level,gifted:options.gifted});
      if (!options.gear) { next.currentGear = tools.clone(save.currentGear); if (options.stage !== 'everything') next.owned = tools.clone(save.owned || {}); }
    }
    next = presets.resizeHive(next,options.count); return repair(next);
  }
  function draft(save, original, section, pendingJSON = null) {
    codec.encode(save); codec.encode(original);
    return {format:'bss-editor-draft',version:1,savedAt:Date.now(),save:tools.clone(save),original:tools.clone(original),section,pendingJSON};
  }
  function readDraft(value) {
    const parsed = JSON.parse(value);
    if (parsed?.format !== 'bss-editor-draft' || parsed.version !== 1 || !Number.isFinite(parsed.savedAt)) throw new Error('Unsupported draft.');
    codec.encode(parsed.save); codec.encode(parsed.original);
    if (parsed.pendingJSON != null && typeof parsed.pendingJSON !== 'string') throw new Error('Invalid pending JSON.');
    return parsed;
  }
  return {editSelected,copyBee,swapBees,guided,draft,readDraft};
});
