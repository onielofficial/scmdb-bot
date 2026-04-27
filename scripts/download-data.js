const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function download() {
  console.log('กำลังดึงข้อมูลจาก SCMDB...');
  const versionRes = await axios.get('https://scmdb.net/data/game-versions.json', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/146.0.0.0',
      'Referer': 'https://scmdb.net/',
    }
  });
  const version = versionRes.data.live;
  console.log(`Version: ${version}`);
  const dataRes = await axios.get(
    `https://scmdb.net/data/merged-${version}.json`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/146.0.0.0',
        'Referer': 'https://scmdb.net/',
        'Cookie': process.env.CF_CLEARANCE
          ? `cf_clearance=${process.env.CF_CLEARANCE}`
          : '',
      },
      responseType: 'arraybuffer',
    }
  );
  const dataPath = path.join(__dirname, '../data/merged.json');
  fs.writeFileSync(dataPath, dataRes.data);
  console.log('✅ บันทึกข้อมูลเสร็จแล้ว!');
}

download().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});