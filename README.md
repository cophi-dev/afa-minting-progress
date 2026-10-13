# AFA Minting Progress

Live mosaic of all 10,000 BAYC tokens — see which apes still need an **ApeFacingApe (AFA)** mint, shuffle the grid, open controls, and jump to claim.

**Live:** [afa-progress.com](https://afa-progress.com) (same deployment as [afa-mint-progress.vercel.app](https://afa-mint-progress.vercel.app))

## Related

| Repo | Role |
|------|------|
| [afa](https://github.com/cophi-dev/afa) | Trait editor — compose and preview before minting |
| [nano-bayc](https://github.com/cophi-dev/nano-bayc) | Quick exports + mint status |

## Run locally

```bash
npm install
cp .env.example .env
# set ETHERSCAN_API_KEY in .env
npm start
```

## Chain data

The browser calls `/api/mint-status`. That Vercel function reads the Etherscan key from the environment and caches the JSON for about 30 seconds (`s-maxage=30`).

| Variable | Required | Purpose |
|----------|----------|---------|
| `ETHERSCAN_API_KEY` | yes | Etherscan API v2 key. **Server-only.** Set it in Vercel → Settings → Environment Variables for Production and Preview. |
| `ETH_RPC_URL` | no | Ethereum mainnet HTTPS RPC used for `totalSupply()`. Public RPCs are tried when this is unset. |

Do not prefix the key with `VITE_` or `REACT_APP_` — those are bundled into the client. Remove `REACT_APP_ETHERSCAN_API_KEY` from Vercel if it is still there; the old Create React App build inlined it.

The progress count is `totalSupply()` on `0xfAa0e99EF34Eae8b288CFEeAEa4BF4f5B5f2eaE7` (Ethereum mainnet). NFT transfers are paged at 1,000 rows, which is the Etherscan free-tier cap, until a short page comes back.

`npm run sync-minted-hires` uses the same server-side reader. A local `.env` may still define `REACT_APP_ETHERSCAN_API_KEY` for that script; the deployed site does not.

## Canonical URL

`https://afa-progress.com` and `https://afa-mint-progress.vercel.app` both serve this project (identical HTML and asset hashes when checked). `www.afa-progress.com` redirects to the apex. Canonical and Open Graph tags use `https://afa-progress.com`.

## Deploy

Vite build (`npm run build` → `build/`). Vercel also runs `api/mint-status.js`.

## Mint webhooks

The grid keeps using `/api/mint-status`. Alchemy NFT Activity deliveries and a daily backfill also record mints for `GET /api/mints`. This repo does not create the Alchemy webhook. Put secrets in the Vercel project environment, not in git.

The connected store is **Vercel Blob**. Set `BLOB_READ_WRITE_TOKEN` and leave the KV REST vars unset. Mints are written to a private blob named `mints.json`. If both `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set, that store is used instead.

### Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `ALCHEMY_WEBHOOK_SIGNING_KEY` | Server | HMAC key for `X-Alchemy-Signature`. One key per webhook. |
| `ALCHEMY_API_KEY` | Server | Ethereum mainnet RPC key. Used as `https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY`. |
| `ALCHEMY_RPC_URL` | Server | Optional full RPC URL. When set, it replaces `ALCHEMY_API_KEY`. |
| `BLOB_READ_WRITE_TOKEN` | Server | Vercel Blob read/write token. Stores `mints.json` when KV is unset. |
| `KV_REST_API_URL` | Server | Optional Upstash / Vercel KV REST URL. Used only together with the token. |
| `KV_REST_API_TOKEN` | Server | Optional Upstash / Vercel KV token. |
| `MINTS_SYNC_TOKEN` | Server | Bearer token for `GET /api/mints?since_block=`. |
| `CRON_SECRET` | Server | Bearer token Vercel sends to `/api/cron/backfill`. The cron returns 401 without it. |
| `MINT_DEPLOY_BLOCK` | Server | Optional backfill start when the store is empty. Default `18455169` (contract creation). |

Storage is idempotent on `tx_hash:token_id`. Each record stores `token_id` (decimal), `recipient`, `tx_sender`, `block`, `timestamp`, and `tx_hash`. `tx_sender` comes from `eth_getTransactionByHash`.

### Webhook

In the Alchemy dashboard, create an **NFT Activity** webhook (do not commit the signing key):

1. Network: **ETH_MAINNET**
2. Contract: `0xfAa0e99EF34Eae8b288CFEeAEa4BF4f5B5f2eaE7`
3. Webhook URL: `https://afa-progress.com/api/alchemy-webhook`
4. Copy that webhook's signing key into `ALCHEMY_WEBHOOK_SIGNING_KEY`

The handler checks HMAC-SHA256 of the raw body with `crypto.timingSafeEqual` and stores mints whose `fromAddress` is `0x0` (the zero address) on this contract.

### HTTP

Public, short cache:

```bash
curl https://afa-progress.com/api/mints
```

```json
{ "count": 1, "minted": [7915] }
```

Incremental sync (`block` greater than `since_block`):

```bash
curl -H "Authorization: Bearer $MINTS_SYNC_TOKEN" \
  "https://afa-progress.com/api/mints?since_block=18455169"
```

```json
{ "mints": [{ "token_id": 7915, "recipient": "0x…", "tx_sender": "0x…", "block": 18456000, "timestamp": 1698574355, "tx_hash": "0x…" }] }
```

`vercel.json` runs `GET /api/cron/backfill` daily at 00:00 UTC. The job calls `alchemy_getAssetTransfers` with `fromAddress` set to the zero address, `category: ["erc721"]`, and this contract, starting at the last stored block. An empty store starts at the deploy block.

Local API routes need `vercel dev` (or a deployed preview). `npm start` serves the React app only.

## Credits

- Idea by [@F1reDragon_](https://x.com/F1reDragon_)
- Built by [@cophi](https://x.com/cophi)
