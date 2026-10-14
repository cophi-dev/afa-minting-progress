import { listMintRecords } from './mintStore.js';
import { MAX_TOKEN_ID } from './constants.js';

export const parseApeId = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!/^\d{1,4}$/.test(String(raw ?? ''))) return null;
  const id = Number(raw);
  return id >= 0 && id <= MAX_TOKEN_ID ? id : null;
};

export const isMinted = async (id) => {
  const records = await listMintRecords();
  return records.some((r) => r.token_id === id);
};

export const apeCopy = (id, minted) => (minted
  ? { title: `Ape #${id} is facing you.`, subtitle: 'This Ape Facing Ape is minted. Open it in the editor and dress it up.' }
  : { title: `Ape #${id} is still looking the other way.`, subtitle: 'Mint to reveal this Ape Facing Ape.' });
