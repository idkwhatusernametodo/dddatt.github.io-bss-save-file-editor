'use strict';
let advancedMode = false, multiSelect = false, chosenSlots = new Set(), hiveDrag = null;
let draftTimer = null, recoveredDraft = null, previewCandidate = null, previewLabel = '';
let previewFromGuide = false;
const draftKey = 'bss-editor-draft-v1';
const advancedSections = ['amulets','beequips','boosts','quests','json'];

function setMode(advanced) {
  if (!advanced && advancedSections.some(name => !$(name + '-panel').hidden) && !showSection('resources')) return;
  advancedMode = advanced; document.documentElement.dataset.editorMode = advanced ? 'advanced' : 'simple';
  $('mode-toggle').textContent = advanced ? 'Simple mode' : 'Advanced mode';
  $('mode-toggle').setAttribute('aria-pressed', String(advanced));
  try { localStorage.setItem('bss-editor-mode', advanced ? 'advanced' : 'simple'); } catch {}
}
for (const name of advancedSections) $(name + '-tab').dataset.advanced = 'true';
for (const id of ['bulk-op','bulk-value','bulk-mutation']) $(id).closest('label').dataset.advanced = 'true';
// Keep common resource fields visible; the detailed drive and balloon controls fold away.
const resourceDetails = el('details','', 'feature-details'); resourceDetails.dataset.advanced = 'true';
resourceDetails.append(el('summary','Digital drives & hive balloon'));
while ($('resources').nextSibling) resourceDetails.append($('resources').nextSibling);
$('resources-panel').append(resourceDetails);
const resourceExplanation = el('p','Drives increase Digital Bee’s bonuses. Each color holds up to 50. A hive balloon stores pollen, and its blessing improves conversion.','hint');
resourceDetails.children[0].after(resourceExplanation);
// Arrow keys only visit tabs that are available in the current mode.
document.querySelector('.tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  const tabs = [...document.querySelectorAll('[role="tab"]')].filter(tab => advancedMode || !tab.hasAttribute('data-advanced'));
  const index = tabs.indexOf(event.target);
  const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
  if (showSection(next.id.replace('-tab',''))) next.focus();
}, true);
$('mode-toggle').addEventListener('click', () => setMode(!advancedMode));
try { setMode(localStorage.getItem('bss-editor-mode') === 'advanced'); } catch { setMode(false); }

function dialog(id, title) {
  const node = el('dialog','', 'editor-dialog'); node.id = id;
  node.setAttribute('aria-labelledby', id + '-title');
  const heading = el('div','', 'section-title'), h = el('h2',title); h.id = id + '-title';
  heading.append(h); button(heading,'Close', () => node.close()); node.append(heading); document.body.append(node); return node;
}
const guide = dialog('preset-guide','Build a preset');
guide.append(el('p','Choose your stage, color and hive size. You’ll review the result before it changes your save.','hint'));
const guideFields = el('div','', 'field-grid two'); guide.append(guideFields);
const guideStage = selectControl(guideFields,'Your stage','headstart',[{id:'headstart',name:'Headstart · starter gear & supplies'},{id:'endgame',name:'Endgame · top gear & supplies'},{id:'everything',name:'Everything · all items & gear'},{id:'hive',name:'Hive only · keep resources'}], () => guideDefaults()); guideStage.id = 'guide-stage';
const guideColor = selectControl(guideFields,'Hive color','blue',[{id:'blue',name:'Blue · balloons & bubbles'},{id:'red',name:'Red · flames & precision'},{id:'white',name:'White · vectors & goo'},{id:'mixed',name:'Mixed · variety'}], () => {}); guideColor.id = 'guide-color';
const guideCount = draftNumber(guideFields,'Bee slots',35,()=>{},25,50,'1'); guideCount.id = 'guide-count';
const guideLevel = draftNumber(guideFields,'Bee level',8,()=>{},1,20,'1'); guideLevel.id = 'guide-level';
function check(parent,text,checked,id) { const label = el('label','', 'checkbox'), box = el('input'); box.type='checkbox'; box.checked=checked; box.id=id; label.append(box,text); parent.append(label); return box; }
const guideGifted = check(guideFields,'Gifted bees',false,'guide-gifted'), guideGear = check(guideFields,'Equip matching gear',true,'guide-gear');
guide.append(el('p','Color builds use the game’s templates. Smaller hives take their first slots. Everything uses a mixed hive containing every bee type at 50 slots.','hint'));
button(guide,'Preview my preset', () => { validWithin('preset-guide'); ensureReady(); showPreview(EditorTools.guided(save,{stage:guideStage.value,color:guideColor.value,count:Number(guideCount.value),level:Number(guideLevel.value),gifted:guideGifted.checked,gear:guideGear.checked}), 'Apply ' + humanize(guideStage.value) + ' preset', true); guide.close(); },'primary');
function guideDefaults() {
  const starter = guideStage.value === 'headstart'; guideCount.value = starter ? 35 : 50; guideLevel.value = starter ? 8 : 20; guideGifted.checked = !starter;
  guideColor.disabled = guideStage.value === 'everything';
  if (guideStage.value === 'everything') guideColor.value = 'mixed';
  guideGear.parentElement.lastChild.textContent = starter ? 'Equip starter gear' : guideStage.value === 'everything' ? 'Equip white endgame gear' : 'Equip matching gear';
}
function openGuide(stage='headstart',color='blue') { ensureReady(); guideStage.value=stage; guideColor.value=color; guideDefaults(); guide.showModal(); }
$('guide-open').addEventListener('click', () => run(() => openGuide()));
const preview = dialog('preset-preview','Review your changes');
const previewContent = el('div'); preview.append(previewContent);
const previewActions = el('div','', 'button-row'); preview.append(previewActions);
button(previewActions,'Apply these changes', () => { commitSave(previewCandidate,previewLabel); preview.close(); message('Changes applied. Undo is available above.'); },'primary');
const previewBack = button(previewActions,'Cancel', () => { preview.close(); if (previewFromGuide) guide.showModal(); });
function showPreview(next,label,fromGuide = false) {
  previewFromGuide = fromGuide; previewBack.textContent = fromGuide ? 'Edit choices' : 'Cancel';
  previewCandidate=next; previewLabel=label; previewContent.replaceChildren();
  const before=SaveTools.hiveStats(save), after=SaveTools.hiveStats(next), changes=SaveTools.diff(save,next);
  previewContent.append(el('p',label.replace(/^Apply /,''),'preview-name'));
  const list = el('ul','', 'preview-summary');
  const rows = [`Honey: ${prettyNumber(save.honey || 0)} → ${prettyNumber(next.honey || 0)}`,`Hive: ${before.active}/${before.slots} bees → ${after.active}/${after.slots} bees`,`Average bee level: ${before.averageLevel.toFixed(1)} → ${after.averageLevel.toFixed(1)}`,`Gifted bees: ${before.gifted} → ${after.gifted}`,`Item quantities changed: ${new Set(changes.filter(c=>c.path.startsWith('items.')).map(c=>c.path.split('.')[1])).size}`];
  for (const [key,choices] of Object.entries(GameCatalog.gear)) if (save.currentGear[key] !== next.currentGear[key]) rows.push(`${humanize(key)}: ${choices.find(c=>c.id===save.currentGear[key])?.name || humanize(save.currentGear[key] || 'none')} → ${choices.find(c=>c.id===next.currentGear[key])?.name || humanize(next.currentGear[key] || 'none')}`);
  for (const text of rows) list.append(el('li',text)); previewContent.append(list);
  const details=el('details','', 'feature-details'); details.append(el('summary',`All ${changes.length} saved changes`));
  const all=el('div','', 'preview-diffs');
  for (const change of changes) all.append(el('p',`${change.path}: ${JSON.stringify(change.before) ?? 'not present'} → ${JSON.stringify(change.after) ?? 'removed'}`));
  details.append(all); previewContent.append(details,el('p','Apply when it looks right. You can undo the entire preset in one click.','hint')); preview.showModal();
}
document.querySelectorAll('[data-quick]').forEach(node => node.addEventListener('click', () => run(() => {
  ensureReady(); const action=node.dataset.quick;
  if (action==='headstart' || action==='blue') { openGuide(action==='blue'?'hive':'headstart'); return; }
  if (action==='levels') { showPreview(SaveTools.bulkBees(save,{level:20}),'Max bee levels'); return; }
  const next=clone(save); next.owned ??= {};
  for (const entries of Object.values(GameCatalog.gear)) for (const entry of entries) if(entry.id!=='none') next.owned[entry.id]=true;
  showPreview(next,'Unlock all equipment');
})));
// Existing preset buttons also use the same concrete preview.
document.querySelector('.hive-preset-options').id = 'hive-preset-controls';
$('custom-color').closest('.field-grid').id = 'custom-preset-controls';
for (const mode of ['headstart','endgame','everything']) $('preset-'+mode).addEventListener('click',event=>{
  event.stopImmediatePropagation(); run(()=>{ ensureReady(); showPreview(SavePresets.applyProgress(save,mode,$('endgame-color').value), 'Apply '+humanize(mode)+' preset'); });
},true);
$('apply-hive-preset').addEventListener('click',event=>{
  event.stopImmediatePropagation(); run(()=>{validWithin('hive-preset-controls'); ensureReady(); showPreview(SavePresets.applyHive(save,$('hive-preset').value,{level:Number($('preset-level').value),gifted:$('preset-gifted').checked,gear:$('preset-gear').checked}), 'Apply '+humanize($('hive-preset').value)+' hive');});
},true);
$('apply-custom').addEventListener('click',event=>{
  event.stopImmediatePropagation(); run(()=>{validWithin('custom-preset-controls'); ensureReady(); const resources=$('custom-topup').checked; showPreview(SaveTools.customize(save,{color:$('custom-color').value,count:Number($('custom-count').value),level:Number($('custom-level').value),gifted:$('custom-gifted').checked,gear:$('custom-gear').checked,honey:resources?Number($('custom-honey').value):null,supplies:resources?Number($('custom-supplies').value):null}), 'Apply customized preset');});
},true);
$('custom-topup').addEventListener('change', () => { $('custom-honey').disabled = $('custom-supplies').disabled = !$('custom-topup').checked; });

const hiveSelection=el('div','', 'selection-tools'); $('hive-stats').before(hiveSelection);
const hiveSizeDetails=el('details','', 'feature-details');
hiveSizeDetails.append(el('summary','Hive size & empty slots'));
const hiveTools=document.querySelector('.hive-tools'); hiveTools.before(hiveSizeDetails); hiveSizeDetails.append(hiveTools);
const selectionToggle=button(hiveSelection,'Select several bees',()=>{multiSelect=!multiSelect; chosenSlots.clear(); renderHive();}); selectionToggle.id='multi-toggle';
const selectAll=button(hiveSelection,'Select occupied',()=>{chosenSlots=new Set(save.hive.flat().map((b,i)=>b.type?i:null).filter(i=>i!==null)); renderHiveOverview();});
const clearSelection=button(hiveSelection,'Clear selection',()=>{chosenSlots.clear();renderHiveOverview();});
const selectionCount=el('span','', 'hint'); selectionCount.id='selection-count'; hiveSelection.append(selectionCount);
const selectionFields=el('div','', 'selection-fields field-grid'); hiveSelection.append(selectionFields);
const selectionLevel=draftNumber(selectionFields,'Selected bee level',20,()=>{},1,20,'1'); selectionLevel.id='selection-level';
const selectionGifted=selectControl(selectionFields,'Gifted status','keep',[{id:'keep',name:'Keep current'},{id:'yes',name:'Make gifted'},{id:'no',name:'Remove gifted'}],()=>{});
const selectionApply=button(selectionFields,'Upgrade selected bees',()=>{
  validWithin('selection-count-fields'); const options={level:Number(selectionLevel.value)};
  if(selectionGifted.value!=='keep') options.gifted=selectionGifted.value==='yes';
  commitSave(EditorTools.editSelected(save,[...chosenSlots],options),'Upgrade '+chosenSlots.size+' selected bees');
},'primary'); selectionFields.id='selection-count-fields';
const slotActions=el('div','', 'slot-actions field-grid two');
const slotActionDetails=el('details','', 'feature-details');slotActionDetails.append(el('summary','Copy or rearrange this bee'),slotActions);
let slotDestination=null;
function enhanceHive() {
  const length=save.hive.flat().length; chosenSlots=new Set([...chosenSlots].filter(index=>index<length));
  selectionToggle.textContent=multiSelect?'Finish selecting':'Select several bees'; selectionToggle.setAttribute('aria-pressed',String(multiSelect));
  selectAll.hidden=clearSelection.hidden=selectionFields.hidden=!multiSelect;
  selectionCount.textContent=multiSelect?`${chosenSlots.size} selected · tap bees to select them`:'Drag a bee onto another to swap. Copy and swap also work with the controls below.';
  selectionApply.disabled=!chosenSlots.size;
  for (const [index,tile] of [...$('hive').children].entries()) {
    if (multiSelect) {tile.classList.toggle('selected',chosenSlots.has(index));tile.setAttribute('aria-pressed',String(chosenSlots.has(index)));}
    tile.addEventListener('click',event=>{if(!multiSelect)return;event.stopImmediatePropagation();chosenSlots.has(index)?chosenSlots.delete(index):chosenSlots.add(index);renderHiveOverview();},true);
    tile.draggable=!multiSelect;
    tile.addEventListener('dragstart',event=>{hiveDrag=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(index));});
    tile.addEventListener('dragover',event=>{if(hiveDrag===null)return;event.preventDefault();event.dataTransfer.dropEffect='move';});
    tile.addEventListener('drop',event=>{event.preventDefault();const from=hiveDrag;hiveDrag=null;if(from!==null&&from!==index)run(()=>{commitSave(EditorTools.swapBees(save,from,index),'Swap hive slots '+(from+1)+' and '+(index+1));selectedSlot=index;renderHive();});});
    tile.addEventListener('dragend',()=>{hiveDrag=null;});
  }
  const oldDestination=slotDestination?.value; slotActions.replaceChildren();
  const destination=oldDestination!==undefined && Number(oldDestination)<length && Number(oldDestination)!==selectedSlot ? oldDestination : String((selectedSlot+1)%length);
  slotDestination=selectControl(slotActions,`Copy or swap slot ${selectedSlot+1} with`,destination,save.hive.flat().map((bee,index)=>({id:String(index),name:`Slot ${index+1} · ${beeName(bee.type)}`})),()=>{});
  const actions=el('div','', 'button-row'); slotActions.append(actions);
  button(actions,'Copy bee to slot',()=>commitSave(EditorTools.copyBee(save,selectedSlot,Number(slotDestination.value)),'Copy bee to slot '+(Number(slotDestination.value)+1)));
  button(actions,'Swap slots',()=>commitSave(EditorTools.swapBees(save,selectedSlot,Number(slotDestination.value)),'Swap bee slots'));
  slotActions.append(el('p','Copy replaces the destination bee and keeps the source. Beequips are not duplicated. Undo restores either action.','hint'));
}
function enhanceBeeDetail() {
  const bond=[...$('selected-bee-fields').children].find(label=>label.firstChild?.textContent==='Bond'); if(bond)bond.dataset.advanced='true';
  const mutation=$('selected-mutation'); mutation.dataset.advanced='true'; mutation.previousElementSibling.dataset.advanced='true';
  $('bee-detail').append(el('p','Gifted bees unlock a hive bonus. Multiple gifted bees of the same type share one bonus. Mutations improve one bee’s stat; open Advanced mode to edit them.','hint'));
  $('bee-detail').append(slotActionDetails);
}

const itemCategories=[['all','All items'],['eggs','Eggs & jelly'],['materials','Crafting'],['boosts','Boosts'],['food','Food'],['other','Other']];
function category(id) {
  if(/Egg|Jelly/i.test(id))return'eggs';
  if(/Wax|Extract|oil|enzymes|glue|glitter|turpentine|tropicalDrink/i.test(id))return'materials';
  if(/treat|berry|seed|pineapple|gingerbread/i.test(id))return'food';
  if(/Dice|Potion|Smoothie|gumdrops|stinger|Converter|Balloon|cloudVial/i.test(id))return'boosts';
  return'other';
}
let itemCategory='all', selectedItem='';
const categoryBar=el('div','', 'category-bar'); $('item-search').parentElement.after(categoryBar);
for(const [id,name]of itemCategories){const b=button(categoryBar,name,()=>{itemCategory=id;renderItemBrowser();});b.dataset.category=id;}
const itemBrowser=el('div','', 'item-browser'); itemBrowser.id='item-browser'; categoryBar.after(itemBrowser);
const itemSelection=el('p','Choose an item picture to set its quantity.','hint'); itemSelection.id='item-selection'; itemBrowser.after(itemSelection);
$('item-key').addEventListener('change',()=>{selectedItem=$('item-key').value;renderItemBrowser();});
function renderItemBrowser() {
  const query=$('item-search').value.trim().toLowerCase();
  const entries=GameCatalog.items.filter(item=>(itemCategory==='all'||category(item.id)===itemCategory)&&(!query||item.name.toLowerCase().includes(query)));
  itemBrowser.replaceChildren();
  for(const item of entries){
    const b=el('button','', 'item-tile');b.type='button';b.setAttribute('aria-label',item.name);b.setAttribute('aria-pressed',String(item.id===selectedItem));
    const image=el('img');image.src=ItemPictures[item.id];image.alt='';image.width=36;image.height=36;
    const owned=save?.items[item.id],amount=Array.isArray(owned)?owned[0]:owned;
    b.append(image,el('span',item.name),el('small',typeof amount==='number'?prettyNumber(amount)+' owned':'Not in inventory'));
    b.addEventListener('click',()=>{selectedItem=item.id;if(![...$('item-key').options].some(o=>o.value===item.id))$('item-key').add(new Option(item.name,item.id));$('item-key').value=item.id;renderItemBrowser();$('item-quantity').focus();});itemBrowser.append(b);
  }
  for(const b of categoryBar.children)b.setAttribute('aria-pressed',String(b.dataset.category===itemCategory));
  const chosen=GameCatalog.items.find(i=>i.id===selectedItem);itemSelection.textContent=chosen?`Selected: ${chosen.name}. Enter a quantity, then choose Set quantity.`:'Choose an item picture to set its quantity.';
  if(!entries.length)itemBrowser.append(el('p','No items match. Try a shorter name or choose All items.','hint'));
}
$('item-search').addEventListener('input',()=>{selectedItem=$('item-key').value;renderItemBrowser();});

function persistDraft() {
  if(!save || !original)return;
  try {
    const section=sectionNames.find(name=>!$(name+'-panel').hidden)||'resources';
    const value=JSON.stringify(EditorTools.draft(save,original,section,jsonDirty?$('json-editor').value:null));
    localStorage.setItem(draftKey,value);$('draft-state').textContent='Draft saved on this device · '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  } catch { $('draft-state').textContent='Draft could not be saved in this browser. Download your save to keep it.'; }
}
function scheduleDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(persistDraft,250);}
document.addEventListener('editor-state',event=>{
  if(event.detail==='import'){chosenSlots.clear();recoveredDraft=null;$('draft-banner').hidden=true;}
  scheduleDraft();renderItemBrowser();
});
document.addEventListener('editor-section',event=>{if(advancedSections.includes(event.detail)&&!advancedMode)setMode(true);scheduleDraft();});
window.addEventListener('pagehide',persistDraft);
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistDraft();});
try{
  const value=localStorage.getItem(draftKey);
  if(value){recoveredDraft=EditorTools.readDraft(value);$('draft-banner').hidden=false;$('draft-description').textContent='Saved '+new Date(recoveredDraft.savedAt).toLocaleString()+'. Continue where you left off, including your imported original.';}
}catch{$('draft-state').textContent='An older draft could not be opened. Load a save to begin.';}
$('restore-draft').addEventListener('click',()=>run(()=>{
  const draft=recoveredDraft;if(!draft)return;save=clone(draft.save);original=clone(draft.original);history=new SaveTools.History(original);history.record(save,'Recovered draft');resetSessionViews();render();$('import-box').open=false;
  showSection(sectionNames.includes(draft.section)?draft.section:'resources');
  if(draft.pendingJSON!==null){setMode(true);showSection('json');$('json-editor').value=draft.pendingJSON;jsonDirty=true;$('json-state').textContent='Recovered JSON edits · apply to validate';}
  recoveredDraft=null;$('draft-banner').hidden=true;message('Draft restored. Your imported original is available in Review and Reset edits.');scheduleDraft();
}));
$('discard-draft').addEventListener('click',()=>run(()=>{localStorage.removeItem(draftKey);recoveredDraft=null;$('draft-banner').hidden=true;message('Stored draft discarded.');}));

function readyCode(){ensureReady();const code=SaveCodec.encode(save);$('save-output').value=code;$('copy').disabled=$('download-code').disabled=false;$('export-state').textContent='Verified and ready to import.';persistDraft();return code;}
$('finish-copy').addEventListener('click',async()=>{
  try{const code=readyCode();try{await navigator.clipboard.writeText(code);message('Save copied! Open the game and paste it into the import option.');}
  catch{$('output-box').hidden=false;$('save-output').scrollIntoView({behavior:'smooth',block:'center'});$('save-output').focus();$('save-output').select();message('Your code is selected. Press Ctrl+C or Cmd+C, then paste it into the game.');}}
  catch(error){message(error.message,true);}
});
$('finish-download').addEventListener('click',()=>run(()=>{download(readyCode(),'bss-edited-save.txt','text/plain;charset=utf-8');message('Verified save downloaded. Open the file and copy its code into the game.');}));

let validationCounter=0;
function explainInvalid(input) {
  if(!input.matches('input[type="number"]'))return;
  let row=input.parentElement.querySelector('.field-error');
  if(input.validity.valid){if(row)row.remove();input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');return;}
  if(!row){row=el('div','', 'field-error');row.id='field-error-'+(++validationCounter);input.after(row);}
  input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',row.id);row.replaceChildren();
  const min=input.min!==''?Number(input.min):0,max=input.max!==''?Number(input.max):Number.MAX_SAFE_INTEGER;
  let text=input.validity.valueMissing?'Enter a value.':input.validity.badInput?'Enter a number.':input.validity.rangeUnderflow?`Use ${min} or more.`:input.validity.rangeOverflow?`Use ${max} or less.`:input.validity.stepMismatch?'Use a whole number.':'Check this value.';
  row.append(el('span',text));
  const raw=Number(input.value),clamped=Math.max(min,Math.min(max,Number.isFinite(raw)?raw:min));
  const proposed=input.step==='1'?Math.round(clamped):clamped;
  button(row,'Use '+prettyNumber(proposed),()=>{input.value=String(proposed);input.dispatchEvent(new Event('input',{bubbles:true}));explainInvalid(input);});
}
document.addEventListener('input',event=>explainInvalid(event.target));
document.addEventListener('invalid',event=>explainInvalid(event.target),true);
function revealInvalid(input) {
  if (input.closest('[data-advanced]') && !advancedMode) setMode(true);
  let parent=input.parentElement;
  while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
  explainInvalid(input);input.scrollIntoView({behavior:'smooth',block:'center'});input.focus();
}

const help=dialog('editor-walkthrough','Three steps to your updated save');
const steps=[['1 · Load your save','In the game, copy your export code. Paste it here and choose Load save, or open a saved TXT or JSON file.'],['2 · Make it yours','Use a quick action, build a preset, choose items, or tap bees to edit them. Review shows what changed; Undo reverses your edits. Advanced mode reveals detailed settings.'],['3 · Copy and play','Choose Copy save for the game. The editor checks your code automatically. Open the game, choose its import option, and paste the code.']];
let helpStep=0;const helpBody=el('div','', 'walkthrough-body');help.append(helpBody);const helpControls=el('div','', 'button-row');help.append(helpControls);
const helpBack=button(helpControls,'Back',()=>{helpStep--;renderHelp();});
const helpNext=button(helpControls,'Next',()=>{if(helpStep===2){help.close();try{localStorage.setItem('bss-editor-walkthrough','seen');}catch{}return;}helpStep++;renderHelp();},'primary');
button(helpControls,'Try an example',()=>{help.close();$('example').click();});
function renderHelp(){helpBody.replaceChildren(el('h3',steps[helpStep][0]),el('p',steps[helpStep][1]));helpBack.disabled=helpStep===0;helpNext.textContent=helpStep===2?'Got it':'Next';}
$('walkthrough-open').addEventListener('click',()=>{helpStep=0;renderHelp();help.showModal();});
try{if(!localStorage.getItem('bss-editor-walkthrough')&&!recoveredDraft){helpStep=0;renderHelp();help.showModal();}}catch{}
renderItemBrowser();

const explanations = {
  amulets: ['Understanding bonuses','×1.5 means 50% more of a stat. Additive percentages use decimals: +0.1 means +10%. A passive is a special ability, such as Pop Star; the amulet tier limits which passives you can choose. Changes apply after you press Apply amulet.'],
  beequips: ['Choosing a beequip','Beequips are accessories for individual bees. Each has level, color or bee-type requirements. Disabled choices in Assigned bee show bees that cannot use it. Bee bonuses affect that bee; hive bonuses affect your whole hive.'],
  boosts: ['Nectar and duration','Nectar strength follows how much time remains. Full nectar sets all five to their maximum duration. Other buffs can have multiple stacks; more stacks usually strengthen the effect. The game’s limits appear beside the controls.'],
  hive: ['Levels, gifted bees and mutations','Level is determined by bond, which is experience earned by a bee. Gifted status unlocks a hive bonus for that bee type. A mutation changes one stat, such as attack or ability rate. Multiply ×1.2 means 20% more; Add +2 increases the value by two.']
};
for(const [id,[title,text]]of Object.entries(explanations)){
  const details=el('details','', 'inline-help');details.append(el('summary',title),el('p',text,'hint'));$(id+'-panel').children[1].after(details);
}
