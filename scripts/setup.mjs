import { copyFileSync, constants, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const origin = 'https://barca-fan-companion.nityansh-bahadur1905.chatgpt.site';

function create(label, action) {
  try {
    action();
    console.log(`Created ${label}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Preserved existing ${label}`);
  }
}

create('.env', () => copyFileSync(
  fileURLToPath(new URL('.env.example', root)),
  fileURLToPath(new URL('.env', root)),
  constants.COPYFILE_EXCL,
));
create('mobile/.env', () => writeFileSync(
  new URL('mobile/.env', root),
  `# Public backend origin only. Never put provider secrets here.\nEXPO_PUBLIC_API_URL=${origin}\n`,
  { flag: 'wx' },
));

console.log('Web: npm run dev');
console.log('Mobile: cd mobile, then npm ci and npm start');
console.log('The hosted backend currently serves labelled demo data.');
console.log('Live fixtures and squad require a server-side API_FOOTBALL_KEY; see docs/LIVE_DATA_SETUP.md.');
