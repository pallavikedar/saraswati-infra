export const SQFT = 10.7639;
export const D2R = Math.PI / 180;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const sqft = (sqm) => sqm * SQFT;

export const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const num = (n, digits = 0) =>
  Number(n).toLocaleString('en-IN', { maximumFractionDigits: digits });
