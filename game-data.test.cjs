const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const data = require('./game-data.js');
const context = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(__dirname+'/catalog.js','utf8'),context);
const catalog = context.window.GameCatalog;

test('source metadata covers every existing bee and equipment choice',()=>{
  for(const bee of catalog.bees){
    const info=data.bees[bee.id];
    assert.ok(info,bee.id);
    assert.ok(['white','red','blue'].includes(info.color),bee.id);
    assert.equal(info.group.toLowerCase(),bee.group.toLowerCase(),bee.id);
    const svg=decodeURIComponent(info.icon.split(',').slice(1).join(','));
    assert.match(svg,/<svg[^>]*viewBox="[\d.]+ [\d.]+ 128 128"/);
    assert.match(svg,/<path /);
    assert.doesNotMatch(svg,/<script|onload=|href=/i);
  }
  for(const [slot,items] of Object.entries(catalog.gear)){
    for(const item of items)assert.ok(data.gear[slot][item.id],slot+':'+item.id);
  }
});

test('time-derived nectar matches all five six-hour source effects',()=>{
  const nectars=data.effects.filter(e=>e.isNectar);
  assert.equal(nectars.length,5);
  for(const nectar of nectars){
    assert.equal(nectar.maxCooldown,21600);
    assert.equal(nectar.maxAmount,1);
    assert.equal(nectar.amountFromCooldown,true);
    assert.equal(nectar.saved,true);
  }
  assert.equal(data.effects.find(e=>e.id==='polarPower').maxCooldown,null);
  assert.equal(data.effects.find(e=>e.id==='scienceEnhancement').maxAmount,1000);
  for(const effect of data.effects.filter(e=>e.saved))assert.doesNotMatch(effect.id,/Passive|Aura/);
});

test('beequip restrictions and generated defaults only reference supported stats',()=>{
  assert.equal(data.beequips.length,7);
  const playerStats=new Set(data.playerStats.map(s=>s.id));
  for(const item of data.beequips){
    assert.ok(item.types.length);
    for(const type of item.types)assert.ok(data.bees[type]);
    for(const stat of item.playerStats)assert.ok(playerStats.has(stat),item.id+':'+stat);
    for(const statString of [item.stats.bee,item.stats.player]){
      for(const stat of statString.split(',').filter(Boolean))assert.match(stat,/^[+*]-?\d+(?:\.\d+)? [a-zA-Z]+\(\+0\)$/);
    }
  }
  assert.equal(data.beequips.find(b=>b.id==='coffeeMug').gifted,true);
  assert.deepEqual(data.beequips.find(b=>b.id==='boombox').types.sort(),['looker','hasty','buoyant','cool','riley','shy','exhausted'].sort());
  assert.equal(data.beequips.find(b=>b.id==='lumpOfCoal').playerStats.length,8);
});

test('amulet tiers preserve source star passive restrictions',()=>{
  assert.equal(data.amuletSlots.length,26);
  const star=data.amuletSlots.find(a=>a.id==='supremeStarAmulet');
  assert.equal(star.maxPassives,2);
  assert.equal(star.passives.length,6);
  assert.equal(data.amuletSlots.find(a=>a.id==='diamondStarAmulet').maxPassives,1);
  for(const slot of data.amuletSlots){
    for(const passive of slot.passives)assert.ok(data.passives.find(p=>p.id===passive&&p.amulet));
    if(slot.maxPassives===0)assert.equal(slot.passives.length,0);
  }
});

test('quest templates provide valid requirements and continuation indices',()=>{
  assert.ok(data.quests.length>150);
  assert.equal(new Set(data.quests.map(q=>q.id)).size,data.quests.length);
  for(const quest of data.quests){
    assert.ok(Number.isInteger(quest.npcIndex)&&quest.npcIndex>0);
    assert.equal(typeof quest.NPC,'string');
    assert.ok(quest.req.length);
    for(const [stat,target] of quest.req){assert.equal(typeof stat,'string');assert.ok(Number.isFinite(target)&&target>0);}
  }
  const first=data.quests.find(q=>q.name==='Sunflower Start');
  assert.deepEqual(first.req,[['pollenFromSunflowerField',100]]);
  assert.equal(first.npcIndex,3);
  assert.equal(first.NPC,'blackBear');
});

test('gear comparison retains numerical operations and source descriptions',()=>{
  assert.ok(data.gear.mask.diamondMask.stats.includes('*3 capacityMultiplier'));
  assert.ok(data.gear.mask.diamondMask.stats.includes('P diamondDrainPassive'));
  assert.ok(data.gear.tool.tidePopper.collectAmount>0);
  assert.ok(data.gear.tool.tidePopper.cooldown>0);
  assert.ok(data.gear.sprinkler.superSaturator.power>0);
  assert.match(data.gear.backpack.coconutCanister.description,/capacity/i);
});

test('static metadata loads in browser without Node globals',()=>{
  const browser=vm.createContext({});
  vm.runInContext(fs.readFileSync(__dirname+'/game-data.js','utf8'),browser);
  assert.equal(browser.GameData.beequips.length,7);
  assert.equal(browser.GameData.bees.digital.name,'Digital Bee');
});

test('amulet dropdown stats have finite initialized game values',()=>{
  const ids=new Set(data.playerStats.map(s=>s.id));
  assert.equal(ids.has('beeAbilityRate'),false);
  assert.ok(ids.has('redBeeAbilityRate'));
  assert.ok(ids.has('blueBeeAbilityRate'));
  assert.ok(ids.has('whiteBeeAbilityRate'));
  assert.equal(data.playerStatDefaults.capacityMultiplier,1);
  for(const stat of data.playerStats){
    const initial=data.playerStatDefaults[stat.id];
    assert.ok(Number.isFinite(initial),stat.id);
    assert.ok(Number.isFinite(initial*1.5),stat.id);
    assert.ok(Number.isFinite(initial+0.1),stat.id);
  }
  for(const items of Object.values(data.gear))for(const item of Object.values(items)){
    for(const expression of item.stats.filter(stat=>!stat.startsWith('P '))){
      const stat=expression.split(' ')[1];
      assert.ok(ids.has(stat),'gear stat '+stat);
    }
  }
});
