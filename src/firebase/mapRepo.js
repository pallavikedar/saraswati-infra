// import {
//   collection, getDocs, limit, onSnapshot, query, where,
// } from 'firebase/firestore';
// import { db } from './config';
// import { mapDoc, mapSubcollection } from './paths';
// import { MAP_ID } from '../config/site';
// import { PlotData } from '../models/PlotData';

// /**
//  * Where the plots for a map actually live.
//  *
//  * The Flutter app has stored them more than one way over the life of the
//  * project, so rather than hard-code a guess, probe the candidates once
//  * and remember which one answered. `source.label` is surfaced in the UI,
//  * so when a layout comes up empty you can see exactly which path was
//  * read instead of wondering.
//  */
// const SUBCOLLECTIONS = ['plots', 'features', 'polygons', 'layout'];

// export async function resolvePlotSource(mapId = MAP_ID) {
//   // 1. a subcollection under the map document
//   for (const name of SUBCOLLECTIONS) {
//     try {
//       // eslint-disable-next-line no-await-in-loop
//       const probe = await getDocs(query(mapSubcollection(name, mapId), limit(1)));
//       if (!probe.empty) {
//         return { kind: 'collection', name, label: `maps/${mapId}/${name}`, mapId };
//       }
//     } catch { /* missing or unreadable — try the next shape */ }
//   }

//   // 2. a root collection tagged with the map id
//   for (const [col, field] of [['plots', 'mapId'], ['plots', 'mapID'], ['plotData', 'mapId']]) {
//     try {
//       // eslint-disable-next-line no-await-in-loop
//       const probe = await getDocs(query(collection(db, col), where(field, '==', mapId), limit(1)));
//       if (!probe.empty) {
//         return { kind: 'query', col, field, label: `${col} where ${field} == ${mapId}`, mapId };
//       }
//     } catch { /* try the next shape */ }
//   }

//   // 3. an array field on the map document itself
//   try {
//     const snap = await (await import('firebase/firestore')).getDoc(mapDoc(mapId));
//     if (snap.exists()) {
//       const data = snap.data();
//       const key = ['plots', 'features', 'polygons'].find((k) => Array.isArray(data[k]) && data[k].length);
//       if (key) return { kind: 'embedded', key, label: `maps/${mapId}.${key}[]`, mapId };
//     }
//   } catch { /* fall through */ }

//   return { kind: 'none', label: `maps/${mapId}`, mapId };
// }

// const refFor = (source) => {
//   if (source.kind === 'collection') return mapSubcollection(source.name, source.mapId);
//   if (source.kind === 'query') {
//     return query(collection(db, source.col), where(source.field, '==', source.mapId));
//   }
//   return null;
// };

// /**
//  * Live plots for a map. Calls `onData(plots, source)` on every change.
//  * Each PlotData carries `docPath`, so a status written back lands on the
//  * document it came from — whatever shape the data turned out to be in.
//  */
// export async function subscribeToMapPlots(mapId, onData, onError) {
//   const source = await resolvePlotSource(mapId);

//   if (source.kind === 'none') {
//     onData([], source);
//     return () => {};
//   }

//   if (source.kind === 'embedded') {
//     return onSnapshot(
//       mapDoc(mapId),
//       (snap) => {
//         const rows = snap.exists() ? snap.data()[source.key] || [] : [];
//         const plots = rows.map((row, i) => {
//           const p = PlotData.fromDoc(row, `${i}`);
//           p.docPath = `maps/${mapId}`;
//           p.embeddedIndex = i;
//           p.embeddedKey = source.key;
//           return p;
//         });
//         onData(plots, source);
//       },
//       (err) => onError && onError(err),
//     );
//   }

//   return onSnapshot(
//     refFor(source),
//     (snap) => {
//       const plots = snap.docs.map((d) => {
//         const p = PlotData.fromDoc(d.data(), d.id);
//         p.docPath = d.ref.path;
//         return p;
//       });
//       onData(plots, source);
//     },
//     (err) => onError && onError(err),
//   );
// }

// /** The map document itself — title, mouza, whatever else it carries. */
// export async function loadMapMeta(mapId = MAP_ID) {
//   try {
//     const { getDoc } = await import('firebase/firestore');
//     const snap = await getDoc(mapDoc(mapId));
//     return snap.exists() ? snap.data() : {};
//   } catch {
//     return {};
//   }
// }
import {
  collection, getDoc, getDocs, limit, onSnapshot, query, where,
} from 'firebase/firestore';
import { db } from './config';
import { mapDoc, mapSubcollection } from './paths';
import { MAP_ID, PLOT_SOURCE } from '../config/site';
import { PlotData } from '../models/PlotData';

/**
 * Where the plots for a map actually live.
 *
 * The Flutter app has stored them more than one way over the life of the
 * project, so the shape still has to be discoverable. But discovery is a
 * fallback, not a startup step: the known-good source comes from config
 * or from what worked last time, the listener attaches immediately, and
 * the probes only run if that guess comes back empty.
 */
const SUBCOLLECTIONS = ['plots', 'features', 'polygons', 'layout'];
const ROOTS = [['plots', 'mapId'], ['plots', 'mapID'], ['plotData', 'mapId']];
const EMBEDDED_KEYS = ['plots', 'features', 'polygons'];

/* ---- remembered shape ---------------------------------------------- */

const cacheKey = (mapId) => `plotSource:${mapId}`;

const recall = (mapId) => {
  try {
    const raw = localStorage.getItem(cacheKey(mapId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const remember = (source) => {
  try { localStorage.setItem(cacheKey(source.mapId), JSON.stringify(source)); } catch { /* private mode */ }
};

/* ---- the map document, read at most once --------------------------- */

const metaCache = new Map();

function mapDocSnap(mapId) {
  if (!metaCache.has(mapId)) {
    metaCache.set(mapId, getDoc(mapDoc(mapId)).catch(() => null));
  }
  return metaCache.get(mapId);
}

/** The map document itself — title, mouza, whatever else it carries. */
export async function loadMapMeta(mapId = MAP_ID) {
  const snap = await mapDocSnap(mapId);
  return snap && snap.exists() ? snap.data() : {};
}

/* ---- discovery, in parallel ---------------------------------------- */

export async function resolvePlotSource(mapId = MAP_ID) {
  const subs = SUBCOLLECTIONS.map(async (name) => {
    const probe = await getDocs(query(mapSubcollection(name, mapId), limit(1)));
    return probe.empty ? null
      : { kind: 'collection', name, label: `maps/${mapId}/${name}`, mapId };
  });

  const roots = ROOTS.map(async ([col, field]) => {
    const probe = await getDocs(
      query(collection(db, col), where(field, '==', mapId), limit(1)),
    );
    return probe.empty ? null
      : { kind: 'query', col, field, label: `${col} where ${field} == ${mapId}`, mapId };
  });

  const embedded = mapDocSnap(mapId).then((snap) => {
    if (!snap || !snap.exists()) return null;
    const data = snap.data();
    const key = EMBEDDED_KEYS.find((k) => Array.isArray(data[k]) && data[k].length);
    return key ? { kind: 'embedded', key, label: `maps/${mapId}.${key}[]`, mapId } : null;
  });

  // all at once; `find` keeps the original priority order
  const found = await Promise.all(
    [...subs, ...roots, embedded].map((p) => p.catch(() => null)),
  );
  return found.find(Boolean) || { kind: 'none', label: `maps/${mapId}`, mapId };
}

/* ---- listening ------------------------------------------------------ */

const refFor = (source) => {
  if (source.kind === 'collection') return mapSubcollection(source.name, source.mapId);
  if (source.kind === 'query') {
    return query(collection(db, source.col), where(source.field, '==', source.mapId));
  }
  return null;
};

function listen(mapId, source, onData, onError) {
  if (source.kind === 'embedded') {
    return onSnapshot(
      mapDoc(mapId),
      (snap) => {
        const rows = snap.exists() ? snap.data()[source.key] || [] : [];
        onData(rows.map((row, i) => {
          const p = PlotData.fromDoc(row, `${i}`);
          p.docPath = `maps/${mapId}`;
          p.embeddedIndex = i;
          p.embeddedKey = source.key;
          return p;
        }));
      },
      onError,
    );
  }

  return onSnapshot(
    refFor(source),
    (snap) => onData(snap.docs.map((d) => {
      const p = PlotData.fromDoc(d.data(), d.id);
      p.docPath = d.ref.path;
      return p;
    })),
    onError,
  );
}

/**
 * Live plots for a map. Calls `onData(plots, source)` on every change.
 * Each PlotData carries `docPath`, so a status written back lands on the
 * document it came from — whatever shape the data turned out to be in.
 */
export async function subscribeToMapPlots(mapId = MAP_ID, onData, onError) {
  let alive = true;
  let stop = () => {};
  let settled = false;          // a source has produced plots; stop second-guessing

  const attach = (source) => {
    if (!alive) return;
    stop();
    if (source.kind === 'none') { onData([], source); return; }

    stop = listen(
      mapId,
      source,
      (plots) => {
        if (!alive) return;
        if (plots.length) {
          if (!settled) { settled = true; remember(source); }
          onData(plots, source);
        } else if (settled) {
          onData(plots, source);   // genuinely emptied out
        } else {
          fallback();              // guess was wrong — go find the real shape
        }
      },
      (err) => {
        if (!alive) return;
        if (settled) { if (onError) onError(err); } else fallback(err);
      },
    );
  };

  let probing = false;
  async function fallback(err) {
    if (probing || settled || !alive) return;
    probing = true;
    const real = await resolvePlotSource(mapId);
    if (!alive) return;
    if (real.kind === 'none') {
      if (err && onError) onError(err);
      else onData([], real);
      return;
    }
    settled = false;
    attach(real);
  }

  const guess = recall(mapId) || PLOT_SOURCE;
  if (guess && guess.kind) attach({ ...guess, mapId });
  else await fallback();

  return () => { alive = false; stop(); };
}