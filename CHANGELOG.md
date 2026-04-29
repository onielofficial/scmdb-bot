# บันทึกการเปลี่ยนแปลง

## [ยังไม่ได้ปล่อย]

### คำสั่ง /craft
- ปรับปรุง UI ของ embed (Class / Manufacturer / Mass แสดงแบบ inline)
- ลบ qtyBar progress bar ออกจากส่วนวัตถุดิบ
- วัตถุดิบแสดงเป็นรายการแบบเรียบง่าย: 🔩 **ชื่อ** × `จำนวน SCU`
- Damage Resistance: ตาราง monospace แสดงค่าฐาน → ค่าหลัง craft + ผลต่าง %
- ป้ายบอกระดับ Quality: 🔴 ต่ำ / 🔵 กลาง / 🟢 สูง / 🟡 สูงสุด
- Temperature Resistance: แสดงค่าฐาน → ค่าหลัง craft พร้อมผลต่าง
- เพิ่มส่วน Weapon Stats ครบถ้วน:
  - Damage, DPS (ปรับตาม quality)
  - Fire Rate (ปรับตาม quality ถ้ามี modifier)
  - Magazine, Spread, Recoil P/Y, Smooth time, Range, Velocity
- แก้ไขการคำนวณ DR: factor ทำงานถูกต้องแล้ว (quality สูงขึ้น = multiplier ต่ำลง = ต้านทานสูงขึ้น)
- แก้ไข quality factor: คำนวณแบบ per-property per-slot จาก blueprint modifiers (ไม่ hardcode อีกต่อไป)

### คำสั่ง /items
- เพิ่มระบบ autocomplete สำหรับตัวเลือกการค้นหา

### services/scmdb.js
- เพิ่มฟิลด์ข้อมูลอาวุธ: size, grade, combatRange, fireModes, ammo, magazine
- แก้ไขลำดับการค้นหา item: ตรงทั้งหมด → ขึ้นต้นด้วย → มีคำนั้นอยู่
  (แก้ปัญหา "A03 Sniper Rifle" คืนค่า magazine แทนปืนจริง)

### index.js
- เพิ่ม handler สำหรับ autocomplete interaction
