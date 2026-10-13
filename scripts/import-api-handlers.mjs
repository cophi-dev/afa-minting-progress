/**
 * Load every Vercel function under api/ with Node's native ESM loader.
 *
 * package.json is "type": "module". Vite and Vitest accept extensionless
 * relative imports; Node on Vercel does not. A missing ".js" suffix fails
 * the deployed function with ERR_MODULE_NOT_FOUND before the handler runs.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const apiDir = path.join(root, 'api');

const findHandlers = async (dir) => {
  const found = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'lib') continue;
      found.push(...await findHandlers(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      found.push(full);
    }
  }
  return found;
};

const handlers = (await findHandlers(apiDir)).sort();
if (handlers.length === 0) {
  throw new Error('No api handlers found');
}

for (const file of handlers) {
  const rel = path.relative(root, file);
  const mod = await import(pathToFileURL(file).href);
  if (typeof mod.default !== 'function') {
    throw new Error(`${rel} did not export a default function`);
  }
  console.log(`imported ${rel}`);
}
