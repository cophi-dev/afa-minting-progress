#!/usr/bin/env node
/**
 * Download hi-res minted AFA images from IPFS into public/hires/.
 * Run after new mints: npm run sync-minted-hires
 *
 * The website reads GET /api/mints. This offline sync still uses Etherscan.
 * Requires REACT_APP_ETHERSCAN_API_KEY in .env (or env).
 * Skips tokens that already have a fresh hires/webp unless --force.
 */
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const HIRES_DIR = path.join(ROOT, 'public', 'hires');
const MANIFEST_PATH = path.join(ROOT, 'src', 'data', 'hires_manifest.json');
const CID_PATH = path.join(ROOT, 'src', 'data', 'image_cids.json');
const CONTRACT_ADDRESS = '0xfAa0e99EF34Eae8b288CFEeAEa4BF4f5B5f2eaE7';
const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';

const IPFS_GATEWAYS = [
  process.env.REACT_APP_IPFS_GATEWAY,
  'https://ipfs.io/ipfs',
  'https://w3s.link/ipfs',
].filter(Boolean);

const DOWNLOAD_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const CONCURRENCY = 4;

const loadEnvFile = async () => {
  const envPath = path.join(ROOT, '.env');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (!match) return;
      const key = match[1].trim();
      if (process.env[key]) return;
      process.env[key] = match[2].trim().replace(/^["']|["']$/g, '');
    });
  } catch {
    // .env optional when vars are exported in CI
  }
};

const fetchMintedTokenIds = async (apiKey) => {
  const params = new URLSearchParams({
    module: 'account',
    action: 'tokennfttx',
    contractaddress: CONTRACT_ADDRESS,
    page: '1',
    offset: '10000',
    startblock: '0',
    endblock: '999999999',
    sort: 'asc',
    chainid: '1',
    apikey: apiKey,
  });

  const response = await fetch(`${ETHERSCAN_BASE}?${params}`);
  const data = await response.json();

  if (data.status !== '1' || !Array.isArray(data.result)) {
    throw new Error(data.message || data.result || 'Etherscan API error');
  }

  const minted = new Set();
  data.result.forEach((tx) => {
    if (!tx?.tokenID) return;
    minted.add(String(parseInt(tx.tokenID, 10)));
  });

  return [...minted].sort((a, b) => Number(a) - Number(b));
};

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const downloadFromIpfs = async (cid) => {
  let lastError = null;

  for (const gateway of IPFS_GATEWAYS) {
    const url = `${gateway}/${cid}`;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      if (attempt > 0) await sleep(1500 * attempt);

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
          redirect: 'follow',
        });

        if (!response.ok) {
          lastError = new Error(`${url} → HTTP ${response.status}`);
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          lastError = new Error(`${url} → HTML error page`);
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const meta = await sharp(buffer).metadata();
        if ((meta.width ?? 0) < 256 || (meta.height ?? 0) < 256) {
          lastError = new Error(`${url} → image too small (${meta.width}x${meta.height})`);
          continue;
        }

        return buffer;
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError ?? new Error(`Failed to download CID ${cid}`);
};

const writeHiresWebp = async (tokenId, buffer) => {
  const outputPath = path.join(HIRES_DIR, `${tokenId}.webp`);
  await sharp(buffer)
    .webp({ quality: 90, effort: 4 })
    .toFile(outputPath);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    limit: (() => {
      const index = args.indexOf('--limit');
      if (index === -1) return null;
      const value = Number(args[index + 1]);
      return Number.isFinite(value) && value > 0 ? value : null;
    })(),
  };
};

const runPool = async (items, worker) => {
  let index = 0;
  const results = [];

  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  });

  await Promise.all(runners);
  return results;
};

const main = async () => {
  const { force, limit } = parseArgs();
  await loadEnvFile();

  const apiKey = process.env.REACT_APP_ETHERSCAN_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing REACT_APP_ETHERSCAN_API_KEY in .env or environment');
  }

  await fs.mkdir(HIRES_DIR, { recursive: true });

  const [mintedIds, imageCids] = await Promise.all([
    fetchMintedTokenIds(apiKey),
    fs.readFile(CID_PATH, 'utf8').then(JSON.parse),
  ]);

  let targets = mintedIds.filter((tokenId) => imageCids[tokenId]);
  if (limit) targets = targets.slice(0, limit);

  const existingManifest = await fs.readFile(MANIFEST_PATH, 'utf8')
    .then(JSON.parse)
    .catch(() => []);

  const manifestSet = new Set(existingManifest.map(String));
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const workItems = [];
  for (const tokenId of targets) {
    const outputPath = path.join(HIRES_DIR, `${tokenId}.webp`);
    if (!force) {
      try {
        await fs.access(outputPath);
        manifestSet.add(String(tokenId));
        skipped += 1;
        continue;
      } catch {
        // missing — download below
      }
    }
    workItems.push(tokenId);
  }

  process.stdout.write(`Minted: ${mintedIds.length}, syncing: ${workItems.length}, skipped: ${skipped}\n`);

  await runPool(workItems, async (tokenId) => {
    const cid = imageCids[tokenId];
    try {
      const buffer = await downloadFromIpfs(cid);
      await writeHiresWebp(tokenId, buffer);
      manifestSet.add(String(tokenId));
      downloaded += 1;
      if (downloaded % 10 === 0) {
        process.stdout.write(`  downloaded ${downloaded}/${workItems.length}…\n`);
      }
    } catch (error) {
      failed += 1;
      process.stderr.write(`  #${tokenId} failed: ${error.message}\n`);
    }
  });

  const manifest = [...manifestSet]
    .map(Number)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest)}\n`);

  process.stdout.write(
    `Done — downloaded ${downloaded}, skipped ${skipped}, failed ${failed}, manifest ${manifest.length}\n`
  );

  if (failed > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
