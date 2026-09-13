import { copyFileSync, constants } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);

function create(label, source, destination) {
  try {
    copyFileSync(
      fileURLToPath(new URL(source, root)),
      fileURLToPath(new URL(destination, root)),
      constants.COPYFILE_EXCL,
    );
    console.log(`Created ${label}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Preserved existing ${label}`);
  }
}

create('.env', '.env.example', '.env');
create('mobile/.env', 'mobile/.env.example', 'mobile/.env');

console.log('Web: npm run dev');
console.log('Mobile: cd mobile, then npm ci and npm start');
console.log('For live web data, set API_FOOTBALL_KEY and FOOTBALL_DATA_MODE=live in .env or Vercel.');
console.log('After deployment, set EXPO_PUBLIC_API_URL in mobile/.env to the public Vercel origin.');
