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

function searchBlueprint(keyword) {
  const data = getData();
  const kw = keyword.toLowerCase();
  const results = [];
  for (const mission of (data.missions || [])) {
    const matched = (mission.blueprint_rewards || [])
      .filter(bp => bp.name?.toLowerCase().includes(kw));
    if (matched.length > 0) {
      results.push({
        title: mission.title,
        faction: mission.faction,
        rewardUec: mission.reward_uec,
        blueprints: matched.map(bp => bp.name),
        system: mission.system,
      });
    }
  }
  return results;
}

function findResource(keyword) {
  const data = getData();
  const kw = keyword.toLowerCase();
  return (data.locations || [])
    .filter(loc =>
      (loc.resources || []).some(r => r.name?.toLowerCase().includes(kw))
    )
    .map(loc => {
      const res = loc.resources.find(r =>
        r.name?.toLowerCase().includes(kw)
      );
      return {
        name: loc.name,
        system: loc.system,
        type: loc.type,
        probability: res?.probability ?? 0,
      };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 6);
}

function getCraftInfo(itemName, quality = 750) {
  const data = getData();
  const kw = itemName.toLowerCase();
  const item = (data.crafting_items || []).find(i =>
    i.name?.toLowerCase().includes(kw)
  );
  if (!item) return null;
  const materials = (item.components || []).map(comp => {
    const factor = comp.quality_factor ?? 0.1;
    const base = comp.base_bonus ?? 0;
    const bonus = ((base + factor * quality) * 100).toFixed(2);
    return {
      section: comp.section_name || comp.name,
      resource: comp.resource || comp.material,
      scu: comp.scu_min || comp.scu,
      qualityBonus: `+${bonus}%`,
      stat: comp.affects_stat,
    };
  });
  return {
    name: item.name,
    manufacturer: item.manufacturer,
    craftTime: item.craft_time_seconds,
    weight: item.weight_kg,
    armorClass: item.armor_class,
    materials,
    stats: item.stats || {},
  };
}

function searchQuest(keyword, system = null) {
  const data = getData();
  const kw = keyword.toLowerCase();
  return (data.missions || [])
    .filter(m => {
      const matchKeyword =
        m.title?.toLowerCase().includes(kw) ||
        m.faction?.toLowerCase().includes(kw) ||
        m.description?.toLowerCase().includes(kw);
      const matchSystem = system
        ? m.system?.toLowerCase() === system
        : true;
      return matchKeyword && matchSystem;
    })
    .map(m => ({
      title: m.title,
      faction: m.faction,
      system: m.system,
      rewardUec: m.reward_uec,
      repPerHour: m.rep_per_hour,
      legality: m.legality,
      blueprints: (m.blueprint_rewards || []).map(bp => bp.name),
    }))
    .slice(0, 10);
}

module.exports = { getData, searchBlueprint, findResource, getCraftInfo, searchQuest };