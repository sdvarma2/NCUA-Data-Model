export function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCurrency(value) {
  const rounded = Math.round(value);
  if (rounded < 0) return `-$${Math.abs(rounded).toLocaleString()}`;
  return `$${rounded.toLocaleString()}`;
}

export function formatPct(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

export function formatAssets(billions) {
  // Floor (not round) to avoid e.g. $15.953B showing as $16.0B
  const truncated = Math.floor(billions * 10) / 10;
  return `$${truncated.toFixed(1)}B`;
}

export function formatCount(value) {
  return value.toLocaleString();
}
