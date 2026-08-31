import { D2R } from './units';

/* Ground distances. A local east/north frame around one origin is
   accurate to well under a centimetre across a half-kilometre site —
   which is what lets the whole plan be drawn in plain metres and still
   land on the imagery exactly. */

export const mPerDegLat = (l) => {
  const p = l * D2R;
  return 111132.92 - 559.82 * Math.cos(2 * p) + 1.175 * Math.cos(4 * p) - 0.0023 * Math.cos(6 * p);
};

export const mPerDegLng = (l) => {
  const p = l * D2R;
  return 111412.84 * Math.cos(p) - 93.5 * Math.cos(3 * p) + 0.118 * Math.cos(5 * p);
};

/**
 * A metre grid pinned to one lat/lng.
 *
 * `toDraw` / `toLL` are the pair the plan actually uses: drawing
 * coordinates are metres east and metres SOUTH (y down, like the CAD
 * sheet), so every size in the SVG is a real ground distance.
 */
export function makeFrame(lat0, lng0) {
  const ky = mPerDegLat(lat0);
  const kx = mPerDegLng(lat0);
  return {
    lat0,
    lng0,
    toEN: (lat, lng) => [(lng - lng0) * kx, (lat - lat0) * ky],
    fromEN: (e, n) => ({ lat: lat0 + n / ky, lng: lng0 + e / kx }),
    toDraw: (lat, lng) => [(lng - lng0) * kx, -(lat - lat0) * ky],
    toLL: (x, y) => ({ lat: lat0 - y / ky, lng: lng0 + x / kx }),
  };
}
