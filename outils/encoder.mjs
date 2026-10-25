#!/usr/bin/env node
// Génère js/contenu.js (base64, pour que rien ne se lise à l'œil nu) à partir de contenu.source.json.
// Avec --decode, fait l'inverse : recrée contenu.source.json depuis js/contenu.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(racine, 'contenu.source.json');
const cible = join(racine, 'js', 'contenu.js');

if (process.argv.includes('--decode')) {
  const b64 = readFileSync(cible, 'utf8').match(/"([A-Za-z0-9+/=]+)"/)[1];
  const contenu = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  writeFileSync(source, `${JSON.stringify(contenu, null, 2)}\n`);
  console.log('contenu.source.json recréé.');
} else {
  const json = JSON.stringify(JSON.parse(readFileSync(source, 'utf8')));
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  writeFileSync(cible, `// Généré par outils/encoder.mjs à partir de contenu.source.json.\nexport default "${b64}";\n`);
  console.log(`js/contenu.js généré (${b64.length} caractères).`);
}
