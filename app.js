'use strict';
const $ = id => document.getElementById(id);
let save = null, original = null, jsonDirty = false;
const sectionNames = ['resources', 'items', 'gear', 'hive', 'json'];
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
function changed() {
  invalidate();
  $('json-editor').value = pretty(save);
  updateSummary();
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
  select.addEventListener('change', () => { callback(select.value); changed(); });
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
  if (input.type === 'number') { input.min = '0'; input.max = String(Number.MAX_SAFE_INTEGER); input.step = options.step || 'any'; input.required = true; }
  input.addEventListener('input', () => {
    invalidate();
    if (!input.checkValidity()) return;
    callback(input.type === 'number' ? Number(input.value) : input.value);
    changed();
  });
  label.append(input); parent.append(label); return input;
}
function updateSummary() {
  const active = save.hive.flat().filter(bee => bee && bee.type != null).length;
  const values = [['Honey', save.honey ?? 0], ['Pollen', save.pollen ?? 0], ['Bees', active]];
  $('summary').replaceChildren();
  for (const [title, value] of values) {
    const box = document.createElement('div'); box.className = 'metric';
    const caption = document.createElement('small'); caption.textContent = title;
    const number = document.createElement('strong'); number.textContent = Number(value).toLocaleString('en-US');
    box.append(caption, number); $('summary').append(box);
  }
}
function render() {
  $('editor').hidden = false; $('version').textContent = 'Save v' + save.version;
  $('json-editor').value = pretty(save); jsonDirty = false;
  $('json-state').textContent = 'No pending changes';
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
  save.hive.forEach((row, y) => {
    if (!Array.isArray(row)) throw new Error('Each hive row must be an array.');
    row.forEach((bee, x) => {
      if (!bee || typeof bee !== 'object' || Array.isArray(bee)) throw new Error('Each hive slot must be a bee object.');
      const card = document.createElement('div'); card.className = 'bee-slot';
      const title = document.createElement('h4'); title.textContent = `ROW ${y + 1} · SLOT ${x + 1}`; card.append(title);
      const rememberBee = () => {
        if (!bee.type) return;
        save.discoveredBees ??= []; save.discoveredGifteds ??= [];
        if (!save.discoveredBees.includes(bee.type)) save.discoveredBees.push(bee.type);
        if (bee.gifted && !save.discoveredGifteds.includes(bee.type)) save.discoveredGifteds.push(bee.type);
      };
      choice(card, 'Bee type', bee.type, GameCatalog.bees, value => { bee.type = value || null; rememberBee(); }, { empty: 'Empty slot' });
      field(card, 'Bond', bee.bond ?? 0, value => { bee.bond = value; });
      const label = document.createElement('label'); label.className = 'checkbox';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = !!bee.gifted;
      checkbox.addEventListener('change', () => { bee.gifted = checkbox.checked; rememberBee(); changed(); });
      label.append(checkbox, 'Gifted'); card.append(label); $('hive').append(card);
    });
  });
  updateSummary(); invalidate();
}
function importText(text) {
  const trimmed = text.trim();
  const candidate = trimmed.startsWith('{') ? SaveCodec.validate(JSON.parse(trimmed)) : SaveCodec.decode(trimmed);
  SaveCodec.encode(candidate);
  save = candidate; original = clone(save); render();
  $('import-box').open = false;
  showSection('resources');
  message('Save loaded. Make your changes, then generate a new code.');
}
function applyJSON() {
  const candidate = SaveCodec.validate(JSON.parse($('json-editor').value));
  SaveCodec.encode(candidate);
  save = candidate; render();
  message('JSON applied. Your quick editor is up to date.');
}
function ensureReady() {
  if (!save) throw new Error('Import a save first.');
  if (jsonDirty) applyJSON();
  for (const input of document.querySelectorAll('#resources input, #items input, #gear input, #hive input')) {
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
$('reset').addEventListener('click', () => run(() => { save = clone(original); render(); message('Edits reset to the imported save.'); }));
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
    renderInventory(); changed(); message('Item quantity updated.');
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
