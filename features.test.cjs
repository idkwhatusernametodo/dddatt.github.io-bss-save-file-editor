const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const tools = require('./features');
const data = require('./game-data');
const presets = require('./presets');
const codec = require('./codec');
const example = require('./example.json');
const start = () => presets.applyProgress(example,'endgame','blue');

test('amulets serialize source stats, enforce passive limits, and replace only the same family', () => {
  const save = start(); save.currentGear.bronzeStarAmulet = '*1.2 capacityMultiplier'; save.currentGear.moonAmulet = '+500 capacity';
  const next = tools.amulet(save,'supremeStarAmulet',[{op:'*',stat:'capacityMultiplier',value:2.5},{op:'+',stat:'criticalChance',value:0.1}],['popStarPassive','starSawPassive']);
  assert.equal(next.currentGear.supremeStarAmulet,'*2.5 capacityMultiplier,+0.1 criticalChance,P popStarPassive,P starSawPassive');
  assert.equal(next.currentGear.bronzeStarAmulet,undefined);
  assert.equal(next.currentGear.moonAmulet,save.currentGear.moonAmulet);
  assert.throws(() => tools.amulet(save,'bronzeStarAmulet',[],['popStarPassive']));
  assert.throws(() => tools.amulet(save,'diamondStarAmulet',[],['popStarPassive']));
  assert.deepEqual(codec.decode(codec.encode(next)),next);
});
test('bulk bee editing preserves individual metadata and changes occupied slots only', () => {
  const save = start(); save.hive[0][0].unknown = {hello:'world'}; save.hive[0][1].type = null;
  const next = tools.bulkBees(save,{level:15,gifted:false,mutation:{stat:'attack',oper:'*',num:1.3}});
  assert.equal(next.hive[0][0].bond,800000); assert.equal(next.hive[0][0].gifted,false);
  assert.deepEqual(next.hive[0][0].unknown,save.hive[0][0].unknown);
  assert.equal(next.hive[0][1].bond,save.hive[0][1].bond);
  assert.equal(tools.hiveStats(start()).colors.blue,35);
  assert.ok(tools.hiveStats(start()).events > 0);
  assert.throws(() => tools.bulkBees(save,{mutation:{stat:'notValid',oper:'*',num:1.3}}));
});
test('beequip creation, editing, reassignment, and removal synchronize both copies', () => {
  let save = start(); save.extraInfo.beequipIds = 40;
  save = tools.beequip(save,null,{type:'pencil'},3);
  const item = save.currentGear.beequips[0]; assert.equal(item.id,40); assert.equal(save.extraInfo.beequipIds,41);
  assert.deepEqual(item.bee,[3,0]); assert.deepEqual(save.hive[0][3].beequip,item);
  const stats = {bee:'*1.4 abilityRate(+0.05),*1.2 maxEnergy(+0),+9 convertAmount(+0)',player:''};
  save = tools.beequip(save,40,{stats,potential:5},5);
  assert.equal(save.hive[0][3].beequip,undefined);
  assert.deepEqual(save.hive[1][0].beequip,save.currentGear.beequips[0]);
  assert.equal(save.hive[1][0].beequip.stats.bee,stats.bee);
  assert.deepEqual(codec.decode(codec.encode(save)),save);
  assert.throws(() => tools.beequip(save,40,{},0));
  save = tools.removeBeequip(save,40); assert.equal(save.currentGear.beequips.length,0); assert.equal(save.hive[1][0].beequip,undefined);
});
test('resizing and replacing hive unassigns beequips without deleting owned items', () => {
  let save = tools.beequip(start(),null,{type:'pencil'},49 - 1); // blue's last tadpole
  const next = tools.syncBeequips(presets.resizeHive(save,25));
  assert.equal(next.currentGear.beequips.length,1); assert.equal(next.currentGear.beequips[0].bee,null);
  const replaced = tools.syncBeequips(presets.applyHive(save,'red'));
  assert.equal(replaced.currentGear.beequips[0].bee,null);
});
test('drives enforce the actual cap, recompute maxed, and preserve extra info', () => {
  const save = start(); save.extraInfo.custom = 'keep';
  const next = tools.drives(save,{red:50,blue:50,white:49,glitched:50});
  assert.equal(next.extraInfo.drives.maxed,false); assert.equal(next.extraInfo.custom,'keep');
  assert.throws(() => tools.drives(save,{red:51,blue:0,white:0,glitched:0}));
});
test('nectar uses a duration fraction, infinite buffs use null, and unrelated effect fields survive', () => {
  const save = start(); save.effects = [{type:'comfortingNectar',cooldown:1,amount:1,custom:true}];
  const next = tools.effect(save,'comfortingNectar',1,10800);
  assert.deepEqual(next.effects[0],{type:'comfortingNectar',cooldown:10800,amount:0.5,custom:true});
  assert.throws(() => tools.effect(save,'comfortingNectar',1,21601));
  const forever = data.effects.find(effect => effect.saved && !effect.isPassive && effect.maxCooldown === null);
  if (forever) assert.equal(tools.effect(save,forever.id,1,null).effects.at(-1).cooldown,null);
  assert.deepEqual(codec.decode(codec.encode(next)),next);
});
test('quest progress adjusts baseline, clears completion when lowered, and uses correct NPC continuation', () => {
  const meta = data.quests.find(quest => quest.name === 'Sunflower Start');
  const save = structuredClone(example); save.stats[meta.req[0][0]] = 55;
  const next = tools.addQuest(save,meta.id);
  assert.equal(next.NPCs[meta.NPC].index,meta.npcIndex);
  assert.equal(next.quests[0].req[0][2],55);
  const complete = tools.questProgress(next,0,0,100);
  assert.equal(complete.quests[0].req[0][2],-45); assert.equal(complete.quests[0].req[0][3],true);
  const partial = tools.questProgress(complete,0,0,25);
  assert.equal(partial.quests[0].req[0][2],30); assert.equal(partial.quests[0].req[0][3],false);
  assert.equal(partial.stats[meta.req[0][0]],55);
  assert.throws(() => tools.addQuest(next,meta.id)); assert.deepEqual(codec.decode(codec.encode(partial)),partial);
});
test('balloon blessing remains consistent with the game formula and safe precision', () => {
  const next = tools.balloon(example,1000000,20), balloon = next.hiveBalloon;
  assert.equal(Math.max(Math.ceil(Math.pow(balloon.maxPollen,1/7)*2-4),1),20);
  assert.ok(balloon.maxPollen >= balloon.pollen);
  assert.throws(() => tools.balloon(example,1000000000,1));
  assert.throws(() => tools.balloon(example,0,1000));
});
test('customize and inventory shortcuts preserve unrelated fields and item cooldowns', () => {
  const save = structuredClone(example); save.items.glue = [2,100]; save.extra = {preserve:true};
  const next = tools.customize(save,{color:'white',level:10,count:35,gifted:true,gear:true,honey:123,supplies:500});
  assert.equal(next.hive.flat().length,35); assert.equal(next.hive[0][0].bond,25000); assert.equal(next.honey,123);
  assert.deepEqual(next.items.glue,[500,100]); assert.deepEqual(next.NPCs,save.NPCs); assert.deepEqual(next.extra,save.extra);
});
test('shared builds load onto another save without copying quests or cooldowns', () => {
  const save = start(), build = tools.makeBuild(save,'Test build',true);
  const target = structuredClone(example); target.items.royalJelly = [4,777]; target.quests = [{name:'Keep',NPC:'blackBear',req:[]}];
  const next = tools.applyBuild(target,JSON.parse(JSON.stringify(build)));
  assert.equal(next.hive.flat().length,50); assert.equal(next.items.royalJelly[1],777); assert.deepEqual(next.quests,target.quests);
  assert.deepEqual(codec.decode(codec.encode(next)),next);
  assert.throws(() => tools.applyBuild(target,{format:'bad'}));
});
test('history supports coalesced fields, undo/redo, branching, and immutable bounded snapshots', () => {
  const history = new tools.History(example,3), next = structuredClone(example);
  next.honey = 1; history.record(next,'Honey','honey'); next.honey = 12; history.record(next,'Honey','honey');
  assert.equal(history.entries.length,2); assert.equal(history.undo().honey,0); assert.equal(history.redo().honey,12);
  history.undo(); next.honey = 5; history.record(next,'New honey'); assert.equal(history.canRedo,false);
  for (let i=0;i<10;i++) {next.honey=100+i;history.record(next,'Another edit');}
  assert.equal(history.entries.length,4); const returned=history.undo();returned.honey=9999;assert.notEqual(history.entries[history.index].save.honey,9999);
});
test('diff includes additions, removals, arrays, and unknown fields without mutating inputs', () => {
  const before = {items:{treat:1},hive:[[{type:'basic'}]],old:true}, after = {items:{treat:3},hive:[[{type:'basic'}]],future:{nested:42}};
  assert.deepEqual(tools.diff(before,after).map(change=>change.path),['items.treat','old','future']);
  assert.equal(before.items.treat,1);
});
if (process.env.BSS_GAME_SOURCE) test('new feature edits are read exactly by the actual game decoder', () => {
  const source = fs.readFileSync(process.env.BSS_GAME_SOURCE,'utf8'), begin = source.indexOf('function RUN_SAVE_CODE(string){'), end = source.indexOf('let save',begin);
  const decode = new Function('string',source.slice(begin,end).replace('function RUN_SAVE_CODE(string){','')+'return JSON.parse(string);');
  let save = start();
  save = tools.effect(save,'comfortingNectar',1,10000); save = tools.beequip(save,null,{type:'pencil'},3);
  save = tools.balloon(save,1000000,20); save = tools.addQuest(save,data.quests[0].id); save = tools.questProgress(save,0,0,save.quests[0].req[0][1]);
  assert.deepEqual(decode(codec.encode(save)),save);
});
