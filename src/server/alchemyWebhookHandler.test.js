import crypto from 'crypto';
import handler from '../../api/alchemy-webhook';
import { enrichMintDrafts } from '../../api/lib/enrichMints';
import { upsertMintRecords } from '../../api/lib/mintStore';

jest.mock('../../api/lib/enrichMints', () => ({
  enrichMintDrafts: jest.fn(),
}));

jest.mock('../../api/lib/mintStore', () => ({
  upsertMintRecords: jest.fn(),
}));

const KEY = 'test-signing-key';
const sign = (body) => crypto.createHmac('sha256', KEY).update(body, 'utf8').digest('hex');
const recipient = `0x${'ab'.repeat(20)}`;
const txHash = `0x${'cd'.repeat(32)}`;

const createRes = () => ({
  statusCode: 200,
  headers: {},
  body: undefined,
  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const createReq = (raw, signature, method = 'POST') => ({
  method,
  headers: signature == null ? {} : { 'x-alchemy-signature': signature },
  async *[Symbol.asyncIterator]() {
    yield Buffer.from(raw, 'utf8');
  },
});

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
    const res = createRes();
    await handler(createReq(raw, sign('other-body')), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'invalid_signature' });
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
    const res = createRes();
    await handler(createReq(raw, sign(raw)), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, stored: 1 });
    expect(enrichMintDrafts).toHaveBeenCalledWith([
      expect.objectContaining({ token_id: 7915, recipient, block: 16, tx_hash: txHash }),
    ]);
    expect(upsertMintRecords).toHaveBeenCalledTimes(1);
  });
});
