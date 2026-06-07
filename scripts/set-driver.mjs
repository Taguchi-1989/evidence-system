// STORAGE_DRIVER を .env に書き込む（`node scripts/set-driver.mjs local|aws`）。
import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const driver = process.argv[2] === 'local' ? 'local' : 'aws';
if (!existsSync('.env')) copyFileSync('.env.example', '.env');

let txt = readFileSync('.env', 'utf8');
if (/^STORAGE_DRIVER=.*$/m.test(txt)) {
  txt = txt.replace(/^STORAGE_DRIVER=.*$/m, `STORAGE_DRIVER=${driver}`);
} else {
  txt += `${txt.endsWith('\n') ? '' : '\n'}STORAGE_DRIVER=${driver}\n`;
}
writeFileSync('.env', txt);
console.log(`[set-driver] STORAGE_DRIVER=${driver} を .env に設定しました`);
