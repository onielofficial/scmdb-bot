## Updates

### /craft
- ปรับ UI ใหม่ให้อ่านง่ายขึ้น (Class / Manufacturer / Mass อยู่แถวเดียวกัน)
- เอา progress bar ออกจาก Materials
- Materials แสดงเป็น list เรียบๆ เช่น 🔩 **Tungsten** × `0.06 SCU`
- Damage Resistance แสดงเป็นตาราง monospace พร้อม base → crafted และ % ต่าง
- เพิ่ม quality tier label: 🔴 Low / 🔵 Mid / 🟢 High / 🟡 Max
- Temperature Resistance แสดง base → crafted พร้อม diff
- เพิ่ม Weapon Stats ครบ: Damage, DPS, Fire Rate, Magazine, Spread, Recoil, Smooth, Range, Velocity
- แก้การคำนวณ DR ให้ถูกต้อง (quality สูง = multiplier ต่ำ = ป้องกันได้มากขึ้น)
- แก้ quality factor ให้คำนวณแบบ per-property per-slot จาก blueprint modifiers

### /items
- เพิ่ม autocomplete สำหรับช่อง search

### services/scmdb.js
- เพิ่ม weapon fields: size, grade, combatRange, fireModes, ammo, magazine
- แก้ลำดับการค้นหา item: exact match → startsWith → includes
  (แก้ปัญหา "A03 Sniper Rifle" ดึง Magazine แทน Rifle)

### index.js
- เพิ่ม autocomplete interaction handler
