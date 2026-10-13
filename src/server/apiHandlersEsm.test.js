import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const HANDLERS = [
  'api/alchemy-webhook.js',
  'api/cron/backfill.js',
  'api/mint-status.js',
  'api/mints.js',
];

test('api handlers import under plain Node ESM', async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['scripts/import-api-handlers.mjs'],
    { cwd: root },
  );

  for (const handler of HANDLERS) {
    expect(stdout).toContain(`imported ${handler}`);
  }
});
