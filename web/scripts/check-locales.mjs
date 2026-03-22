#!/usr/bin/env node
// Verifies all locale files have the same key structure as en.json.
// Exits with code 1 if any keys are missing or extra.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/i18n/locales');

function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const refKeys = new Set(collectKeys(JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf8'))));
const files = readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json').sort();

let hasErrors = false;

for (const file of files) {
  const locale = file.replace('.json', '');
  const localeKeys = new Set(collectKeys(JSON.parse(readFileSync(join(localesDir, file), 'utf8'))));

  const missing = [...refKeys].filter(k => !localeKeys.has(k));
  const extra = [...localeKeys].filter(k => !refKeys.has(k));

  if (missing.length > 0 || extra.length > 0) {
    console.log(`\n${locale}:`);
    if (missing.length > 0) console.log(`  missing (${missing.length}): ${missing.join(', ')}`);
    if (extra.length > 0) console.log(`  extra   (${extra.length}): ${extra.join(', ')}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n✗ Locale completeness check failed');
  process.exit(1);
} else {
  console.log(`✓ All ${files.length + 1} locales match en.json (${refKeys.size} keys)`);
}
