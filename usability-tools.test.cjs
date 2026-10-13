const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs');
const tools=require('./features'), edit=require('./usability-tools'), presets=require('./presets'), codec=require('./codec');
const example=()=>JSON.parse(fs.readFileSync(__dirname+'/example.json','utf8'));
test('selected upgrades change only chosen slots and round-trip their values',()=>{
  const save=presets.applyProgress(example(),'endgame','blue'), old=JSON.stringify(save);
  const next=edit.editSelected(save,[0,2],{level:12,gifted:false});
  assert.equal(tools.level(next.hive[0][0]),12);assert.equal(next.hive[0][2].gifted,false);
  assert.deepEqual(next.hive[0][1],save.hive[0][1]);assert.equal(JSON.stringify(save),old);
  assert.deepEqual(codec.decode(codec.encode(next)),next);
});
test('copying and swapping keep beequip ownership and coordinates consistent',()=>{
  let save=presets.applyProgress(example(),'endgame','blue');
  save=tools.beequip(save,null,{type:'pencil'},3);
  const id=save.hive[0][3].beequip.id;
  let copied=edit.copyBee(save,3,4);
  assert.equal(copied.hive[0][4].type,save.hive[0][3].type);
  assert.equal(copied.hive[0][4].beequip,undefined);assert.equal(copied.hive[0][3].beequip.id,id);
  const moved=edit.swapBees(save,3,8);
  assert.equal(moved.hive[1][3].beequip.id,id);assert.deepEqual(moved.currentGear.beequips[0].bee,[3,1]);
  assert.deepEqual(codec.decode(codec.encode(moved)),moved);
  const lowered=edit.editSelected(save,[3],{level:1});
  assert.equal(lowered.hive[0][3].beequip,undefined);assert.equal(lowered.currentGear.beequips[0].bee,null);
});
test('guided presets respect stage, selected count, and gear preservation',()=>{
  const source=example();source.items.basicEgg=[7,99];source.extraField={keep:true};
  for(const stage of ['headstart','endgame','everything','hive']){
    const next=edit.guided(source,{stage,color:'red',count:35,level:10,gifted:true,gear:false});
    assert.equal(next.hive.flat().length,35);assert.equal(tools.level(next.hive[0][0]),10);
    assert.deepEqual(next.currentGear,source.currentGear);assert.deepEqual(next.quests,source.quests);
    assert.deepEqual(next.extraField,source.extraField);
    if(stage==='hive')assert.deepEqual(next.items,source.items);
    assert.deepEqual(codec.decode(codec.encode(next)),next);
  }
});
test('draft recovery retains comparison original and pending JSON, rejecting damaged snapshots',()=>{
  const original=example(),save=tools.clone(original);save.honey=123456;
  const snapshot=edit.readDraft(JSON.stringify(edit.draft(save,original,'json','{ unfinished')));
  assert.equal(snapshot.save.honey,123456);assert.equal(snapshot.original.honey,original.honey);
  assert.equal(snapshot.pendingJSON,'{ unfinished');
  assert.throws(()=>edit.readDraft('{"version":1}'));
  assert.throws(()=>edit.readDraft(JSON.stringify({...snapshot,save:{honey:1}})));
});
test('guided headstart keeps starter gear while endgame equips the selected color',()=>{
  const options={stage:'headstart',color:'blue',count:35,level:8,gifted:false,gear:true};
  const starter=edit.guided(example(),options);
  assert.equal(starter.currentGear.tool,'goldenRake');assert.equal(starter.honey,5000000);
  const endgame=edit.guided(example(),{...options,stage:'endgame',count:50,level:20,gifted:true});
  assert.equal(endgame.currentGear.tool,'tidePopper');assert.equal(endgame.honey,1000000000000);
  const all=edit.guided(example(),{...options,stage:'everything',count:50,gear:false});
  assert.equal(all.currentGear.tool,example().currentGear.tool);assert.equal(all.owned.tidePopper,true);assert.equal(all.owned.gummyBaller,true);
});
test('item picture catalog covers every selectable item with offline SVG art',()=>{
  const pictures=require('./item-pictures'), catalog=require('./catalog');
  for(const item of catalog.items){assert.match(pictures[item.id],/^data:image\/svg\+xml,/);assert.match(decodeURIComponent(pictures[item.id].split(',').slice(1).join(',')),/<svg/);}
});
if(process.env.BSS_GAME_SOURCE)test('edited save with signed NPC seeds and fractional bond loads in the actual game decoder',()=>{
  const save=presets.applyProgress(example(),'headstart','blue');
  save.NPCs.polarBear.seed=-12345;save.NPCs.brownBear.seed=-98765;
  save.hive[0][0].bond=100.5;save.honey=500000;
  const source=fs.readFileSync(process.env.BSS_GAME_SOURCE,'utf8'),start=source.indexOf('function RUN_SAVE_CODE(string){'),end=source.indexOf('let save',start);
  const decode=new Function('string',source.slice(start,end).replace('function RUN_SAVE_CODE(string){','')+'return JSON.parse(string);');
  assert.deepEqual(decode(codec.encode(save)),save);
  const next=edit.editSelected(save,[1],{level:12});
  assert.equal(next.NPCs.polarBear.seed,-12345);assert.equal(next.hive[0][0].bond,100.5);
  assert.deepEqual(decode(codec.encode(next)),next);
});
