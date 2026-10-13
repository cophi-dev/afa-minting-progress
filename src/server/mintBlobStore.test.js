import { BlobNotFoundError, get, put } from '@vercel/blob';
import { vi } from 'vitest';
import { getStoreKind, listMintRecords, upsertMintRecords } from '../../api/lib/mintStore';

vi.mock('@vercel/blob', () => ({
  get: vi.fn(),
  put: vi.fn(),
  BlobNotFoundError: class BlobNotFoundError extends Error {
    constructor(message) {
      super(message);
      this.name = 'BlobNotFoundError';
    }
  },
}));

const recipient = `0x${'ab'.repeat(20)}`;
const sender = `0x${'11'.repeat(20)}`;
const txHash = `0x${'cd'.repeat(32)}`;
const blobEnv = { BLOB_READ_WRITE_TOKEN: 'blob-test-token' };

const record = {
  token_id: 7,
  recipient,
  tx_sender: sender,
  block: 18455170,
  timestamp: 1698574400,
  tx_hash: txHash,
};

describe('Vercel Blob mint store', () => {
  let stored;

  beforeEach(() => {
    stored = null;
    get.mockReset();
    put.mockReset();

    get.mockImplementation(async () => {
      if (stored == null) throw new BlobNotFoundError('not found');
      return {
        statusCode: 200,
        stream: new Blob([stored]).stream(),
      };
    });

    put.mockImplementation(async (_pathname, body) => {
      stored = typeof body === 'string' ? body : await new Response(body).text();
      return { pathname: 'mints.json' };
    });
  });

  it('uses Blob when only BLOB_READ_WRITE_TOKEN is set', () => {
    expect(getStoreKind(blobEnv)).toBe('blob');
    expect(getStoreKind({})).toBeNull();
    expect(getStoreKind({
      BLOB_READ_WRITE_TOKEN: 'blob-test-token',
      KV_REST_API_URL: 'https://example.upstash.io',
      KV_REST_API_TOKEN: 'kv-token',
    })).toBe('kv');
  });

  it('writes and reads mints.json without calling KV', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await upsertMintRecords([record], blobEnv);
    await upsertMintRecords([record], blobEnv);

    const records = await listMintRecords(blobEnv);
    const saved = JSON.parse(stored);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(put).toHaveBeenCalledWith('mints.json', expect.any(String), expect.objectContaining({
      access: 'private',
      token: 'blob-test-token',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    }));
    expect(get).toHaveBeenCalledWith('mints.json', expect.objectContaining({
      access: 'private',
      token: 'blob-test-token',
      useCache: false,
    }));
    expect(records).toEqual([record]);
    expect(Object.keys(saved.mints)).toEqual([`${txHash}:7`]);
    expect(saved.lastBlock).toBe(18455170);

    fetchSpy.mockRestore();
  });
});
