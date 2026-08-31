import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeToMapPlots, loadMapMeta } from '../firebase/mapRepo';
import { writePlotStatus } from '../firebase/plotsRepo';
import { buildLayout } from '../data/buildLayout';
import { MAP_ID } from '../config/site';

/**
 * The whole plan, live from Firestore.
 *
 * Statuses are a field on each plot document rather than a separate
 * store, so a change made in the Flutter app appears here without a
 * refresh, and vice versa. Local edits paint immediately and are dropped
 * as soon as the snapshot confirms them.
 */
export function useMapLayout(mapId = MAP_ID) {
  const [docs, setDocs] = useState(null);
  const [meta, setMeta] = useState({});
  const [source, setSource] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState({});   // optimistic status overrides
  const stopRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadMapMeta(mapId).then((m) => { if (alive) setMeta(m); });

    subscribeToMapPlots(
      mapId,
      (plots, src) => {
        if (!alive) return;
        setDocs(plots);
        setSource(src);
        setPending({});          // the snapshot is the truth now
        setError('');
      },
      (err) => {
        if (!alive) return;
        setError(err.message || 'Firestore refused the read.');
        setDocs([]);
      },
    ).then((stop) => {
      if (!alive) { stop(); return; }
      stopRef.current = stop;
    }).catch((err) => {
      if (alive) { setError(err.message); setDocs([]); }
    });

    return () => {
      alive = false;
      if (stopRef.current) stopRef.current();
    };
  }, [mapId]);

  const layout = useMemo(() => (docs ? buildLayout(docs, meta) : null), [docs, meta]);

  /** plot name → status key, with any un-confirmed local edit on top */
  const status = useMemo(() => {
    const m = {};
    if (layout) {
      layout.plots.forEach((f) => {
        const key = pending[f.name] ?? f.statusKey;
        if (key !== 'available') m[f.name] = key;
        else if (pending[f.name] === 'available') delete m[f.name];
      });
    }
    return m;
  }, [layout, pending]);

  const setStatus = useCallback(async (name, key) => {
    const feature = layout && layout.byName.get(name);
    if (!feature) return;
    setPending((p) => ({ ...p, [name]: key }));
    try {
      await writePlotStatus(feature.doc, key);
    } catch (err) {
      console.error(`Status for plot ${name} was not saved:`, err);
      setPending((p) => {
        const next = { ...p };
        delete next[name];        // put it back the way Firestore has it
        return next;
      });
      setError(`Plot ${name} could not be updated: ${err.message}`);
    }
  }, [layout]);

  return {
    layout,
    status,
    setStatus,
    source,
    error,
    loading: docs === null,
    count: docs ? docs.length : 0,
  };
}