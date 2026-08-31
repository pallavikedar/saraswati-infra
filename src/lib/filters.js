// /**
//  * Filtering, kept away from the panel so the map, the gallery and the
//  * search box can all ask the same question: does this plot match?
//  *
//  * applyFilters returns the same shape PlanMap already takes for
//  * `matches` — a Set of plot names, or null when nothing is filtered.
//  * Null and "everything matches" are deliberately different: null means
//  * don't dim anything, an empty Set means the filter found nothing.
//  *
//  * Plot records come out of Firestore and the key names have drifted
//  * between imports, so every field is read through one of the small
//  * accessors below. One place to fix when a field is renamed.
//  */

// export const SQM_PER_SQFT = 0.09290304;

// /* ---------------------------------------------------------------
//    field readers
// --------------------------------------------------------------- */

// const pick = (plot, keys) => {
//   const bag = plot.data || plot;
//   for (const k of keys) {
//     const v = bag[k];
//     if (v !== undefined && v !== null && v !== '') return v;
//   }
//   return null;
// };

// /* shoelace, in drawing metres, so a plot without a stored area still
//    filters correctly rather than silently dropping out */
// const polyArea = (pts) => {
//   if (!pts || pts.length < 3) return null;
//   let a = 0;
//   for (let i = 0; i < pts.length; i += 1) {
//     const [x1, y1] = pts[i];
//     const [x2, y2] = pts[(i + 1) % pts.length];
//     a += x1 * y2 - x2 * y1;
//   }
//   return Math.abs(a) / 2;
// };

// export const areaOf = (plot) => {
//   const v = pick(plot, ['area', 'areaSqm', 'area_sqm', 'plotArea', 'plot_area']);
//   const n = Number(v);
//   return Number.isFinite(n) && n > 0 ? n : polyArea(plot.pts);
// };

// export const roadWidthOf = (plot) => {
//   const n = Number(pick(plot, ['roadWidth', 'road_width', 'frontRoad', 'front_road']));
//   return Number.isFinite(n) && n > 0 ? n : null;
// };

// const FACINGS = {
//   n: 'North', north: 'North',
//   s: 'South', south: 'South',
//   e: 'East', east: 'East',
//   w: 'West', west: 'West',
//   ne: 'North-East', northeast: 'North-East', 'north east': 'North-East',
//   nw: 'North-West', northwest: 'North-West', 'north west': 'North-West',
//   se: 'South-East', southeast: 'South-East', 'south east': 'South-East',
//   sw: 'South-West', southwest: 'South-West', 'south west': 'South-West',
// };

// export const facingOf = (plot) => {
//   const raw = pick(plot, ['facing', 'direction', 'plotFacing', 'plot_facing']);
//   if (!raw) return null;
//   const key = String(raw).trim().toLowerCase().replace(/[_-]+/g, ' ');
//   return FACINGS[key] || FACINGS[key.replace(/\s+/g, '')] || null;
// };

// const STATUSES = {
//   available: 'Available', open: 'Available', unsold: 'Available',
//   partial: 'Partial Payment', 'partial payment': 'Partial Payment',
//   partialpayment: 'Partial Payment', booked: 'Partial Payment',
//   sold: 'Sold', closed: 'Sold',
//   agreement: 'Agreement', registered: 'Agreement',
// };

// export const statusOf = (plot) => {
//   const raw = pick(plot, ['status', 'plotStatus', 'plot_status', 'saleStatus']);
//   if (!raw) return null;
//   const key = String(raw).trim().toLowerCase().replace(/[_-]+/g, ' ');
//   return STATUSES[key] || STATUSES[key.replace(/\s+/g, '')] || null;
// };

// export const rlStatusOf = (plot) => {
//   const raw = pick(plot, ['rlStatus', 'rl_status', 'rl', 'layoutApproval']);
//   if (raw === true) return 'Approved';
//   if (raw === false) return 'Not Approved';
//   if (!raw) return null;
//   const key = String(raw).trim().toLowerCase().replace(/[_-]+/g, ' ');
//   if (key.startsWith('not') || key === 'pending' || key === 'unapproved') return 'Not Approved';
//   if (key.startsWith('approv') || key === 'yes' || key === 'sanctioned') return 'Approved';
//   return null;
// };

// /* ---------------------------------------------------------------
//    the filter itself
// --------------------------------------------------------------- */

// export const AREA_UNITS = ['sq.m', 'sq.ft'];
// export const FACING_OPTIONS = [
//   'North', 'South', 'East', 'West',
//   'North-East', 'North-West', 'South-East', 'South-West',
// ];
// export const STATUS_OPTIONS = ['Available', 'Partial Payment', 'Sold', 'Agreement'];
// export const RL_OPTIONS = ['Approved', 'Not Approved'];

// export const EMPTY_FILTERS = {
//   unit: 'sq.m',
//   min: '',
//   max: '',
//   road: 'All',
//   facing: 'All',
//   status: 'All',
//   rl: 'All',
// };

// export const isEmpty = (f) => (
//   f.min === '' && f.max === ''
//   && f.road === 'All' && f.facing === 'All'
//   && f.status === 'All' && f.rl === 'All'
// );

// /* Road widths are whatever the layout actually contains — a hardcoded
//    list goes stale the moment a site has an 11 m spine. */
// export const roadWidthOptions = (plots) => (
//   [...new Set(plots.map(roadWidthOf).filter((n) => n !== null))]
//     .sort((a, b) => a - b)
// );

// const toSqm = (value, unit) => {
//   const n = Number(value);
//   if (!Number.isFinite(n)) return null;
//   return unit === 'sq.ft' ? n * SQM_PER_SQFT : n;
// };

// export const matchesFilters = (plot, f) => {
//   if (f.min !== '' || f.max !== '') {
//     const a = areaOf(plot);
//     if (a === null) return false;
//     const lo = toSqm(f.min, f.unit);
//     const hi = toSqm(f.max, f.unit);
//     if (lo !== null && a < lo) return false;
//     if (hi !== null && a > hi) return false;
//   }
//   if (f.road !== 'All' && roadWidthOf(plot) !== Number(f.road)) return false;
//   if (f.facing !== 'All' && facingOf(plot) !== f.facing) return false;
//   if (f.status !== 'All' && statusOf(plot) !== f.status) return false;
//   if (f.rl !== 'All' && rlStatusOf(plot) !== f.rl) return false;
//   return true;
// };

// /**
//  * plots: the array behind layout.byName — roads and open space included,
//  * so they are skipped here rather than showing up as non-matches and
//  * getting dimmed along with the real misses.
//  */
// export const applyFilters = (plots, f, isPlot = (p) => !p.isRoad) => {
//   if (isEmpty(f)) return null;
//   const out = new Set();
//   for (const p of plots) {
//     if (!isPlot(p)) continue;
//     if (matchesFilters(p, f)) out.add(p.name);
//   }
//   return out;
// };




/**
 * Filtering, kept away from the panel so the map, the gallery and the
 * search box can all ask the same question: does this plot match?
 *
 * applyFilters returns the same shape PlanMap already takes for
 * `matches` — a Set of plot names, or null when nothing is filtered.
 * Null and "everything matches" are deliberately different: null means
 * don't dim anything, an empty Set means the filter found nothing.
 *
 * Plot records come out of Firestore and the key names have drifted
 * between imports, so every field is read through one of the small
 * accessors below. One place to fix when a field is renamed.
 */

export const SQM_PER_SQFT = 0.09290304;

/* ---------------------------------------------------------------
   field readers
--------------------------------------------------------------- */

const pick = (plot, keys) => {
  const bag = plot.data || plot;
  for (const k of keys) {
    const v = bag[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
};

/* shoelace, in drawing metres, so a plot without a stored area still
   filters correctly rather than silently dropping out */
const polyArea = (pts) => {
  if (!pts || pts.length < 3) return null;
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};

export const areaOf = (plot) => {
  const v = pick(plot, ['area', 'areaSqm', 'area_sqm', 'plotArea', 'plot_area']);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : polyArea(plot.pts);
};

export const roadWidthOf = (plot) => {
  const n = Number(pick(plot, ['roadWidth', 'road_width', 'frontRoad', 'front_road']));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const FACINGS = {
  n: 'North', north: 'North',
  s: 'South', south: 'South',
  e: 'East', east: 'East',
  w: 'West', west: 'West',
  ne: 'North-East', northeast: 'North-East', 'north east': 'North-East',
  nw: 'North-West', northwest: 'North-West', 'north west': 'North-West',
  se: 'South-East', southeast: 'South-East', 'south east': 'South-East',
  sw: 'South-West', southwest: 'South-West', 'south west': 'South-West',
};

export const facingOf = (plot) => {
  const raw = pick(plot, ['facing', 'direction', 'plotFacing', 'plot_facing']);
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/[_-]+/g, ' ');
  return FACINGS[key] || FACINGS[key.replace(/\s+/g, '')] || null;
};

const STATUSES = {
  available: 'Available', open: 'Available', unsold: 'Available',
  partial: 'Partial Payment', 'partial payment': 'Partial Payment',
  partialpayment: 'Partial Payment', booked: 'Partial Payment',
  sold: 'Sold', closed: 'Sold',
  agreement: 'Agreement', registered: 'Agreement',
};

export const statusOf = (plot) => {
  const raw = pick(plot, ['status', 'plotStatus', 'plot_status', 'saleStatus']);
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/[_-]+/g, ' ');
  return STATUSES[key] || STATUSES[key.replace(/\s+/g, '')] || null;
};

export const rlStatusOf = (plot) => {
  const raw = pick(plot, ['rlStatus', 'rl_status', 'rl', 'layoutApproval']);
  if (raw === true) return 'Approved';
  if (raw === false) return 'Not Approved';
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (key.startsWith('not') || key === 'pending' || key === 'unapproved') return 'Not Approved';
  if (key.startsWith('approv') || key === 'yes' || key === 'sanctioned') return 'Approved';
  return null;
};

/* ---------------------------------------------------------------
   the filter itself
--------------------------------------------------------------- */

export const AREA_UNITS = ['sq.m', 'sq.ft'];
export const FACING_OPTIONS = [
  'North', 'South', 'East', 'West',
  'North-East', 'North-West', 'South-East', 'South-West',
];
export const STATUS_OPTIONS = ['Available', 'Partial Payment', 'Sold', 'Agreement'];
export const RL_OPTIONS = ['Approved', 'Not Approved'];

export const EMPTY_FILTERS = {
  unit: 'sq.m',
  min: '',
  max: '',
  road: 'All',
  facing: 'All',
  status: 'All',
  rl: 'All',
};

export const isEmpty = (f) => (
  f.min === '' && f.max === ''
  && f.road === 'All' && f.facing === 'All'
  && f.status === 'All' && f.rl === 'All'
);

/* Road widths are whatever the layout actually contains — a hardcoded
   list goes stale the moment a site has an 11 m spine. */
export const roadWidthOptions = (plots) => (
  [...new Set(plots.map(roadWidthOf).filter((n) => n !== null))]
    .sort((a, b) => a - b)
);

const toSqm = (value, unit) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return unit === 'sq.ft' ? n * SQM_PER_SQFT : n;
};

export const matchesFilters = (plot, f) => {
  if (f.min !== '' || f.max !== '') {
    const a = areaOf(plot);
    if (a === null) return false;
    const lo = toSqm(f.min, f.unit);
    const hi = toSqm(f.max, f.unit);
    if (lo !== null && a < lo) return false;
    if (hi !== null && a > hi) return false;
  }
  if (f.road !== 'All' && roadWidthOf(plot) !== Number(f.road)) return false;
  if (f.facing !== 'All' && facingOf(plot) !== f.facing) return false;
  if (f.status !== 'All' && statusOf(plot) !== f.status) return false;
  if (f.rl !== 'All' && rlStatusOf(plot) !== f.rl) return false;
  return true;
};

/**
 * plots: the array behind layout.byName — roads and open space included,
 * so they are skipped here rather than showing up as non-matches and
 * getting dimmed along with the real misses.
 */
export const applyFilters = (plots, f, isPlot = (p) => !p.isRoad) => {
  if (isEmpty(f)) return null;
  const out = new Set();
  for (const p of plots) {
    if (!isPlot(p)) continue;
    if (matchesFilters(p, f)) out.add(p.name);
  }
  return out;
};