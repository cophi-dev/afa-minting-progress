export const isZeroAddress = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.startsWith('0x')) return false;
  const body = trimmed.slice(2);
  return body.length > 0 && /^[0-9a-f]+$/.test(body) && /^0+$/.test(body);
};

export const normalizeAddress = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(trimmed) ? trimmed : null;
};

export const normalizeTxHash = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/.test(trimmed) ? trimmed : null;
};

export const parseQuantity = (value) => {
  if (typeof value === 'bigint') {
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(value);
  }

  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    try {
      const parsed = BigInt(trimmed);
      if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) return null;
      return Number(parsed);
    } catch {
      return null;
    }
  }

  if (/^\d+$/.test(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
};

export const parseTimestamp = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const seconds = value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
    return seconds >= 0 ? seconds : null;
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed) || /^0x[0-9a-f]+$/i.test(trimmed)) {
    return parseTimestamp(parseQuantity(trimmed));
  }

  const milliseconds = Date.parse(trimmed);
  if (!Number.isFinite(milliseconds)) return null;
  return Math.floor(milliseconds / 1000);
};
