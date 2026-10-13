# AFA Minting Progress

Live mosaic of all 10,000 BAYC tokens — see which apes still need an **ApeFacingApe (AFA)** mint, shuffle the grid, open controls, and jump to claim.

**Live:** [afa-mint-progress.vercel.app](https://afa-mint-progress.vercel.app)

## Related

| Repo | Role |
|------|------|
| [afa](https://github.com/cophi-dev/afa) | Trait editor — compose and preview before minting |
| [nano-bayc](https://github.com/cophi-dev/nano-bayc) | Quick exports + mint status |

## Run locally

```bash
npm install
npm start
```

## Deploy

Create React App static build — deploy `build/` to Vercel or any static host.

## Mint webhooks

The site reads minted token ids from `GET /api/mints`. Alchemy NFT Activity deliveries and a daily backfill write the same store. This repo does not create the Alchemy webhook. Put secrets in the Vercel project environment, not in git.

### Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `ALCHEMY_WEBHOOK_SIGNING_KEY` | Server | HMAC key for `X-Alchemy-Signature`. One key per webhook. |
| `ALCHEMY_API_KEY` | Server | Ethereum mainnet RPC key. Used as `https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY`. |
| `ALCHEMY_RPC_URL` | Server | Optional full RPC URL. When set, it replaces `ALCHEMY_API_KEY`. |
| `KV_REST_API_URL` | Server | Upstash / Vercel KV REST URL. Preferred store. |
| `KV_REST_API_TOKEN` | Server | Upstash / Vercel KV token. Set together with the URL. |
| `BLOB_READ_WRITE_TOKEN` | Server | Private Vercel Blob fallback. Used only when the KV pair is unset. Writes `mints.json`. |
| `MINTS_SYNC_TOKEN` | Server | Bearer token for `GET /api/mints?since_block=`. |
| `CRON_SECRET` | Server | Bearer token Vercel sends to `/api/cron/backfill`. Unset means the cron returns 401. |
| `MINT_DEPLOY_BLOCK` | Server | Optional backfill start when the store is empty. Default `18455169` (contract creation). |
| `REACT_APP_MINTS_API_URL` | Client | Optional override of `/api/mints` for local UI against another host. |
| `REACT_APP_ETHERSCAN_API_KEY` | `npm run sync-minted-hires` only | Not read by the website. |

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
