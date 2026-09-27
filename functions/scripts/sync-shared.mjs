// Copies the pure-TypeScript domain package (../shared) into src/shared so the
// functions bundle is self-contained when deployed. src/shared is gitignored.
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, '..', 'shared');
const target = join(root, 'src', 'shared');

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
writeFileSync(
  join(target, 'README.md'),
  'GENERATED - do not edit. Source of truth lives in /shared. Run `npm run sync-shared`.\n',
);
console.log('[sync-shared] copied /shared -> functions/src/shared');
