import { normalizeMintStatusPayload } from './mintStatusCache';

describe('normalizeMintStatusPayload', () => {
  it('keeps totalSupply as the headline count when the transfer list is smaller', () => {
    const snapshot = normalizeMintStatusPayload({
      mintedCount: 363,
      entries: [[
        42,
        { owner: '0xabc', timestamp: 50, isTransfer: false },
      ]],
    });

    expect(snapshot.mintedCount).toBe(363);
    expect(snapshot.statuses.get(42)).toEqual({
      owner: '0xabc',
      timestamp: 50,
      isTransfer: false,
    });
    expect(snapshot.latestMints).toEqual([{
      tokenId: 42,
      timestamp: 50,
      owner: '0xabc',
      isTransfer: false,
    }]);
  });

  it('rejects a payload without token entries', () => {
    expect(() => normalizeMintStatusPayload({ mintedCount: 1 })).toThrow(/Unexpected/);
  });
});
