const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/merged.json');
let _cache = null;

function getData() {
  if (_cache) return _cache;
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error('ไม่พบไฟล์ข้อมูล กรุณารัน: npm run download ก่อน');
  }
  _cache = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  return _cache;
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
      results.push({
        title: contract.title,
        faction: resolveFaction(data, contract.factionGuid),
        rewardUec: contract.rewardUEC,
        blueprints: matched,
        system: (contract.systems || []).join(', '),
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

// Crafting data is not present in this dataset.
function getCraftInfo() {
  return null;
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
      legality: m.illegal ? 'Illegal' : 'Legal',
      blueprints: resolveBlueprintNames(data, m.blueprintRewards),
    }))
    .slice(0, 10);
}

module.exports = { getData, searchBlueprint, findResource, getCraftInfo, searchQuest };
