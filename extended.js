'use strict';
let selectedSlot = 0, selectedAmulet = 'supremeStarAmulet', selectedBeequip = null;
let amuletDraft = [], amuletPassiveDraft = [], beequipDraft = null;
let compareSave = null, compareName = 'Imported save', diffLimit = 100;
let buildLibrary = [];
const libraryKey = 'bss-editor-builds-v1', themeKey = 'bss-editor-theme';
const activeBuffs = GameData.effects.filter(effect => !effect.isPassive && effect.saved);
let selectedBuff = activeBuffs.find(effect => effect.isNectar)?.id || activeBuffs[0].id;
let questNPC = GameData.quests[0]?.NPC || 'blackBear', chosenQuest = null;
let compareGearSlot = 'tool', compareGearId = 'gummyBaller';

function el(tag, text = '', className = '') {
  const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node;
}
function button(parent, text, action, className = '') {
  const node = el('button', text, className); node.type = 'button'; node.addEventListener('click', () => run(action)); parent.append(node); return node;
}
function selectControl(parent, title, value, entries, onChange, empty = null) {
  const label = el('label', title), select = el('select');
  if (empty !== null) select.add(new Option(empty, ''));
  for (const entry of entries) select.add(new Option(entry.name, entry.id));
  if (value && !entries.some(entry => entry.id === String(value))) select.add(new Option(humanize(String(value)) + ' (from your save)', value));
  select.value = value ?? ''; select.addEventListener('change', () => run(() => onChange(select.value)));
  label.append(select); parent.append(label); return select;
}
function draftNumber(parent, title, value, callback, min = 0, max = Number.MAX_SAFE_INTEGER, step = 'any') {
  const label = el('label', title), input = el('input');
  input.type = 'number'; input.min = String(min); input.max = String(max); input.step = step; input.required = true; input.value = value;
  input.addEventListener('input', () => { if (input.checkValidity()) callback(Number(input.value)); });
  label.append(input); parent.append(label); return input;
}
function validWithin(id) {
  for (const input of $(id).querySelectorAll('input,select')) if (!input.checkValidity()) { input.reportValidity(); throw new Error('Fix the highlighted field before applying.'); }
}
function commitSave(next, label) { applyPreset(() => next, label); }
function statsName(id) { return GameData.playerStats.find(entry => entry.id === id)?.name || humanize(id); }
function prettyNumber(value) { return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }); }

function renderExtras() {
  renderDrives(); renderAmulet(); renderBeequips(); renderBuffs(); renderQuests(); renderGearComparison(); renderBuilds();
  $('balloon-pollen').value = Math.round(save.hiveBalloon?.pollen || 0);
  $('balloon-blessing').value = Math.round(save.hiveBalloon?.blessing || 0);
  if (!$('review-panel').hidden) renderReview();
}
function renderSection(mode) {
  if (!save) return;
  if (mode === 'hive') renderHive();
  if (mode === 'amulets') renderAmulet();
  if (mode === 'beequips') renderBeequips();
  if (mode === 'boosts') renderBuffs();
  if (mode === 'quests') renderQuests();
  if (mode === 'gear') renderGearComparison();
}
function resetSessionViews() {
  selectedSlot = 0; selectedBeequip = null;
  compareSave = null; compareName = 'Imported save'; diffLimit = 100;
  $('diff-search').value = '';
}
function refreshExtras() {
  if (!$('hive-panel').hidden) { renderHiveOverview(); renderHiveStats(); }
  if (!$('review-panel').hidden) renderReview();
  if (!$('gear-panel').hidden) updateGearComparison();
}
function renderDrives() {
  $('drives').replaceChildren();
  for (const color of ['red','blue','white','glitched']) {
    field($('drives'), humanize(color) + ' drives', save.extraInfo?.drives?.[color] || 0, value => {
      const values = Object.fromEntries(['red','blue','white','glitched'].map(id => [id, save.extraInfo?.drives?.[id] || 0])); values[color] = value;
      save = SaveTools.drives(save, values);
    }, { min: 0, max: 50, step: '1' });
  }
}
function beeName(type) { return GameCatalog.bees.find(bee => bee.id === type)?.name || (type ? humanize(type) : 'Empty slot'); }
function beePicture(type) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox','0 0 48 48'); svg.setAttribute('aria-hidden','true'); svg.classList.add('bee-picture');
  if (type && GameData.bees[type]?.icon) {
    const image = document.createElementNS('http://www.w3.org/2000/svg','image'); image.setAttribute('href',GameData.bees[type].icon); image.setAttribute('width','48'); image.setAttribute('height','48'); svg.append(image); return svg;
  }
  const color = GameData.bees[type]?.color, fill = !type ? '#dce4df' : color === 'red' ? '#ee9e97' : color === 'blue' ? '#9dc7ed' : '#f5dfa2';
  const shape = (tag, attrs) => { const n = document.createElementNS(svg.namespaceURI,tag); for (const [key,value] of Object.entries(attrs)) n.setAttribute(key,value); svg.append(n); return n; };
  shape('ellipse',{cx:14,cy:9,rx:9,ry:6,fill:'#e7f1f7'}); shape('ellipse',{cx:34,cy:9,rx:9,ry:6,fill:'#e7f1f7'});
  shape('rect',{x:5,y:12,width:38,height:30,rx:8,fill,stroke:'#526458','stroke-width':1.5});
  if (type) {
    shape('rect',{x:5,y:12,width:9,height:30,rx:5,fill:'#3c4c43',opacity:.5});
    shape('circle',{cx:22,cy:24,r:2.8,fill:'#26382c'}); shape('circle',{cx:35,cy:24,r:2.8,fill:'#26382c'});
    shape('path',{d:type==='angry'||type==='rage'||type==='demon'?'M23 34Q28 29 34 34':'M23 32Q28 37 34 32',fill:'none',stroke:'#26382c','stroke-width':2});
    if (['digital','music','precise'].includes(type)) shape('path',{d:'M17 18H40V28H17Z',fill:'none',stroke:'#26382c','stroke-width':1.5});
    if (['buoyant','bubble','tadpole'].includes(type)) shape('circle',{cx:12,cy:12,r:5,fill:'#5eaddf',stroke:'#edfaff'});
    if (['spicy','fire'].includes(type)) shape('path',{d:'M22 14L25 3L32 15Z',fill:'#dd6245'});
  } else { const t = shape('text',{x:24,y:33,'text-anchor':'middle',fill:'#7d8b81','font-size':23}); t.textContent = '+'; }
  return svg;
}
function renderHiveStats() {
  const stats = SaveTools.hiveStats(save); $('hive-stats').replaceChildren();
  const entries = [`${stats.active} / ${stats.slots} bees`, `${stats.types} types`, `${stats.giftedTypes} gifted types`, `${stats.events} event bees`, `Avg. level ${stats.averageLevel.toFixed(1)}`, `${stats.colors.red} red`, `${stats.colors.blue} blue`, `${stats.colors.white} white`];
  for (const text of entries) $('hive-stats').append(el('span', text));
}
function renderHiveOverview() {
  $('hive').replaceChildren();
  save.hive.flat().forEach((bee, index) => {
    const tile = el('button', '', 'hive-tile'); tile.type = 'button';
    tile.setAttribute('aria-label', `Slot ${index + 1}: ${beeName(bee.type)}${bee.gifted && bee.type ? ', gifted' : ''}`);
    tile.setAttribute('aria-pressed', String(index === selectedSlot));
    tile.classList.toggle('selected', index === selectedSlot); tile.dataset.color = GameData.bees[bee.type]?.color || 'empty';
    tile.append(beePicture(bee.type), el('span', bee.type ? beeName(bee.type).replace(/ Bee$/, '') : 'Empty', 'tile-name'));
    tile.append(el('small', `${index + 1} · ${bee.type ? 'Lv. ' + SaveTools.level(bee) : '—'}${bee.gifted && bee.type ? ' ★' : ''}`));
    tile.addEventListener('click', () => { selectedSlot = index; renderHiveOverview(); renderBeeDetail(); });
    $('hive').append(tile);
  });
}
function renderHive() {
  selectedSlot = Math.min(selectedSlot, Math.max(save.hive.flat().length - 1, 0));
  renderHiveOverview(); renderHiveStats(); renderBeeDetail();
}
function renderBeeDetail() {
  const bee = save.hive.flat()[selectedSlot]; $('bee-detail').replaceChildren(); if (!bee) return;
  $('bee-detail').append(el('h3', `Slot ${selectedSlot + 1} · ${beeName(bee.type)}`));
  const fields = el('div', '', 'field-grid'); fields.id = 'selected-bee-fields'; $('bee-detail').append(fields);
  selectControl(fields, 'Bee type', bee.type, GameCatalog.bees, value => {
    bee.type = value || null;
    if (!bee.type || (bee.beequip && !compatibleBeequip(bee.beequip.type, bee))) {
      const item = save.currentGear.beequips?.find(item => item.id === bee.beequip?.id); if (item) item.bee = null; delete bee.beequip;
    }
    SaveTools.discover(save); changed('Change bee in slot ' + (selectedSlot + 1)); renderHive(); renderBeequips();
  }, 'Empty slot');
  const levelInput = field(fields, 'Level', SaveTools.level(bee), value => { bee.bond = SavePresets.levelBond(value); bondInput.value = bee.bond; }, { min: 1, max: 20, step: '1' });
  const bondInput = field(fields, 'Bond', bee.bond || 0, value => { bee.bond = value; levelInput.value = SaveTools.level(bee); }, { step: '1' });
  const giftedLabel = el('label','', 'checkbox'); const gifted = el('input'); gifted.type = 'checkbox'; gifted.checked = !!bee.gifted;
  gifted.addEventListener('change', () => { bee.gifted = gifted.checked; SaveTools.discover(save); changed('Change gifted status of slot ' + (selectedSlot + 1)); });
  giftedLabel.append(gifted, 'Gifted'); fields.append(giftedLabel);
  const mutation = el('div', '', 'field-grid'); mutation.id = 'selected-mutation'; $('bee-detail').append(el('h4', 'Mutation'), mutation);
  selectControl(mutation, 'Mutation stat', bee.mutation?.stat || '', GameData.mutationStats, stat => {
    if (!stat) delete bee.mutation;
    else bee.mutation = { stat, oper: '*', num: 1.2 };
    changed('Change mutation in slot ' + (selectedSlot + 1)); renderBeeDetail();
  }, 'No mutation');
  if (bee.mutation) {
    selectControl(mutation, 'Operation', bee.mutation.oper, [{id:'*',name:'Multiply (×)'},{id:'+',name:'Add (+)'}], value => { bee.mutation.oper = value; changed('Change mutation operation'); });
    field(mutation, 'Mutation value', bee.mutation.num, value => { bee.mutation.num = value; }, { min: 0, step: 'any' });
  }
  const info = GameData.bees[bee.type];
  if (info) {
    const bonus = info.giftedHiveBonus;
    const text = bonus ? ` Gifted hive bonus: ${bonus.oper === '*' ? '×' : '+'}${bonus.num} ${bonus.stat.split(',').map(statsName).join(', ')}.` : '';
    $('bee-detail').append(el('p', `${humanize(info.color)} · ${info.group}.${text}`, 'hint'));
  }
  if (bee.beequip) $('bee-detail').append(el('p', 'Beequip: ' + humanize(bee.beequip.type) + ' (edit in Beequips)', 'hint'));
}
function renderStatRows(parent, entries, supported, beequip = false) {
  parent.replaceChildren();
  entries.forEach((entry, index) => {
    const row = el('div','', 'bonus-row'); parent.append(row);
    if (entry.raw !== undefined) {
      row.append(el('p', 'Preserved bonus: ' + entry.raw, 'hint'));
    } else {
      selectControl(row, 'Bonus', entry.stat, supported, value => { entry.stat = value; });
      selectControl(row, 'Operation', entry.op, [{id:'*',name:'Multiply (×)'},{id:'+',name:'Add (+)'}], value => { entry.op = value; });
      draftNumber(row, 'Value', entry.value, value => { entry.value = value; }, 0, Number.MAX_SAFE_INTEGER);
      if (beequip) draftNumber(row, 'Wax bonus', entry.wax || 0, value => { entry.wax = value; }, -Number.MAX_SAFE_INTEGER);
    }
    button(row, 'Remove', () => { entries.splice(index, 1); renderStatRows(parent, entries, supported, beequip); });
  });
  if (!entries.length) parent.append(el('p', 'No bonuses. Use Add bonus to choose one.', 'hint'));
}
function renderAmulet() {
  $('amulet-controls').replaceChildren();
  selectControl($('amulet-controls'), 'Amulet', selectedAmulet, GameData.amuletSlots, value => { selectedAmulet = value; renderAmulet(); });
  const entries = SaveTools.parseStats(save.currentGear[selectedAmulet]);
  amuletDraft = entries.filter(entry => entry.op !== 'P'); amuletPassiveDraft = entries.filter(entry => entry.op === 'P').map(entry => entry.stat);
  renderStatRows($('amulet-bonuses'), amuletDraft, GameData.playerStats);
  $('amulet-passives').replaceChildren();
  const meta = GameData.amuletSlots.find(entry => entry.id === selectedAmulet);
  const available = GameData.passives.filter(entry => meta.passives.includes(entry.id));
  for (let i = 0; i < meta.maxPassives; i++) selectControl($('amulet-passives'), 'Passive ' + (i + 1), amuletPassiveDraft[i] || '', available, value => { amuletPassiveDraft[i] = value; }, 'No passive');
  $('amulet-state').textContent = (save.currentGear[selectedAmulet] ? 'Equipped. ' : 'Not equipped. ') + 'Use Apply amulet to save these bonuses. Applying replaces other tiers in the same amulet family.';
}
function compatibleBeequip(type, bee) {
  const meta = GameData.beequips.find(entry => entry.id === type);
  return !!(meta && bee.type && SaveTools.level(bee) >= meta.level && (!meta.gifted || bee.gifted) && (meta.color === 'any' || meta.color === GameData.bees[bee.type]?.color) && (!meta.types.length || meta.types.includes(bee.type)));
}
function renderBeequips() {
  $('beequip-add').replaceChildren();
  selectControl($('beequip-add'), 'New beequip', GameData.beequips[0].id, GameData.beequips, () => {} ).id = 'new-beequip-type';
  $('beequip-list').replaceChildren();
  const items = save.currentGear.beequips || [];
  for (const item of items) {
    const row = el('div', '', 'list-row'); const details = el('div');
    details.append(el('strong', GameData.beequips.find(entry => entry.id === item.type)?.name || humanize(item.type)));
    const slot = item.bee ? `Slot ${item.bee[1] * 5 + item.bee[0] + 1}` : 'Not equipped';
    details.append(el('p', `${slot} · potential ${item.potential}`, 'hint')); row.append(details);
    button(row, 'Edit', () => { selectedBeequip = item.id; renderBeequipEditor(); });
    button(row, 'Remove', () => commitSave(SaveTools.removeBeequip(save, item.id), 'Remove beequip'));
    $('beequip-list').append(row);
  }
  if (!items.length) $('beequip-list').append(el('p', 'No beequips yet. Choose one above to add it.', 'hint'));
  renderBeequipEditor();
}
function renderBeequipEditor() {
  const item = save.currentGear.beequips?.find(entry => entry.id === selectedBeequip), parent = $('beequip-editor'); parent.replaceChildren(); parent.hidden = !item; if (!item) return;
  const meta = GameData.beequips.find(entry => entry.id === item.type);
  if (!meta) { parent.append(el('p', 'Unknown beequip preserved. Edit its extra values in Advanced.', 'hint')); return; }
  parent.append(el('h3', meta.name));
  parent.append(el('p', `Minimum level ${meta.level} · ${humanize(meta.color)} bees${meta.gifted ? ' · gifted only' : ''}${meta.reqStr ? ' · ' + meta.reqStr.replace(/<[^>]+>/g,'') : ''}`, 'hint'));
  beequipDraft = { potential: item.potential || 1, bee: SaveTools.parseStats(item.stats.bee, true), player: SaveTools.parseStats(item.stats.player, true), slot: item.bee ? item.bee[1] * 5 + item.bee[0] : null };
  const fields = el('div','', 'field-grid two'); parent.append(fields);
  const slots = save.hive.flat().map((bee,index) => ({ id: String(index), name: `Slot ${index + 1} · ${beeName(bee.type)}${compatibleBeequip(item.type,bee) ? '' : ' (incompatible)'}`, allowed: compatibleBeequip(item.type,bee) }));
  const select = selectControl(fields, 'Assigned bee', beequipDraft.slot === null ? '' : String(beequipDraft.slot), slots, value => { beequipDraft.slot = value === '' ? null : Number(value); }, 'Unequipped');
  for (const option of select.options) if (option.value !== '' && !slots[Number(option.value)].allowed) option.disabled = true;
  draftNumber(fields, 'Potential', beequipDraft.potential, value => { beequipDraft.potential = value; }, 1, 5, '1');
  for (const kind of ['bee','player']) {
    parent.append(el('h4', kind === 'bee' ? 'Bee bonuses' : 'Hive bonuses'));
    const bonuses = el('div','', 'stack'); bonuses.id = 'beequip-' + kind + '-bonuses'; parent.append(bonuses);
    const allowed = meta[kind === 'bee' ? 'beeStats' : 'playerStats'].map(id => ({ id, name: statsName(id) }));
    renderStatRows(bonuses, beequipDraft[kind], allowed, true);
    if (allowed.length) button(parent, 'Add ' + (kind === 'bee' ? 'bee' : 'hive') + ' bonus', () => { beequipDraft[kind].push({ op: '*', value: 1.1, stat: allowed[0].id, wax: 0 }); renderStatRows(bonuses, beequipDraft[kind], allowed, true); });
  }
  parent.append(el('p', 'Multipliers and additive bonuses use game values. Wax bonus is added to the base value. Existing wax history is kept.', 'hint'));
  button(parent, 'Apply beequip', () => { validWithin('beequip-editor'); const stats = { bee: SaveTools.serializeStats(beequipDraft.bee,true), player: SaveTools.serializeStats(beequipDraft.player,true) }; commitSave(SaveTools.beequip(save, item.id, { potential: beequipDraft.potential, stats }, beequipDraft.slot), 'Update ' + meta.name); }, 'primary');
}
function renderBuffs() {
  $('buff-controls').replaceChildren();
  selectControl($('buff-controls'), 'Buff', selectedBuff, activeBuffs, id => { selectedBuff = id; renderBuffs(); });
  const meta = activeBuffs.find(entry => entry.id === selectedBuff), existing = save.effects?.find(entry => entry.type === selectedBuff);
  const amount = draftNumber($('buff-controls'), 'Stacks', existing?.amount || 1, () => {}, meta.amountFromCooldown ? 0.000001 : 1, meta.maxAmount ?? Number.MAX_SAFE_INTEGER); amount.id = 'buff-amount'; amount.disabled = !!meta.amountFromCooldown;
  const duration = draftNumber($('buff-controls'), 'Duration (minutes)', existing?.cooldown === null ? 0 : (existing?.cooldown ?? meta.maxCooldown ?? 0) / 60, () => {}, 0, (meta.maxCooldown ?? Number.MAX_SAFE_INTEGER) / 60); duration.id = 'buff-duration'; duration.disabled = meta.maxCooldown === null;
  $('buff-info').textContent = meta.maxCooldown === null ? 'This buff has no expiry.' : meta.amountFromCooldown ? `Strength follows remaining time. Maximum duration: ${prettyNumber(meta.maxCooldown / 60)} minutes.` : `Up to ${meta.maxAmount === null ? 'unlimited' : meta.maxAmount} stacks · maximum ${prettyNumber(meta.maxCooldown / 60)} minutes.`;
  $('buff-list').replaceChildren();
  for (const buff of save.effects || []) {
    const def = GameData.effects.find(entry => entry.id === buff.type); if (def?.isPassive) continue;
    const row = el('div','', 'list-row'), text = el('div'); text.append(el('strong', def?.name || humanize(buff.type)), el('p', `${def?.amountFromCooldown ? Math.round(buff.amount * 100) + '% strength' : '×' + buff.amount} · ${buff.cooldown === null ? 'no expiry' : prettyNumber(buff.cooldown / 60) + ' min'}`, 'hint')); row.append(text);
    if (def && activeBuffs.some(entry => entry.id === def.id)) button(row, 'Edit', () => { selectedBuff = buff.type; renderBuffs(); });
    button(row, 'Remove', () => { const next = clone(save); next.effects = next.effects.filter(entry => entry.type !== buff.type); commitSave(next,'Remove ' + (def?.name || buff.type)); });
    $('buff-list').append(row);
  }
  if (!$('buff-list').children.length) $('buff-list').append(el('p','No saved buffs. Add one above.', 'hint'));
}
function renderQuests() {
  $('quest-controls').replaceChildren();
  const npcs = [...new Set(GameData.quests.filter(entry => !entry.isBeesmasQuest).map(entry => entry.NPC))].map(id => ({id,name:humanize(id)}));
  selectControl($('quest-controls'), 'Quest giver', questNPC, npcs, id => { questNPC = id; chosenQuest = null; renderQuests(); });
  const quests = GameData.quests.filter(entry => entry.NPC === questNPC && !entry.isBeesmasQuest);
  if (!quests.some(entry => entry.id === chosenQuest)) chosenQuest = quests[0]?.id;
  selectControl($('quest-controls'), 'Quest', chosenQuest, quests, id => { chosenQuest = id; });
  $('add-quest').disabled = !chosenQuest;
  $('quest-list').replaceChildren();
  (save.quests || []).forEach((quest,index) => {
    const card = el('article','', 'sub-card'); card.append(el('h3',quest.name || 'Unnamed quest'), el('p',humanize(quest.NPC || 'Unknown NPC'), 'hint'));
    const requirements = el('div','', 'field-grid two'); card.append(requirements);
    (quest.req || []).forEach((req,portion) => {
      if (!Array.isArray(req) || typeof req[1] !== 'number') { requirements.append(el('p','Unsupported requirement preserved. Use Advanced to inspect.', 'hint')); return; }
      const progress = Math.max(0, Math.min(req[1], SaveTools.derivedStat(save,req[0]) - (req[2] || 0)));
      const input = draftNumber(requirements, humanize(req[0]) + ' · target ' + prettyNumber(req[1]), progress, value => {
        save = SaveTools.questProgress(save,index,portion,value); changed('Edit ' + (quest.name || 'quest') + ' progress', 'quest:' + index + ':' + portion);
      }, 0, req[1]); input.dataset.saveField = 'true';
    });
    const controls = el('div','', 'button-row'); card.append(controls);
    button(controls,'Complete objectives', () => { let next = save; (quest.req || []).forEach((req,portion) => { if (Array.isArray(req) && typeof req[1] === 'number') next = SaveTools.questProgress(next,index,portion,req[1]); }); commitSave(next,'Complete objectives: ' + quest.name); });
    button(controls,'Remove quest', () => { const next = clone(save); next.quests.splice(index,1); commitSave(next,'Remove quest: ' + quest.name); });
    $('quest-list').append(card);
  });
  if (!$('quest-list').children.length) $('quest-list').append(el('p','No active quests in this save.', 'hint'));
  $('npc-progress').replaceChildren();
  for (const [id, npc] of Object.entries(save.NPCs)) {
    const group = el('article','', 'sub-card'); group.append(el('h3',humanize(id))); const fields = el('div','', 'field-grid'); fields.id = 'npc-' + id; group.append(fields);
    for (const key of ['index','index_beesmas','portionsDone','seed']) if (typeof npc[key] === 'number') field(fields,humanize(key),npc[key],value => { save.NPCs[id][key] = value; }, { step:'1' });
    if (typeof npc.translatored === 'boolean') {
      const label = el('label','', 'checkbox'), box = el('input'); box.type = 'checkbox'; box.checked = npc.translatored; box.addEventListener('change', () => { save.NPCs[id].translatored = box.checked; changed('Change translator for ' + humanize(id)); }); label.append(box,'Translator'); fields.append(label);
    }
    $('npc-progress').append(group);
  }
}
function renderGearComparison() {
  $('gear-compare-controls').replaceChildren();
  selectControl($('gear-compare-controls'),'Equipment category',compareGearSlot,Object.keys(GameCatalog.gear).map(id => ({id,name:humanize(id)})),id => { compareGearSlot = id; compareGearId = GameCatalog.gear[id][0].id; renderGearComparison(); });
  selectControl($('gear-compare-controls'),'Compare with',compareGearId,GameCatalog.gear[compareGearSlot],id => { compareGearId = id; updateGearComparison(); });
  updateGearComparison();
}
function updateGearComparison() {
  $('gear-comparison').replaceChildren();
  for (const [caption,id] of [['Equipped',save.currentGear[compareGearSlot]],['Compare',compareGearId]]) {
    const meta = GameData.gear[compareGearSlot]?.[id], card = el('article','', 'sub-card');
    card.append(el('small',caption),el('h3',meta?.name || humanize(id || 'none')));
    const lines = meta?.stats?.length ? meta.stats.map(entry => {
      const stat = SaveTools.parseStats(entry)[0]; return stat?.op === 'P' ? 'Passive: ' + humanize(stat.stat.replace(/Passive$/,'')) : stat && !stat.raw ? `${stat.op === '*' ? '×' : '+'}${stat.value} ${statsName(stat.stat)}` : entry;
    }) : [];
    for (const key of ['collectAmount','cooldown','count','diameter','power','rate']) if (meta?.[key] !== undefined) lines.push(humanize(key) + ': ' + meta[key]);
    if (lines.length) { const list = el('ul'); for (const line of lines) list.append(el('li',line)); card.append(list); }
    else card.append(el('p',meta?.description || 'No stat bonuses.', 'hint'));
    $('gear-comparison').append(card);
  }
}
function storeBuild(build) {
  const next = buildLibrary.filter(entry => entry.name !== build.name); next.push(build);
  try { localStorage.setItem(libraryKey,JSON.stringify(next)); } catch { throw new Error('Browser storage is unavailable or full. Use Download build to keep a copy.'); }
  buildLibrary = next; renderBuilds();
}
function renderBuilds() {
  $('build-list').replaceChildren();
  for (const build of buildLibrary) {
    const row = el('div','', 'list-row'); row.append(el('strong',build.name));
    button(row,'Load', () => commitSave(SaveTools.applyBuild(save,build),'Load build: ' + build.name));
    button(row,'Share', () => download(pretty(build) + '\n','bss-build.json','application/json'));
    button(row,'Delete', () => { const next = buildLibrary.filter(entry => entry !== build); try { localStorage.setItem(libraryKey,JSON.stringify(next)); } catch { throw new Error('Could not update browser storage.'); } buildLibrary = next; renderBuilds(); });
    $('build-list').append(row);
  }
  if (!buildLibrary.length) $('build-list').append(el('p','No saved builds yet.', 'hint'));
}
function renderReview() {
  if (!save) return;
  const changes = SaveTools.diff(compareSave || original, save);
  const query = $('diff-search').value.trim().toLowerCase();
  const filtered = changes.filter(change => change.path.toLowerCase().includes(query));
  $('compare-state').textContent = `${changes.length} changes from ${compareName}${query ? ' · ' + filtered.length + ' match' : ''}`;
  $('change-list').replaceChildren();
  for (const change of filtered.slice(0,diffLimit)) {
    const card = el('article','', 'diff-row'); card.append(el('strong',change.path));
    const values = el('div','', 'comparison-columns');
    for (const [caption,value] of [['Before',change.before],['After',change.after]]) {
      const column = el('div'); column.append(el('small',caption),el('pre',value === undefined ? 'Not present' : pretty(value))); values.append(column);
    }
    card.append(values); $('change-list').append(card);
  }
  if (filtered.length > diffLimit) button($('change-list'),'Show next 100 changes', () => { diffLimit += 100; renderReview(); });
  if (!filtered.length) $('change-list').append(el('p',query ? 'No matching changes.' : 'No changes to show.', 'hint'));
  $('history-state').textContent = `${history.index} edits available to undo · ${history.entries.length - history.index - 1} to redo · keeps up to 100 edits`;
  $('history-list').replaceChildren();
  history.entries.forEach((entry,index) => {
    const row = el('div',`${index === history.index ? '● ' : ''}${index}. ${entry.label}`, 'history-entry'); row.classList.toggle('current',index === history.index); $('history-list').append(row);
  });
}
function theme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('theme-toggle').textContent = dark ? 'Light mode' : 'Dark mode'; $('theme-toggle').setAttribute('aria-pressed',String(dark));
  try { localStorage.setItem(themeKey,dark ? 'dark' : 'light'); } catch {}
}
try { const saved = JSON.parse(localStorage.getItem(libraryKey) || '[]'); if (Array.isArray(saved)) buildLibrary = saved.filter(build => build?.format === 'bss-editor-build' && typeof build.name === 'string'); } catch {}
try { theme(localStorage.getItem(themeKey) === 'dark'); } catch { theme(false); }
$('theme-toggle').addEventListener('click', () => theme(document.documentElement.dataset.theme !== 'dark'));
$('max-drives').addEventListener('click', () => run(() => commitSave(SaveTools.drives(save,{red:50,blue:50,white:50,glitched:50}),'Max Digital Bee drives')));
$('apply-balloon').addEventListener('click', () => run(() => { validWithin('resources-panel'); commitSave(SaveTools.balloon(save,Number($('balloon-pollen').value),Number($('balloon-blessing').value)),'Update hive balloon'); }));
$('inventory-shortcut').addEventListener('click', () => run(() => { validWithin('items-panel'); commitSave(SaveTools.inventory(save,$('inventory-group').value,Number($('inventory-amount').value)),'Apply inventory shortcut'); }));
$('inventory-max').addEventListener('click', () => run(() => commitSave(SaveTools.inventory(save,'materials',1000000),'Max crafting materials')));
$('apply-custom').addEventListener('click', () => run(() => { validWithin('presets-panel'); const resources = $('custom-topup').checked; commitSave(SaveTools.customize(save,{color:$('custom-color').value,count:Number($('custom-count').value),level:Number($('custom-level').value),gifted:$('custom-gifted').checked,gear:$('custom-gear').checked,honey:resources ? Number($('custom-honey').value) : null,supplies:resources ? Number($('custom-supplies').value) : null}),'Apply customized preset'); }));
$('apply-bulk').addEventListener('click', () => run(() => {
  validWithin('hive-panel'); const options = {};
  if ($('bulk-set-level').checked) options.level = Number($('bulk-level').value);
  if ($('bulk-gifted').value !== 'keep') options.gifted = $('bulk-gifted').value === 'yes';
  const mutation = $('bulk-mutation').value;
  if (mutation !== 'keep') options.mutation = mutation === 'none' ? null : {stat:mutation,oper:$('bulk-op').value,num:Number($('bulk-value').value)};
  commitSave(SaveTools.bulkBees(save,options),'Upgrade occupied bees');
}));
$('add-amulet-bonus').addEventListener('click', () => { amuletDraft.push({op:'*',stat:'capacityMultiplier',value:1.5}); renderStatRows($('amulet-bonuses'),amuletDraft,GameData.playerStats); });
$('apply-amulet').addEventListener('click', () => run(() => { validWithin('amulets-panel'); commitSave(SaveTools.amulet(save,selectedAmulet,amuletDraft,amuletPassiveDraft),'Apply ' + humanize(selectedAmulet)); }));
$('remove-amulet').addEventListener('click', () => run(() => { const next = clone(save); delete next.currentGear[selectedAmulet]; commitSave(next,'Remove ' + humanize(selectedAmulet)); }));
$('add-beequip').addEventListener('click', () => run(() => { const next = SaveTools.beequip(save,null,{type:$('new-beequip-type').value}); selectedBeequip = next.currentGear.beequips.at(-1).id; commitSave(next,'Add beequip'); }));
$('apply-buff').addEventListener('click', () => run(() => { validWithin('buff-controls'); const meta = activeBuffs.find(entry => entry.id === selectedBuff); commitSave(SaveTools.effect(save,selectedBuff,Number($('buff-amount').value),meta.maxCooldown === null ? null : Number($('buff-duration').value) * 60),'Update ' + meta.name); }));
$('max-nectar').addEventListener('click', () => run(() => { let next = save; for (const nectar of activeBuffs.filter(entry => entry.isNectar)) next = SaveTools.effect(next,nectar.id,1,nectar.maxCooldown); commitSave(next,'Apply all five nectars'); }));
$('add-quest').addEventListener('click', () => run(() => commitSave(SaveTools.addQuest(save,chosenQuest),'Add selected quest')));
$('save-build').addEventListener('click', () => run(() => { ensureReady(); storeBuild(SaveTools.makeBuild(save,$('build-name').value,$('build-resources').checked)); message('Build saved in this browser.'); }));
$('share-build').addEventListener('click', () => run(() => { ensureReady(); const build = SaveTools.makeBuild(save,$('build-name').value || 'My hive',$('build-resources').checked); download(pretty(build) + '\n','bss-build.json','application/json'); message('Build downloaded. Share the JSON file to share your setup.'); }));
$('import-build').addEventListener('click', () => $('build-file').click());
$('build-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { if (file.size > 1000000) throw new Error('Choose a build file smaller than 1 MB.'); const build = JSON.parse(await file.text()); SaveTools.applyBuild(save,build); storeBuild(build); message('Build imported. Choose Load to apply it.'); } catch(error) { message(error.message,true); }
  event.target.value = '';
});
$('compare-original').addEventListener('click', () => { compareSave = null; compareName = 'Imported save'; diffLimit = 100; renderReview(); });
$('compare-upload').addEventListener('click', () => $('compare-file').click());
$('compare-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { if (file.size > 1000000) throw new Error('Choose a save smaller than 1 MB.'); const text = (await file.text()).trim(); compareSave = text.startsWith('{') ? SaveCodec.validate(JSON.parse(text)) : SaveCodec.decode(text); compareName = file.name; diffLimit = 100; renderReview(); message('Comparison loaded. Your edited save is kept.'); } catch(error) { message(error.message,true); }
  event.target.value = '';
});
$('diff-search').addEventListener('input', () => { diffLimit = 100; renderReview(); });
document.addEventListener('keydown', event => {
  if (!save || !(event.ctrlKey || event.metaKey) || !['z','y'].includes(event.key.toLowerCase())) return;
  if (event.target.closest('input,textarea,select')) return;
  event.preventDefault(); const redo = event.key.toLowerCase() === 'y' || event.shiftKey;
  if (redo ? history.canRedo : history.canUndo) { save = redo ? history.redo() : history.undo(); render(); message(redo ? 'Redid your last edit.' : 'Undid your last edit.'); }
});
