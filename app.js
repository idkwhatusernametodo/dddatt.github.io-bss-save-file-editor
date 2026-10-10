'use strict';
const $ = id => document.getElementById(id);
let save = null, original = null, jsonDirty = false;
const clone = value => JSON.parse(JSON.stringify(value));
const pretty = value => JSON.stringify(value, null, 2);
function message(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
function run(action) { try { action(); } catch (error) { message(error.message, true); } }
function invalidate() {
  $('save-output').value = '';
  $('copy').disabled = $('download-code').disabled = true;
  $('export-state').textContent = 'Generate a fresh code';
}
function changed() {
  invalidate();
  $('json-editor').value = pretty(save);
  updateSummary();
}
function humanize(key) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()); }
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
  const values = [['Honey', save.honey ?? 0], ['Pollen', save.pollen ?? 0], ['Bees in hive', active], ['Item types', Object.keys(save.items).length]];
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
  $('json-state').textContent = 'No pending JSON changes';
  for (const id of ['resources', 'items', 'gear', 'hive']) $(id).replaceChildren();
  for (const key of ['honey', 'pollen', 'TIME']) {
    if (typeof save[key] === 'number') field($('resources'), key === 'TIME' ? 'Time (saved value)' : humanize(key), save[key], value => { save[key] = value; });
  }
  for (const [key, value] of Object.entries(save.items)) {
    if (typeof value === 'number') field($('items'), humanize(key), value, quantity => { save.items[key] = quantity; }, { step: '1' });
  }
  if (!$('items').children.length) { const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'No items in this save yet.'; $('items').append(hint); }
  for (const [key, value] of Object.entries(save.currentGear)) {
    if (typeof value !== 'string') continue;
    const input = field($('gear'), humanize(key), value, next => {
      save.currentGear[key] = next;
      if (next && next !== 'none') { save.owned ??= {}; save.owned[next] = true; }
    }, { type: 'text' }); input.required = true;
  }
  save.hive.forEach((row, y) => {
    if (!Array.isArray(row)) throw new Error('Each hive row must be an array.');
    row.forEach((bee, x) => {
      if (!bee || typeof bee !== 'object' || Array.isArray(bee)) throw new Error('Each hive slot must be a bee object.');
      const card = document.createElement('div'); card.className = 'bee-slot';
      const title = document.createElement('h4'); title.textContent = `ROW ${y + 1} · SLOT ${x + 1}`; card.append(title);
      field(card, 'Bee type', bee.type, value => { bee.type = value.trim() || null; }, { type: 'text' });
      field(card, 'Bond', bee.bond ?? 0, value => { bee.bond = value; });
      const label = document.createElement('label'); label.className = 'checkbox';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = !!bee.gifted;
      checkbox.addEventListener('change', () => { bee.gifted = checkbox.checked; changed(); });
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
    if (!input.reportValidity()) throw new Error('Fix the highlighted field before exporting.');
  }
}
function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function tab(mode) {
  if (mode === 'form' && jsonDirty) { try { applyJSON(); } catch (error) { message(error.message, true); return; } }
  for (const name of ['form', 'json']) {
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
$('form-tab').addEventListener('click', () => tab('form'));
$('json-tab').addEventListener('click', () => tab('json'));
for (const name of ['form', 'json']) $(name + '-tab').addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); const next = event.key === 'Home' ? 'form' : event.key === 'End' ? 'json' : name === 'form' ? 'json' : 'form';
    tab(next); if ($(next + '-tab').getAttribute('aria-selected') === 'true') $(next + '-tab').focus();
  }
});
$('json-editor').addEventListener('input', () => { jsonDirty = true; invalidate(); $('json-state').textContent = 'Changes pending — apply or export to validate'; });
$('apply-json').addEventListener('click', () => run(applyJSON));
$('add-item').addEventListener('submit', event => {
  event.preventDefault();
  run(() => {
    const key = $('item-key').value.trim(); const quantity = Number($('item-quantity').value);
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Choose a valid game item ID.');
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Use a nonnegative whole quantity.');
    save.items[key] = quantity; render(); $('item-key').value = ''; message('Item updated.');
  });
});
$('generate').addEventListener('click', () => run(() => {
  ensureReady(); $('save-output').value = SaveCodec.encode(save);
  $('copy').disabled = $('download-code').disabled = false;
  $('export-state').textContent = 'Verified & ready'; message('New code generated and verified. Copy it into the game’s import option.');
}));
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('save-output').value); message('Save code copied.'); }
  catch { $('save-output').focus(); $('save-output').select(); message('Code selected. Press Ctrl+C (or Cmd+C) to copy it.'); }
});
$('download-code').addEventListener('click', () => download($('save-output').value, 'bss-edited-save.txt', 'text/plain;charset=utf-8'));
$('download-json').addEventListener('click', () => run(() => { ensureReady(); download(pretty(save) + '\n', 'bss-edited-save.json', 'application/json'); }));
