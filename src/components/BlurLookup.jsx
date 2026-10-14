import React, { useMemo, useState } from 'react';
import './BlurLookup.css';

const MINT_URL = 'https://afa-progress.com/go/see-your-afa?to=mint';
const EDITOR_URL = (id) => `https://afa-editor.app/?tokenId=${id}&utm_source=afa-progress&utm_medium=referral&utm_campaign=see-your-afa`;

/** Minted IDs first, then the rest, both matching the typed prefix. */
export const buildIdSuggestions = (value, mintedIds, limit = 8) => {
  if (!value) return [];
  const minted = [...mintedIds].filter((id) => String(id).startsWith(value)).sort((a, b) => a - b);
  const mintedSet = new Set(minted);
  const out = minted.slice(0, limit).map((id) => ({ id, minted: true }));
  const base = Number(value);
  const candidates = [base];
  for (let mult = 10; mult <= 1000 && out.length + candidates.length < 200; mult *= 10) {
    for (let k = 0; k < mult; k += 1) candidates.push(base * mult + k);
  }
  for (const id of candidates) {
    if (out.length >= limit) break;
    if (id > 9999 || mintedSet.has(id) || !String(id).startsWith(value)) continue;
    out.push({ id, minted: false });
  }
  return out;
};

const BlurLookup = ({ open, onClose, mintedIds }) => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => buildIdSuggestions(input, mintedIds), [input, mintedIds]);

  if (!open) return null;

  const submit = (raw) => {
    const id = Number(raw);
    if (!/^\d{1,4}$/.test(String(raw)) || id > 9999) return;
    setInput(String(id));
    setFocused(false);
    setResult({ id, minted: mintedIds.has(id) });
  };

  return (
    <div className="blur-backdrop" role="presentation" onClick={onClose}>
      <div className="blur-dialog" role="dialog" aria-modal="true" aria-labelledby="blur-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="blur-close" onClick={onClose} aria-label="Close">×</button>
        <h2 id="blur-title" className="blur-title">See your AFA</h2>
        <p className="blur-lede">Enter your BAYC ID. Unminted AFAs stay blurred until they are minted.</p>
        <form className="blur-form" onSubmit={(e) => { e.preventDefault(); submit(input); }}>
          <input
            className="blur-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="BAYC ID, 0–9999"
            value={input}
            onFocus={() => setFocused(true)}
            onChange={(e) => { setInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4)); setFocused(true); }}
            aria-label="BAYC ID"
          />
          <button type="submit" className="blur-go">Show</button>
          {focused && suggestions.length > 0 && (
            <ul className="blur-suggestions">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => submit(s.id)}>
                    #{s.id}
                    {s.minted && <span className="blur-tag">Minted</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        {result && (
          <div className="blur-result">
            {result.minted ? (
              <>
                <img className="blur-image" src={`/hires/${result.id}.webp`} onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = `/images/${result.id}.webp`; } }} alt={`AFA #${result.id}`} width="256" height="256" />
                <p className="blur-caption">AFA #{result.id} is minted.</p>
                <a className="blur-cta" href={EDITOR_URL(result.id)} target="_blank" rel="noopener noreferrer">Open in the editor</a>
              </>
            ) : (
              <>
                <img className="blur-image is-blurred" src={`/api/blur-preview?id=${result.id}`} alt={`Blurred preview of AFA #${result.id}`} width="256" height="256" />
                <p className="blur-caption">AFA #{result.id}: mint to reveal.</p>
                <a className="blur-cta" href={MINT_URL} target="_blank" rel="noopener noreferrer">Mint on apefacingapes.com</a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlurLookup;
