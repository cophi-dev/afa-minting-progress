import crypto from 'crypto';
import { Readable } from 'node:stream';
import { vi } from 'vitest';
import { POST, handleAlchemyWebhook } from '../../api/alchemy-webhook';
import { enrichMintDrafts } from '../../api/lib/enrichMints';
import { upsertMintRecords } from '../../api/lib/mintStore';

vi.mock('../../api/lib/enrichMints', () => ({
  enrichMintDrafts: vi.fn(),
}));

vi.mock('../../api/lib/mintStore', () => ({
  upsertMintRecords: vi.fn(),
}));

const KEY = 'test-signing-key';
const sign = (body) => crypto.createHmac('sha256', KEY).update(body, 'utf8').digest('hex');
const recipient = `0x${'ab'.repeat(20)}`;
const txHash = `0x${'cd'.repeat(32)}`;

const createRequest = (raw, signature) => new Request('https://afa-progress.com/api/alchemy-webhook', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    ...(signature == null ? {} : { 'x-alchemy-signature': signature }),
  },
  body: raw,
});

/**
 * Vercel's Node helper sets `req.body` with a getter that parses JSON and
 * consumes the stream. The raw bytes stay on the IncomingMessage until that
 * getter runs.
 */
const createVercelNodeReq = (raw, signature) => {
  const splitAt = Math.min(7, raw.length);
  const stream = Readable.from([
    Buffer.from(raw.slice(0, splitAt)),
    Buffer.from(raw.slice(splitAt)),
  ]);
  stream.method = 'POST';
  stream.headers = { 'content-type': 'application/json' };
  if (signature != null) stream.headers['x-alchemy-signature'] = signature;

  let bodyAccessed = false;
  Object.defineProperty(stream, 'body', {
    configurable: true,
    get() {
      bodyAccessed = true;
      throw new Error('Vercel parsed req.body and consumed the raw stream');
    },
  });
  stream.bodyWasAccessed = () => bodyAccessed;
  return stream;
};

describe('alchemy webhook handler', () => {
  const previousKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;

  beforeEach(() => {
    process.env.ALCHEMY_WEBHOOK_SIGNING_KEY = KEY;
    enrichMintDrafts.mockReset();
    upsertMintRecords.mockReset();
    enrichMintDrafts.mockImplementation(async (drafts) => drafts.map((draft) => ({
      ...draft,
      tx_sender: `0x${'11'.repeat(20)}`,
      timestamp: draft.timestamp ?? 100,
    })));
    upsertMintRecords.mockImplementation(async () => ({ lastBlock: 16, mints: {} }));
  });

  afterAll(() => {
    if (previousKey == null) delete process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
    else process.env.ALCHEMY_WEBHOOK_SIGNING_KEY = previousKey;
  });

  it('returns 401 when the signature does not match and does not store', async () => {
    const raw = '{"event":{"activity":[]}}';
    const response = await POST(createRequest(raw, sign('other-body')));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_signature' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(enrichMintDrafts).not.toHaveBeenCalled();
    expect(upsertMintRecords).not.toHaveBeenCalled();
  });

  it('reads a Vercel Node request stream for the HMAC check', async () => {
    const raw = JSON.stringify({
      event: { network: 'ETH_MAINNET', activity: [] },
    });

    const signed = createVercelNodeReq(raw, sign(raw));
    const ok = await handleAlchemyWebhook(signed);
    expect(signed.bodyWasAccessed()).toBe(false);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ ok: true, stored: 0 });

    const unsigned = createVercelNodeReq(raw);
    const denied = await handleAlchemyWebhook(unsigned);
    expect(unsigned.bodyWasAccessed()).toBe(false);
    expect(denied.status).toBe(401);
    expect(denied.body).toEqual({ error: 'invalid_signature' });

    const invalid = createVercelNodeReq(raw, sign('other-body'));
    const rejected = await handleAlchemyWebhook(invalid);
    expect(invalid.bodyWasAccessed()).toBe(false);
    expect(rejected.status).toBe(401);
    expect(rejected.body).toEqual({ error: 'invalid_signature' });
    expect(enrichMintDrafts).not.toHaveBeenCalled();
    expect(upsertMintRecords).not.toHaveBeenCalled();
  });

  it('stores a zero-address mint and ignores a secondary transfer', async () => {
    const raw = JSON.stringify({
      event: {
        network: 'ETH_MAINNET',
        activity: [
          {
            fromAddress: '0x0',
            toAddress: recipient,
            contractAddress: '0xfAa0e99EF34Eae8b288CFEeAEa4BF4f5B5f2eaE7',
            blockNum: '0x10',
            hash: txHash,
            erc721TokenId: '0x1eeb',
            category: 'erc721',
          },
          {
            fromAddress: '0x2222222222222222222222222222222222222222',
            toAddress: recipient,
            contractAddress: '0xfAa0e99EF34Eae8b288CFEeAEa4BF4f5B5f2eaE7',
            blockNum: '0x11',
            hash: `0x${'ef'.repeat(32)}`,
            erc721TokenId: '0x3',
            category: 'erc721',
          },
        ],
      },
    });
    const response = await POST(createRequest(raw, sign(raw)));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, stored: 1 });
    expect(enrichMintDrafts).toHaveBeenCalledWith([
      expect.objectContaining({ token_id: 7915, recipient, block: 16, tx_hash: txHash }),
    ]);
    expect(upsertMintRecords).toHaveBeenCalledTimes(1);
  });
});
