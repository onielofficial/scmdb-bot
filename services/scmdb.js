const fs = require('fs');
const path = require('path');

const DATA_PATH         = path.join(__dirname, '../data/merged.json');
const CRAFT_ITEMS_PATH  = path.join(__dirname, '../data/crafting_items.json');
const BLUEPRINTS_PATH   = path.join(__dirname, '../data/crafting_blueprints.json');
let _cache       = null;
let _craftCache  = null;
let _bpCache     = null;

function priorityFind(arr, keyFn, kw) {
  const lkw = kw.toLowerCase();
  return arr.find(x => keyFn(x)?.toLowerCase() === lkw)
      || arr.find(x => keyFn(x)?.toLowerCase().startsWith(lkw))
      || arr.find(x => keyFn(x)?.toLowerCase().includes(lkw));
}

function getData() {
  if (_cache) return _cache;
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error('ไม่พบไฟล์ข้อมูล กรุณารัน: npm run download ก่อน');
  }
  _cache = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  return _cache;
}

function getCraftItemsData() {
  if (_craftCache) return _craftCache;
  if (!fs.existsSync(CRAFT_ITEMS_PATH)) {
    throw new Error('ไม่พบไฟล์ crafting_items.json');
  }
  _craftCache = JSON.parse(fs.readFileSync(CRAFT_ITEMS_PATH, 'utf8'));
  return _craftCache;
}

function getBlueprintsData() {
  if (_bpCache) return _bpCache;
  if (!fs.existsSync(BLUEPRINTS_PATH)) {
    throw new Error('ไม่พบไฟล์ crafting_blueprints.json');
  }
  _bpCache = JSON.parse(fs.readFileSync(BLUEPRINTS_PATH, 'utf8'));
  return _bpCache;
}

function resolveFaction(data, factionGuid) {
  return data.factions?.[factionGuid]?.name || '?';
}

function resolveBlueprintNames(data, blueprintRewards) {
  const names = [];
  for (const br of (blueprintRewards || [])) {
    const pool = data.blueprintPools?.[br.blueprintPool];
    for (const bp of (pool?.blueprints || [])) {
      if (bp.name) names.push(bp.name);
    }
  }
  return [...new Set(names)];
}

function searchBlueprint(keyword) {
  const data = getData();
  const kw = keyword.toLowerCase();
  const results = [];
  for (const contract of (data.contracts || [])) {
    if (!contract.blueprintRewards?.length) continue;
    const allBpNames = resolveBlueprintNames(data, contract.blueprintRewards);
    const matched = allBpNames.filter(name => name.toLowerCase().includes(kw));
    if (matched.length > 0) {
      const matchingReward = contract.blueprintRewards.find(br => {
        const pool = data.blueprintPools?.[br.blueprintPool];
        return (pool?.blueprints || []).some(bp => matched.includes(bp.name));
      });
      results.push({
        title: contract.title,
        faction: resolveFaction(data, contract.factionGuid),
        rewardUec: contract.rewardUEC,
        blueprints: matched,
        system: (contract.systems || []).join(', '),
        missionType: contract.missionType || '?',
        illegal: !!contract.illegal,
        dropRate: Math.round((matchingReward?.chance ?? 1) * 100),
      });
    }
  }
  return results;
}

function findResource(keyword) {
  const data = getData();
  const kw = keyword.toLowerCase();

  const matchedKeys = Object.entries(data.resourcePools || {})
    .filter(([, res]) => res.name?.toLowerCase().includes(kw))
    .map(([key]) => key);

  if (!matchedKeys.length) return [];

  const locationCounts = {};
  const allContracts = [...(data.contracts || []), ...(data.legacyContracts || [])];
  for (const contract of allContracts) {
    for (const order of (Array.isArray(contract.haulingOrders) ? contract.haulingOrders : [])) {
      if (!matchedKeys.includes(order.resource)) continue;
      for (const locKey of (contract.locations || [])) {
        const loc = data.locationPools?.[locKey];
        if (!loc?.name) continue;
        if (!locationCounts[locKey]) locationCounts[locKey] = { ...loc, count: 0 };
        locationCounts[locKey].count++;
      }
    }
  }

  return Object.values(locationCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(loc => ({
      name: loc.name,
      system: loc.system || '?',
      type: loc.type || '?',
      contracts: loc.count,
    }));
}

function getCraftInfo(itemName) {
  const data = getData();
  const kw = itemName.toLowerCase();

  const wikelo = (data.contracts || []).filter(c => c.missionType === 'Wikelo - Other Items');
  const outNames = (c) => (c.itemRewards || []).flatMap(ir => ir.choices || []);
  const contract =
    wikelo.find(c => outNames(c).some(o => o.name?.toLowerCase() === kw)) ||
    wikelo.find(c => outNames(c).some(o => o.name?.toLowerCase().startsWith(kw))) ||
    wikelo.find(c => {
      if (c.title?.toLowerCase().includes(kw)) return true;
      if (outNames(c).some(o => o.name?.toLowerCase().includes(kw))) return true;
      const orders = Array.isArray(c.haulingOrders) ? c.haulingOrders : [];
      return orders.some(h => data.resourcePools?.[h.resource]?.name?.toLowerCase().includes(kw));
    });

  if (!contract) return null;

  const materials = (Array.isArray(contract.haulingOrders) ? contract.haulingOrders : []).map(h => ({
    name: data.resourcePools?.[h.resource]?.name || h.resource,
    amount: h.minAmount ?? 1,
  }));

  const outputs = (contract.itemRewards || [])
    .flatMap(ir => ir.choices || [])
    .map(ch => ({
      name: ch.name,
      slot: ch.armorSlot || ch.itemType || '?',
      armorClass: ch.armorClass || '?',
    }));

  const resolvedItemName = (
    outputs.find(o => o.name?.toLowerCase() === kw) ||
    outputs.find(o => o.name?.toLowerCase().startsWith(kw)) ||
    outputs.find(o => o.name?.toLowerCase().includes(kw))
  )?.name || outputs[0]?.name || contract.title;

  const destinations = (contract.destinations || [])
    .map(key => data.locationPools?.[key]?.name)
    .filter(Boolean);

  return {
    title: contract.title,
    itemName: resolvedItemName,
    description: contract.description,
    materials,
    outputs,
    destinations,
    system: (contract.systems || []).join(', '),
  };
}

function searchQuest(keyword, system = null) {
  const data = getData();
  const kw = keyword.toLowerCase();
  const allContracts = [...(data.contracts || []), ...(data.legacyContracts || [])];

  return allContracts
    .filter(m => {
      const faction = resolveFaction(data, m.factionGuid).toLowerCase();
      const matchKeyword =
        m.title?.toLowerCase().includes(kw) ||
        faction.includes(kw) ||
        m.description?.toLowerCase().includes(kw);
      const matchSystem = system
        ? (m.systems || []).some(s => s.toLowerCase() === system.toLowerCase())
        : true;
      return matchKeyword && matchSystem;
    })
    .map(m => ({
      title: m.title,
      faction: resolveFaction(data, m.factionGuid),
      system: (m.systems || []).join(', '),
      rewardUec: m.rewardUEC,
      illegal: !!m.illegal,
      missionType: m.missionType || '?',
      blueprints: resolveBlueprintNames(data, m.blueprintRewards),
    }))
    .slice(0, 10);
}

function getCraftingItem(keyword) {
  const data = getCraftItemsData();
  const item = priorityFind(data.items, i => i.name, keyword);
  if (!item) return null;

  const pool = item.damageResistanceIndex != null
    ? data.damageResistancePools[item.damageResistanceIndex]
    : null;

  return {
    name:                 item.name,
    manufacturer:         item.manufacturer || null,
    itemType:             item.itemType || null,
    mass:                 item.mass ?? null,
    size:                 item.size ?? null,
    grade:                item.grade ?? null,
    temperatureResistance: item.temperatureResistance || null,
    damageResistance:     pool || null,
    combatRange:          item.combatRange || null,
    fireModes:            item.fireModesIndex != null ? data.fireModesPools[item.fireModesIndex] : null,
    ammo:                 item.ammoIndex     != null ? data.ammoPools[item.ammoIndex]           : null,
    magazine:             item.magazineIndex != null ? data.magazinePools[item.magazineIndex]   : null,
  };
}

function getCraftingBlueprint(keyword) {
  const data = getBlueprintsData();
  return priorityFind(data.blueprints, b => b.productName, keyword) ?? null;
}

module.exports = { getData, searchBlueprint, findResource, getCraftInfo, getCraftingItem, getCraftingBlueprint, searchQuest };
