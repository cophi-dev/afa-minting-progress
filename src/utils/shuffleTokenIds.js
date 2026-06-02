/**
 * Fisher-Yates shuffle — returns a new array, does not mutate the input.
 * @param {number[]} source
 * @returns {number[]}
 */
export const shuffleTokenIds = (source) => {
  const result = source.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** @param {number} count */
export const createSequentialTokenIds = (count) =>
  Array.from({ length: count }, (_, index) => index);
