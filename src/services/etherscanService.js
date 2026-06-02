const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY;
const CONTRACT_ADDRESS = '0xfAa0e99EF34Eae8b288CFEeAEa4BF4f5B5f2eaE7';
const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';

export const hasEtherscanApiKey = () => Boolean(ETHERSCAN_API_KEY?.trim());

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** True when the tx is a mint (from zero address), not a secondary transfer. */
export const isMintTransaction = (tx) => {
  const from = tx?.from?.toLowerCase?.();
  return from === ZERO_ADDRESS || from === '0x0';
};

export const getAllTransactions = async () => {
  if (!hasEtherscanApiKey()) {
    throw new Error('Missing REACT_APP_ETHERSCAN_API_KEY in .env — restart the dev server after adding it.');
  }

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
    apikey: ETHERSCAN_API_KEY,
  });

  const response = await fetch(`${ETHERSCAN_BASE}?${params}`);
  const data = await response.json();

  if (data.status !== '1') {
    throw new Error(data.message || data.result || 'Etherscan API error');
  }

  if (!Array.isArray(data.result)) {
    throw new Error('Unexpected Etherscan response format');
  }

  return data.result;
};

export const processNFTStatuses = (transactions) => {
  const nftStatuses = new Map();

  transactions.forEach((tx) => {
    if (!tx?.tokenID) return;

    const tokenId = parseInt(tx.tokenID, 10);
    const timestamp = parseInt(tx.timeStamp, 10);
    const existing = nftStatuses.get(tokenId);

    if (!existing || timestamp >= existing.timestamp) {
      nftStatuses.set(tokenId, {
        owner: tx.to,
        timestamp,
        isTransfer: !isMintTransaction(tx),
      });
    }
  });

  return nftStatuses;
};
