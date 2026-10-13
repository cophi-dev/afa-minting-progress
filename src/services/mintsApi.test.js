import fs from 'fs';
import path from 'path';
import { fetchMintSnapshot, MINTS_API_URL, processMintSnapshot } from './etherscanService';
import { prefetchMintStatus } from './mintStatusCache';

const walkSource = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const fullPath = path.join(dir, entry.name);
  if (entry.isDirectory()) return walkSource(fullPath);
  if (!/\.(js|jsx)$/.test(entry.name) || entry.name.includes('.test.')) return [];
  return [fullPath];
});

describe('public mints API client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('builds minted statuses from decimal token ids', () => {
    const snapshot = processMintSnapshot({
      count: 2,
      minted: [4, '9', 4, -1, 10000, 'nope', 1.5],
    });

    expect([...snapshot.statuses.keys()]).toEqual([4, 9]);
    expect(snapshot.statuses.get(4)).toEqual({
      owner: null,
      timestamp: null,
      isTransfer: false,
    });
    expect(snapshot.count).toBe(2);
  });

  it('loads /api/mints without an Etherscan key', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 1, minted: [7] }),
    });

    const snapshot = await fetchMintSnapshot();
    const cached = await prefetchMintStatus();

    expect(MINTS_API_URL).toBe('/api/mints');
    expect(global.fetch).toHaveBeenCalledWith('/api/mints', {
      headers: { Accept: 'application/json' },
    });
    expect(snapshot.statuses.has(7)).toBe(true);
    expect(cached.statuses.has(7)).toBe(true);
    expect(cached.latestMints).toEqual([]);

    const srcRoot = path.join(__dirname, '..');
    const hits = walkSource(srcRoot).filter((file) => (
      fs.readFileSync(file, 'utf8').includes('REACT_APP_ETHERSCAN_API_KEY')
    ));
    expect(hits).toEqual([]);
  });
});
