/* Hive templates from https://github.com/Dddatt/bss/blob/main/index.js (2026-10-10). */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog.js'));
  else root.SavePresets = factory(root.GameCatalog);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(catalog) {
  'use strict';
  const templates = {
  "mid": {
    "bees": [
      "basic",
      "looker",
      "bomber",
      "rascal",
      "riley",
      "cool",
      "bumble",
      "bucko",
      "demo",
      "commander",
      "stubborn",
      "hasty",
      "rad",
      "shocked",
      "shocked",
      "exhausted",
      "baby",
      "baby",
      "baby",
      "crimson",
      "gummy",
      "cobalt",
      "fire",
      "bubble",
      "fire",
      "bubble",
      "frosty",
      "frosty",
      "shy",
      "tadpole",
      "ninja",
      "tabby",
      "rage",
      "rage",
      "rage",
      "music",
      "music",
      "music",
      "lion",
      "lion",
      "shy",
      "demon",
      "diamond",
      "carpenter",
      "carpenter",
      "carpenter"
    ],
    "gear": {
      "tool": "petalWand",
      "boots": "mondoBoots",
      "belt": "honeycombBelt",
      "backpack": "porcelainOHive",
      "mask": "honeyMask",
      "leftGuard": "rileyGuard",
      "rightGuard": "buckoGuard",
      "glider": "glider",
      "sprinkler": "superSaturator"
    }
  },
  "red": {
    "bees": [
      "basic",
      "looker",
      "fire",
      "spicy",
      "rad",
      "rascal",
      "commander",
      "riley",
      "shy",
      "precise",
      "bear",
      "festive",
      "windy",
      "tabby",
      "hasty",
      "fuzzy",
      "music",
      "music",
      "music",
      "tadpole",
      "tadpole",
      "tadpole",
      "gummy",
      "precise",
      "precise",
      "precise",
      "precise",
      "precise",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "carpenter",
      "carpenter",
      "carpenter",
      "spicy",
      "spicy",
      "spicy",
      "spicy",
      "spicy",
      "spicy",
      "spicy",
      "spicy",
      "spicy",
      "spicy",
      "spicy",
      "spicy",
      "crimson",
      "digital"
    ],
    "gear": {
      "tool": "darkScythe",
      "boots": "gummyBoots",
      "belt": "petalBelt",
      "backpack": "coconutCanister",
      "mask": "demonMask",
      "leftGuard": "crimsonGuard",
      "rightGuard": "cobaltGuard",
      "glider": "glider",
      "supremeStarAmulet": "*2.5 capacityMultiplier,*1.5 convertRate,*1.1 redPollen,*1.1 bluePollen,*1.1 whitePollen,*1.6 redPollen,+0.1 instantBlueConversion,+0.1 instantWhiteConversion,+0.1 instantRedConversion,+0.05 criticalChance,P scorchingStarPassive,P starSawPassive",
      "sprinkler": "superSaturator"
    }
  },
  "blue": {
    "bees": [
      "basic",
      "looker",
      "bomber",
      "bubble",
      "bumble",
      "bucko",
      "cool",
      "frosty",
      "commander",
      "windy",
      "tabby",
      "diamond",
      "hasty",
      "fuzzy",
      "ninja",
      "vicious",
      "bear",
      "music",
      "music",
      "music",
      "gummy",
      "honey",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "buoyant",
      "tadpole",
      "tadpole",
      "tadpole",
      "tadpole",
      "tadpole",
      "tadpole",
      "tadpole",
      "tadpole",
      "tadpole",
      "tadpole",
      "digital"
    ],
    "gear": {
      "tool": "tidePopper",
      "boots": "gummyBoots",
      "belt": "petalBelt",
      "backpack": "coconutCanister",
      "mask": "diamondMask",
      "leftGuard": "crimsonGuard",
      "rightGuard": "cobaltGuard",
      "glider": "glider",
      "supremeStarAmulet": "*2.5 capacityMultiplier,*1.5 convertRate,*1.1 redPollen,*1.1 bluePollen,*1.1 whitePollen,*1.6 bluePollen,+0.1 instantBlueConversion,+0.1 instantWhiteConversion,+0.1 instantRedConversion,+0.05 criticalChance,P popStarPassive,P starShowerPassive",
      "sprinkler": "superSaturator"
    }
  },
  "white": {
    "bees": [
      "basic",
      "bomber",
      "looker",
      "precise",
      "vector",
      "windy",
      "bear",
      "festive",
      "honey",
      "commander",
      "shocked",
      "hasty",
      "music",
      "music",
      "music",
      "crimson",
      "tadpole",
      "tadpole",
      "tadpole",
      "lion",
      "gummy",
      "photon",
      "tabby",
      "carpenter",
      "carpenter",
      "carpenter",
      "carpenter",
      "carpenter",
      "demo",
      "exhausted",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "vector",
      "fuzzy",
      "precise",
      "precise",
      "precise",
      "precise",
      "precise",
      "digital"
    ],
    "gear": {
      "tool": "gummyBaller",
      "boots": "gummyBoots",
      "belt": "petalBelt",
      "backpack": "coconutCanister",
      "mask": "gummyMask",
      "leftGuard": "crimsonGuard",
      "rightGuard": "cobaltGuard",
      "glider": "glider",
      "supremeStarAmulet": "*2.5 capacityMultiplier,*1.5 convertRate,*1.1 redPollen,*1.1 bluePollen,*1.1 whitePollen,*1.6 whitePollen,+0.1 instantBlueConversion,+0.1 instantWhiteConversion,+0.1 instantRedConversion,+0.05 criticalChance,P gummyStarPassive,P starSawPassive",
      "sprinkler": "superSaturator"
    }
  }
};
  const clone = value => JSON.parse(JSON.stringify(value));
  const bonds = [0, 10, 50, 250, 750, 1500, 3000, 6000, 12500, 25000, 50000, 100000, 200000, 400000, 800000, 1600000, 3200000, 6400000, 12800000, 25600000];
  const mixed = [...catalog.bees.map(bee => bee.id), 'music', 'music', 'carpenter', 'baby'];
  function levelBond(level) {
    if (!Number.isInteger(level) || level < 1 || level > 20) throw new Error('Choose a bee level from 1 to 20.');
    return bonds[level - 1];
  }
  function rows(bees) {
    const result = [];
    for (let i = 0; i < bees.length; i += 5) result.push(bees.slice(i, i + 5));
    return result;
  }
  function roster(color) {
    if (color === 'mixed') return mixed;
    if (!['white', 'red', 'blue'].includes(color)) throw new Error('Choose a white, red, blue, or mixed hive.');
    return templates[color].bees;
  }
  function discover(save) {
    save.discoveredBees ??= [];
    save.discoveredGifteds ??= [];
    for (const bee of save.hive.flat()) {
      if (!bee.type) continue;
      if (!save.discoveredBees.includes(bee.type)) save.discoveredBees.push(bee.type);
      if (bee.gifted && !save.discoveredGifteds.includes(bee.type)) save.discoveredGifteds.push(bee.type);
    }
  }
  function equip(save, gear) {
    save.currentGear = { ...save.currentGear, ...gear };
    save.owned ??= {};
    for (const [slot, id] of Object.entries(gear)) {
      if (catalog.gear[slot] && id !== 'none') save.owned[id] = true;
    }
    // The game's mask checks require these owned masks to activate secondary passives.
    if (gear.mask === 'demonMask') save.owned.fireMask = true;
    if (gear.mask === 'diamondMask') save.owned.bubbleMask = true;
    if (gear.mask === 'gummyMask') save.owned.honeyMask = true;
  }
  function setAmount(save, id, quantity) {
    const existing = save.items[id];
    const amount = Math.max(quantity, Array.isArray(existing) ? existing[0] : (existing || 0));
    if (Array.isArray(existing)) existing[0] = amount;
    else save.items[id] = amount;
  }
  function applyHive(save, color, { level = 20, gifted = true, gear = false } = {}) {
    const next = clone(save), bond = levelBond(level);
    next.hive = rows(roster(color).map(type => ({ type, gifted: !!gifted, bond })));
    discover(next);
    if (gear) equip(next, templates[color === 'mixed' ? 'white' : color].gear);
    return next;
  }
  function resizeHive(save, count) {
    if (!Number.isInteger(count) || count < 25 || count > 50) throw new Error('Choose 25 to 50 hive slots.');
    const next = clone(save), bees = next.hive.flat().slice(0, count);
    while (bees.length < count) bees.push({ type: null, gifted: false, bond: 0 });
    next.hive = rows(bees);
    return next;
  }
  function fillEmpty(save, type, level = 1, gifted = false) {
    if (!catalog.bees.some(bee => bee.id === type)) throw new Error('Choose a bee from the list.');
    const next = clone(save), bond = levelBond(level);
    for (const bee of next.hive.flat()) {
      if (!bee.type) Object.assign(bee, { type, gifted: !!gifted, bond });
    }
    discover(next);
    return next;
  }
  function applyProgress(save, mode, color = 'blue') {
    let next;
    if (mode === 'headstart') {
      next = clone(save);
      next.hive = rows(templates.mid.bees.slice(0, 35).map(type => ({ type, gifted: false, bond: levelBond(8) })));
      equip(next, { tool: 'goldenRake', boots: 'hikingBoots', belt: 'beltBag', backpack: 'portOHive', mask: 'beekeeperMask', leftGuard: 'rileyGuard', rightGuard: 'buckoGuard', glider: 'glider', sprinkler: 'basicSprinkler' });
      next.honey = Math.max(next.honey || 0, 5000000);
      for (const [id, amount] of Object.entries({ royalJelly: 500, treat: 10000, basicEgg: 25, ticket: 500, gumdrops: 1000 })) setAmount(next, id, amount);
      discover(next);
    } else if (mode === 'endgame' || mode === 'everything') {
      next = applyHive(save, mode === 'everything' ? 'mixed' : color, { gear: true });
      next.honey = Math.max(next.honey || 0, mode === 'everything' ? 1000000000000000 : 1000000000000);
      const supplies = mode === 'everything' ? catalog.items.map(item => item.id) : ['royalJelly', 'treat', 'ticket', 'gumdrops', 'glitter', 'glue', 'oil', 'enzymes', 'redExtract', 'blueExtract', 'superSmoothie', 'starTreat'];
      for (const id of supplies) setAmount(next, id, mode === 'everything' ? 100000 : 10000);
      next.extraInfo ??= {};
      next.extraInfo.drives ??= {};
      for (const id of ['red', 'blue', 'white', 'glitched']) next.extraInfo.drives[id] = Math.max(next.extraInfo.drives[id] || 0, 50);
      next.extraInfo.drives.maxed = true;
      if (mode === 'everything') {
        next.owned ??= {};
        for (const choices of Object.values(catalog.gear)) for (const { id } of choices) if (id !== 'none') next.owned[id] = true;
      }
    } else throw new Error('Choose a progress preset.');
    return next;
  }
  function composition(color) {
    const counts = new Map();
    for (const id of roster(color)) counts.set(id, (counts.get(id) || 0) + 1);
    return [...counts].map(([id, count]) => ({ id, count, name: catalog.bees.find(bee => bee.id === id)?.name || id })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
  return { templates, levelBond, applyHive, resizeHive, fillEmpty, applyProgress, composition };
});
