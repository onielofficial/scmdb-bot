# Changelog

## [Unreleased]

### /craft command
- Improved embed UI layout (Class / Manufacturer / Mass inline)
- Removed qtyBar progress bars from materials
- Materials now show as simple list: 🔩 **Name** × `qty SCU`
- Damage Resistance: monospace table with base → crafted + diff %
- Quality tier label: 🔴 Low / 🔵 Mid / 🟢 High / 🟡 Max
- Temperature Resistance: show base → crafted with diff
- Added full Weapon Stats section:
  - Damage, DPS (with quality scaling)
  - Fire Rate (with quality scaling if modifier exists)
  - Magazine, Spread, Recoil P/Y, Smooth time, Range, Velocity
- Fixed DR calculation: factor now applies correctly (higher quality = lower multiplier = more resistance)
- Fixed biochemical damage type missing from DR table
- Fixed quality factor: now per-property per-slot from blueprint modifiers (not hardcoded)

### /items command
- Added autocomplete support on search option

### services/scmdb.js
- Added weapon data fields: size, grade, combatRange, fireModes, ammo, magazine
- Fixed item search priority: exact match → startsWith → includes
  (fixes "A03 Sniper Rifle" returning magazine instead of rifle)

### index.js
- Added autocomplete interaction handler
