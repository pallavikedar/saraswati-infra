import { makeFrame } from '../lib/geo';
import {
  centroid, edgeLengths, inradiusAt, longestEdgeAngle, polygonArea,
} from '../lib/geometry';
import { statusKeyOf } from '../theme/status';

/* The Flutter model's `type` field, in every spelling that has turned up
   in the data, mapped to the six land uses the plan knows how to draw. */
const TYPE_ALIASES = {
  plot: 'plot',
  plots: 'plot',
  road: 'road',
  roads: 'road',
  internal_road: 'road',
  service_road: 'road',
  highway: 'road',
  open: 'open_space',
  open_space: 'open_space',
  openspace: 'open_space',
  garden: 'open_space',
  park: 'open_space',
  green: 'open_space',
  amenity: 'amenity',
  amenity_space: 'amenity',
  club: 'amenity',
  clubhouse: 'amenity',
  htl: 'htl',
  htl_corridor: 'htl',
  corridor: 'htl',
  utility: 'utility',
  wwtp: 'utility',
  stp: 'utility',
  water_tank: 'utility',
  substation: 'utility',
};

export const kindOf = (type) => {
  const k = String(type || 'plot').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return TYPE_ALIASES[k] || 'plot';
};

/* roads first, plots last, so a plot's border always wins the edge */
export const DRAW_ORDER = {
  road: 0, htl: 1, open_space: 2, amenity: 3, utility: 4, plot: 5,
};

/**
 * Firestore PlotData documents → the drawable plan.
 *
 * The documents already carry real lat/lng corners, so there is no CAD
 * to georeference: one metre frame anchored at the middle of the layout
 * turns every corner into plain metres (x east, y south), and from there
 * the plan is drawn exactly as the master-plan reference draws it —
 * every stroke, number and dimension sized on the ground rather than in
 * screen pixels.
 */
export function buildLayout(docs, mapMeta = {}) {
  const usable = docs.filter((p) => Array.isArray(p.corners) && p.corners.length >= 3);
  if (!usable.length) return null;

  let latSum = 0;
  let lngSum = 0;
  let n = 0;
  usable.forEach((p) => p.corners.forEach((c) => {
    if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      latSum += c.lat; lngSum += c.lng; n += 1;
    }
  }));
  if (!n) return null;

  const frame = makeFrame(latSum / n, lngSum / n);

  const features = usable.map((p, i) => {
    const pts = p.corners.map((c) => frame.toDraw(c.lat, c.lng));
    const c = centroid(pts);
    const lp = p.labelPosition ? frame.toDraw(p.labelPosition.lat, p.labelPosition.lng) : c;
    const sides = edgeLengths(pts);
    const name = String(p.plotNo || p.title || p.srNo || i + 1);

    return {
      i,
      docPath: p.docPath,
      docId: p.firestoreId,
      kind: kindOf(p.type),
      name,
      title: p.title || '',
      pts,
      sides,
      c,
      lp,
      ir: inradiusAt(pts, lp),
      angle: longestEdgeAngle(pts),
      // trust the stored area — it came off the CAD; fall back to the ring
      area: p.area > 0 ? p.area : polygonArea(pts),
      statusKey: statusKeyOf(p.status),
      doc: p,
    };
  });

  const plots = features.filter((f) => f.kind === 'plot');
  const xs = features.flatMap((f) => f.pts.map((q) => q[0]));
  const ys = features.flatMap((f) => f.pts.map((q) => q[1]));

  const bounds = {
    x0: Math.min(...xs), y0: Math.min(...ys),
    x1: Math.max(...xs), y1: Math.max(...ys),
  };

  return {
    frame,
    features,
    plots,
    sorted: [...features].sort((a, b) => DRAW_ORDER[a.kind] - DRAW_ORDER[b.kind]),
    byName: new Map(plots.map((f) => [f.name, f])),
    bounds,
    meta: {
      title: mapMeta.title || mapMeta.name || 'Plot layout',
      mouza: mapMeta.mouza || '',
      w: bounds.x1 - bounds.x0,
      h: bounds.y1 - bounds.y0,
    },
    areaMin: plots.length ? Math.min(...plots.map((p) => p.area)) : 0,
    areaMax: plots.length ? Math.max(...plots.map((p) => p.area)) : 0,
    /** drawing metres ⇄ the world */
    toLL: (x, y) => frame.toLL(x, y),
    toDraw: (lat, lng) => frame.toDraw(lat, lng),
  };
}