import { AFA_CLAIM_URL } from './editor';

/** Mint CTA target with campaign tracking. No price, never "free" in any copy around it. */
export const claimUrl = (campaign) => {
  const params = new URLSearchParams({
    utm_source: 'afa-progress',
    utm_medium: 'referral',
    utm_campaign: campaign,
  });
  return `${AFA_CLAIM_URL}?${params.toString()}`;
};

export const shortAddress = (address) => (
  typeof address === 'string' && address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address || null
);
