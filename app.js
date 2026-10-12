'use strict';
const $ = id => document.getElementById(id);
let save = null, original = null, jsonDirty = false, history = null;
const sectionNames = ['presets', 'resources', 'items', 'gear', 'hive', 'amulets', 'beequips', 'boosts', 'quests', 'review', 'json'];
const clone = value => JSON.parse(JSON.stringify(value));
const pretty = value => JSON.stringify(value, null, 2);
function message(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
function run(action) { try { action(); } catch (error) { message(error.message, true); } }
function invalidate() {
  $('save-output').value = '';
  $('copy').disabled = $('download-code').disabled = true;
  $('output-box').hidden = true;
  $('export-state').textContent = 'Your edits are ready to export.';
}
function changed(label = 'Edit save', key = null) {
  if (history) history.record(save, label, key);
  invalidate();
  $('json-editor').value = pretty(save);
  updateSummary();
  updateHistoryControls();
  if (typeof refreshExtras === 'function') refreshExtras();
}
function updateHistoryControls() {
  $('undo-preset').disabled = !history?.canUndo;
  $('redo-edit').disabled = !history?.canRedo;
  $('undo-preset').title = history?.canUndo ? 'Undo: ' + history.entries[history.index].label : 'No changes to undo';
  $('redo-edit').title = history?.canRedo ? 'Redo: ' + history.entries[history.index + 1].label : 'No changes to redo';
}
function humanize(key) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()); }
function choice(parent, title, value, choices, callback, { empty = null } = {}) {
  const label = document.createElement('label'); label.textContent = title;
  const select = document.createElement('select');
  if (empty !== null) select.add(new Option(empty, ''));
  const groups = new Map();
  for (const entry of choices) {
    let destination = select;
    if (entry.group) {
      if (!groups.has(entry.group)) { const group = document.createElement('optgroup'); group.label = entry.group; groups.set(entry.group, group); select.append(group); }
      destination = groups.get(entry.group);
    }
    destination.append(new Option(entry.name, entry.id));
  }
  const current = value ?? '';
  if (current && !choices.some(entry => entry.id === current)) select.add(new Option(humanize(current) + ' (from your save)', current));
  select.value = current;
  select.addEventListener('change', () => run(() => { callback(select.value); changed('Change ' + title); }));
  label.append(select); parent.append(label); return select;
}
function populateItemChoices() {
  const query = $('item-search').value.trim().toLowerCase();
  const current = $('item-key').value;
  $('item-key').replaceChildren(new Option('Choose an item', ''));
  for (const entry of GameCatalog.items) {
    if (!query || entry.name.toLowerCase().includes(query)) $('item-key').add(new Option(entry.name, entry.id));
  }
  $('item-key').value = Array.from($('item-key').options).some(option => option.value === current) ? current : '';
}
function renderInventory() {
  $('items').replaceChildren();
  const entries = Object.entries(save.items).sort(([a], [b]) => a.localeCompare(b));
  $('inventory-count').textContent = entries.length + (entries.length === 1 ? ' item' : ' items');
  for (const [key, value] of entries) {
    const amount = Array.isArray(value) ? value[0] : value;
    if (typeof amount !== 'number') continue;
    const name = GameCatalog.items.find(entry => entry.id === key)?.name || humanize(key);
    field($('items'), name, amount, quantity => {
      if (Array.isArray(save.items[key])) save.items[key][0] = quantity;
      else save.items[key] = quantity;
    }, { step: '1' });
  }
  if (!$('items').children.length) { const hint = document.createElement('p'); hint.className = 'empty-inventory'; hint.textContent = 'Choose an item above to add it to your inventory.'; $('items').append(hint); }
}
function field(parent, title, value, callback, options = {}) {
  const label = document.createElement('label'); label.textContent = title;
  const input = document.createElement('input');
  input.type = options.type || 'number'; input.value = value ?? '';
  input.dataset.saveField = 'true';
  if (input.type === 'number') { input.min = String(options.min ?? 0); input.max = String(options.max ?? Number.MAX_SAFE_INTEGER); input.step = options.step || 'any'; input.required = true; }
  input.addEventListener('input', () => {
    invalidate();
    if (!input.checkValidity()) return;
    callback(input.type === 'number' ? Number(input.value) : input.value);
    changed('Change ' + title, parent.id + ':' + title + ':' + (typeof selectedSlot !== 'undefined' ? selectedSlot : ''));
  });
  label.append(input); parent.append(label); return input;
}
function updateSummary() {
  const active = save.hive.flat().filter(bee => bee && bee.type != null).length;
  const values = [['Honey', save.honey ?? 0], ['Pollen', save.pollen ?? 0], ['Bees', `${active} / ${save.hive.flat().length}`]];
  $('summary').replaceChildren();
  for (const [title, value] of values) {
    const box = document.createElement('div'); box.className = 'metric';
    const caption = document.createElement('small'); caption.textContent = title;
    const number = document.createElement('strong'); number.textContent = typeof value === 'number' ? value.toLocaleString('en-US', value >= 1e12 ? { notation: 'compact', maximumFractionDigits: 2 } : {}) : value;
    number.title = typeof value === 'number' ? value.toLocaleString('en-US') : value;
    box.append(caption, number); $('summary').append(box);
  }
}
function render() {
  $('editor').hidden = false; $('version').textContent = 'Save v' + save.version;
  $('json-editor').value = pretty(save); jsonDirty = false;
  $('json-state').textContent = 'No pending changes';
  $('hive-size').value = save.hive.flat().length;
  updateHistoryControls();
  for (const id of ['resources', 'items', 'gear', 'hive']) $(id).replaceChildren();
  for (const key of ['honey', 'pollen']) {
    if (typeof save[key] === 'number') field($('resources'), humanize(key), save[key], value => { save[key] = value; });
  }
  renderInventory();
  for (const [key, value] of Object.entries(save.currentGear)) {
    if (typeof value !== 'string') continue;
    if (!GameCatalog.gear[key]) continue;
    choice($('gear'), humanize(key), value, GameCatalog.gear[key], next => {
      save.currentGear[key] = next;
      if (next && next !== 'none') { save.owned ??= {}; save.owned[next] = true; }
    });
  }
  if (typeof renderHive === 'function') renderHive();
  updateSummary(); invalidate();
  if (typeof renderExtras === 'function') renderExtras();
}
function importText(text) {
  const trimmed = text.trim();
  const candidate = trimmed.startsWith('{') ? SaveCodec.validate(JSON.parse(trimmed)) : SaveCodec.decode(trimmed);
  SaveCodec.encode(candidate);
  save = candidate; original = clone(save); history = new SaveTools.History(save); render();
  if (typeof resetSessionViews === 'function') resetSessionViews();
  $('import-box').open = false;
  showSection('resources');
  message('Save loaded. Make your changes, then generate a new code.');
}
function applyJSON() {
  const candidate = SaveCodec.validate(JSON.parse($('json-editor').value));
  SaveCodec.encode(candidate);
  save = candidate; history.record(save, 'Apply JSON'); render();
  message('JSON applied. Your quick editor is up to date.');
}
function ensureReady() {
  if (!save) throw new Error('Import a save first.');
  if (jsonDirty) applyJSON();
  for (const input of document.querySelectorAll('[data-save-field]')) {
    if (!input.checkValidity()) {
      const panel = input.closest('[role="tabpanel"]');
      if (panel) showSection(panel.id.replace('-panel', ''));
      input.reportValidity();
      throw new Error('Fix the highlighted field before exporting.');
    }
  }
}
function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function showSection(mode) {
  if (mode !== 'json' && jsonDirty) { try { applyJSON(); } catch (error) { message(error.message, true); return; } }
  for (const name of sectionNames) {
    const active = mode === name;
    $(name + '-tab').setAttribute('aria-selected', String(active));
    $(name + '-tab').tabIndex = active ? 0 : -1;
    $(name + '-panel').hidden = !active;
  }
  if (mode === 'review' && typeof renderReview === 'function') renderReview();
  if (typeof renderSection === 'function') renderSection(mode);
}
$('decode').addEventListener('click', () => run(() => importText($('save-input').value)));
$('upload').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { if (file.size > 1000000) throw new Error('Choose a save file smaller than 1 MB.'); const text = await file.text(); importText(text); $('save-input').value = text; }
  catch (error) { message(error.message, true); }
  event.target.value = '';
});
$('example').addEventListener('click', async () => {
  try { const response = await fetch('example.json'); if (!response.ok) throw new Error('Could not load the example save.'); const text = await response.text(); importText(text); $('save-input').value = SaveCodec.encode(save); }
  catch (error) { message(error.message, true); }
});
$('reset').addEventListener('click', () => run(() => { save = clone(original); history.record(save, 'Reset to imported save'); render(); message('Edits reset to the imported save.'); }));
for (const name of sectionNames) $(name + '-tab').addEventListener('click', () => showSection(name));
for (const name of sectionNames) $(name + '-tab').addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const index = sectionNames.indexOf(name);
    const next = event.key === 'Home' ? sectionNames[0] : event.key === 'End' ? 'json' : sectionNames[(index + (event.key === 'ArrowRight' ? 1 : -1) + sectionNames.length) % sectionNames.length];
    showSection(next); if ($(next + '-tab').getAttribute('aria-selected') === 'true') $(next + '-tab').focus();
  }
});
$('json-editor').addEventListener('input', () => { jsonDirty = true; invalidate(); $('json-state').textContent = 'Changes pending — apply or export to validate'; });
$('apply-json').addEventListener('click', () => run(applyJSON));
$('item-search').addEventListener('input', populateItemChoices);
populateItemChoices();
$('add-item').addEventListener('submit', event => {
  event.preventDefault();
  run(() => {
    const key = $('item-key').value.trim(); const quantity = Number($('item-quantity').value);
    if (!GameCatalog.items.some(entry => entry.id === key)) throw new Error('Choose an item from the list.');
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Use a nonnegative whole quantity.');
    if (Array.isArray(save.items[key])) save.items[key][0] = quantity;
    else save.items[key] = quantity;
    renderInventory(); changed('Set ' + humanize(key) + ' quantity'); message('Item quantity updated.');
  });
});
$('generate').addEventListener('click', () => run(() => {
  ensureReady(); $('save-output').value = SaveCodec.encode(save);
  $('copy').disabled = $('download-code').disabled = false;
  $('output-box').hidden = false;
  $('export-state').textContent = 'Verified and ready to import.'; message('New code generated and verified. Copy it into the game’s import option.');
}));
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('save-output').value); message('Save code copied.'); }
  catch { $('save-output').focus(); $('save-output').select(); message('Code selected. Press Ctrl+C (or Cmd+C) to copy it.'); }
});
$('download-code').addEventListener('click', () => download($('save-output').value, 'bss-edited-save.txt', 'text/plain;charset=utf-8'));
$('download-json').addEventListener('click', () => run(() => { ensureReady(); download(pretty(save) + '\n', 'bss-edited-save.json', 'application/json'); }));

function applyPreset(action, text) {
  ensureReady();
  const next = action(save);
  SaveCodec.encode(next);
  SaveTools.syncBeequips(next); SaveTools.discover(next);
  save = next; history.record(save, text); render(); message(text.replace(/[.!]$/, '') + '. You can edit further or generate a code.');
}
function describeHive() {
  const color = $('hive-preset').value;
  const entries = SavePresets.composition(color);
  $('hive-build-summary').textContent = entries.slice(0, 3).map(entry => `${entry.count} ${entry.name}`).join(' · ') + ` · ${entries.length} bee types total`;
  $('hive-composition').replaceChildren();
  for (const entry of entries) {
    const chip = document.createElement('span'); chip.textContent = `${entry.count} × ${entry.name}`;
    $('hive-composition').append(chip);
  }
}
for (const mode of ['headstart', 'endgame', 'everything']) $('preset-' + mode).addEventListener('click', () => run(() => {
  applyPreset(value => SavePresets.applyProgress(value, mode, $('endgame-color').value), humanize(mode) + ' preset applied.');
}));
$('apply-hive-preset').addEventListener('click', () => run(() => {
  if (!$('preset-level').reportValidity()) return;
  const color = $('hive-preset').value;
  applyPreset(value => SavePresets.applyHive(value, color, { level: Number($('preset-level').value), gifted: $('preset-gifted').checked, gear: $('preset-gear').checked }), humanize(color) + ' hive applied: 50 bees.');
}));
$('hive-preset').addEventListener('change', describeHive);
describeHive();
for (const bee of GameCatalog.bees) $('fill-bee').add(new Option(bee.name, bee.id));
$('fill-bee').value = 'basic';
$('resize-hive').addEventListener('click', () => run(() => {
  if (!$('hive-size').reportValidity()) return;
  const count = Number($('hive-size').value);
  applyPreset(value => SavePresets.resizeHive(value, count), 'Hive resized to ' + count + ' slots.');
}));
$('max-hive').addEventListener('click', () => run(() => applyPreset(value => SavePresets.resizeHive(value, 50), 'Hive resized to 50 slots.')));
$('fill-empty').addEventListener('click', () => run(() => applyPreset(value => SavePresets.fillEmpty(value, $('fill-bee').value), 'Empty slots filled.')));
$('undo-preset').addEventListener('click', () => run(() => {
  if (!history?.canUndo) return;
  save = history.undo(); render(); message('Undid your last edit.');
}));
$('redo-edit').addEventListener('click', () => run(() => {
  if (!history?.canRedo) return;
  save = history.redo(); render(); message('Redid your last edit.');
}));
