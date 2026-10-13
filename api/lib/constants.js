/** ApeFacingApes ERC-721 on Ethereum mainnet. Comparisons use the lowercase form. */
export const CONTRACT_ADDRESS = '0xfaa0e99ef34eae8b288cfeeaea4bf4f5b5f2eae7';

/** 20-byte zero address. Alchemy addresses use this form of `0x0`. */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Creation block of 0xfAa0e99EF34Eae8b288CFEeAEa4BF4f5B5f2eaE7.
 * Tx 0x6c83bb1e18f1f58bbc7bce17aa6b05338e788516df346792d3ecbda3d509c1f3.
 */
export const DEPLOY_BLOCK = 18455169;

/** Token ids match the 10k BAYC set: 0 through 9999. */
export const MAX_TOKEN_ID = 9999;

export const KV_HASH_KEY = 'afa:mints';
export const KV_LAST_BLOCK_KEY = 'afa:mints:last_block';
export const BLOB_PATHNAME = 'mints.json';

export const PUBLIC_CACHE_CONTROL = 'public, max-age=15, s-maxage=30, stale-while-revalidate=60';
export const PRIVATE_CACHE_CONTROL = 'private, max-age=15';
