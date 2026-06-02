import { createSequentialTokenIds, shuffleTokenIds } from './shuffleTokenIds';

describe('shuffleTokenIds', () => {
  it('returns a permutation of the source array', () => {
    const source = createSequentialTokenIds(100);
    const shuffled = shuffleTokenIds(source);

    expect(shuffled).toHaveLength(source.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(source);
  });

  it('does not mutate the source array', () => {
    const source = [1, 2, 3, 4];
    const copy = [...source];
    shuffleTokenIds(source);
    expect(source).toEqual(copy);
  });
});
