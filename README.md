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

## Credits

- Idea by [@F1reDragon_](https://x.com/F1reDragon_)
- Built by [@cophi](https://x.com/cophi)
