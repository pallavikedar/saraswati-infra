// import { PLOT_TONES } from './tokens';

// /* The five sale states, in the order a plot moves through them.

//    `doc` is what lands in Firestore, matching the Flutter app's
//    `PlotData.status` strings exactly, so the web viewer and the Flutter
//    viewer read and write the same documents. `legacy` catches values
//    saved before Token / Partial Payment / Agreement existed.

//    Colours match PlotData.getPlotColor() so a plot means the same thing
//    in both apps — except Available, which keeps the master plan's warm
//    tan instead of flat white. */
// export const STATUS = {
//   available: {
//     key: 'available', doc: 'Available', label: 'Available', legacy: [],
//     tones: PLOT_TONES, dot: '#D2A68D', ink: '#1A1208',
//   },
//   token: {
//     key: 'token', doc: 'Token', label: 'Token', legacy: ['booked'],
//     fill: '#2196F3', dot: '#2196F3', ink: '#FFFFFF',
//   },
//   partial: {
//     key: 'partial', doc: 'Partial Payment', label: 'Part paid', legacy: ['reserved'],
//     fill: '#FFC107', dot: '#FFC107', ink: '#1A1208',
//   },
//   agreement: {
//     key: 'agreement', doc: 'Agreement', label: 'Agreement', legacy: [],
//     fill: '#4CAF50', dot: '#4CAF50', ink: '#FFFFFF',
//   },
//   sold: {
//     key: 'sold', doc: 'Sold', label: 'Sold', legacy: [],
//     fill: '#F44336', dot: '#F44336', ink: '#FFFFFF',
//   },
// };

// export const STATUS_KEYS = Object.keys(STATUS);

// const LOOKUP = (() => {
//   const m = new Map();
//   STATUS_KEYS.forEach((k) => {
//     const s = STATUS[k];
//     m.set(k, k);
//     m.set(s.doc.toLowerCase(), k);
//     s.legacy.forEach((l) => m.set(l.toLowerCase(), k));
//   });
//   return m;
// })();

// /** Anything Firestore hands us → one of the five keys. */
// export const statusKeyOf = (value) =>
//   LOOKUP.get(String(value || '').trim().toLowerCase()) || 'available';

// /** A key → the string the Flutter app expects to read back. */
// export const statusDocValue = (key) => (STATUS[key] || STATUS.available).doc;


import { PLOT_TONES } from './tokens';

/* The five sale states, in the order a plot moves through them.

   `doc` is what lands in Firestore, matching the Flutter app's
   `PlotData.status` strings exactly, so the web viewer and the Flutter
   viewer read and write the same documents. `legacy` catches values
   saved before Token / Partial Payment / Agreement existed.

   Colours match PlotData.getPlotColor() so a plot means the same thing
   in both apps. Available carries BOTH: `tones` is the master plan's
   alternating tan, used whenever the status view is off, and `fill` is
   the pale paper the printed layout sheet uses for unsold land, which
   is what the status view wants — an unsold plot should read as empty,
   not as another shade of the same tan. */
export const STATUS = {
  available: {
    key: 'available', doc: 'Available', label: 'Available', legacy: [],
    tones: PLOT_TONES, fill: '#F2EDE1', dot: '#D2A68D', ink: '#1A1208',
  },
  token: {
    key: 'token', doc: 'Token', label: 'Token', legacy: ['booked'],
    fill: '#2196F3', dot: '#2196F3', ink: '#FFFFFF',
  },
  partial: {
    key: 'partial', doc: 'Partial Payment', label: 'Part paid', legacy: ['reserved'],
    fill: '#FFC107', dot: '#FFC107', ink: '#1A1208',
  },
  agreement: {
    key: 'agreement', doc: 'Agreement', label: 'Agreement', legacy: [],
    fill: '#4CAF50', dot: '#4CAF50', ink: '#FFFFFF',
  },
  sold: {
    key: 'sold', doc: 'Sold', label: 'Sold', legacy: [],
    fill: '#F44336', dot: '#F44336', ink: '#FFFFFF',
  },
};

export const STATUS_KEYS = Object.keys(STATUS);

const LOOKUP = (() => {
  const m = new Map();
  STATUS_KEYS.forEach((k) => {
    const s = STATUS[k];
    m.set(k, k);
    m.set(s.doc.toLowerCase(), k);
    s.legacy.forEach((l) => m.set(l.toLowerCase(), k));
  });
  return m;
})();

/** Anything Firestore hands us → one of the five keys. */
export const statusKeyOf = (value) =>
  LOOKUP.get(String(value || '').trim().toLowerCase()) || 'available';

/** A key → the string the Flutter app expects to read back. */
export const statusDocValue = (key) => (STATUS[key] || STATUS.available).doc;

/** How many plots sit in each state, for the legend's counts. */
export const statusTally = (plots, status) => {
  const out = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
  plots.forEach((p) => { out[statusKeyOf(status[p.name])] += 1; });
  return out;
};