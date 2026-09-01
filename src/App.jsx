import React, { useCallback, useRef, useState } from 'react';

import Toolbar from './components/panels/Toolbar';
import DetailPanel from './components/panels/DetailPanel';
import QuotationModal from './components/modals/QuotationModal';
import PlanMap from './components/map/PlanMap';

import { useMapLayout } from './hooks/useMapLayout';
import { usePlotFilters } from './hooks/usePlotFilters';
import { saveQuotation } from './firebase/quotationsRepo';
import { MAP_ID } from './config/site';
import { ACCENT, BODY, CANVAS, HAIR, MONO, MUTED, SANS } from './theme/tokens';

function Curtain({ tone = MUTED, children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
      background: CANVAS, color: tone, fontFamily: MONO, fontSize: 13,
      zIndex: 50, padding: 28, textAlign: 'center', lineHeight: 1.7,
    }}>
      <div style={{ maxWidth: 460 }}>{children}</div>
    </div>
  );
}

export default function App() {
  const mapRef = useRef(null);

  const [selected, setSelected] = useState(null);
  const [quote, setQuote] = useState(null);
  const [showNumbers, setShowNumbers] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  const { layout, status, setStatus, source, error, loading, count } = useMapLayout();
  const filters = usePlotFilters(layout, status);

  const fitWholePlan = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google || !layout) return;
    const b = new window.google.maps.LatLngBounds();
    layout.features.forEach((f) => f.pts.forEach((p) => b.extend(layout.toLL(p[0], p[1]))));
    map.fitBounds(b, 48);
  }, [layout]);

  /** frame a plot into the part of the map the panel does not cover */
  const zoomTo = useCallback((plot) => {
    const map = mapRef.current;
    if (!map || !window.google || !layout) return;
    const b = new window.google.maps.LatLngBounds();
    plot.pts.forEach((p) => b.extend(layout.toLL(p[0], p[1])));
    /* Fill the view with the plot. The tilt compresses it vertically and
       the turn swings its corners out, so leave room for both, plus the
       dimension figures that sit outside the boundary. */
    const phone = window.innerWidth <= 640;
    map.fitBounds(b, phone
      ? { top: 90, bottom: Math.round(window.innerHeight * 0.46), left: 60, right: 60 }
      : { top: 130, bottom: 130, left: 110, right: 350 });
  }, [layout]);

  const onSelect = useCallback((name) => {
    setSelected((cur) => {
      const next = name === cur ? null : name;
      if (next && layout) zoomTo(layout.byName.get(next));
      return next;
    });
  }, [zoomTo, layout]);

  const selPlot = selected && layout ? layout.byName.get(selected) : null;
  const selLL = selPlot ? layout.toLL(selPlot.c[0], selPlot.c[1]) : null;

  const onSaveQuote = useCallback((record) => saveQuotation({
    ...record,
    mapId: MAP_ID,
    plotPath: selPlot ? selPlot.docPath : null,
  }), [selPlot]);

  return (
    <div style={{
      width: '100%', height: '100dvh', minHeight: '100vh', position: 'relative',
      display: 'flex', flexDirection: 'column', background: CANVAS, color: '#E7E1D5',
      fontFamily: BODY, overflow: 'hidden',
    }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: #5F6B78; }
        *:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
        .toolbar { display: flex; align-items: center; gap: 8px; padding: 9px 14px;
          border-bottom: 1px solid ${HAIR}; flex-wrap: wrap; }
        .toolbar .spacer { margin-left: auto; }
        .toolbar-count { font-family: ${MONO}; font-size: 12px; color: ${MUTED}; }
        .gm-style img { max-width: none; }
        @media (max-width: 640px) {
          .toolbar { gap: 6px; padding: 8px 10px; overflow-x: auto; flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch; }
          .toolbar > * { flex: 0 0 auto; }
          .toolbar .spacer { margin-left: 6px; }
          .toolbar .area-label { display: none; }
        }
      `}</style>

      <Toolbar
        filters={filters}
        layout={layout}
        showNumbers={showNumbers}
        setShowNumbers={setShowNumbers}
        showStatus={showStatus}
        setShowStatus={setShowStatus}
        onFitPlan={() => { setSelected(null); fitWholePlan(); }}
      />

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {layout && (
          <PlanMap
            layout={layout}
            mapRef={mapRef}
            selected={selected}
            onSelect={onSelect}
            matches={filters.matches}
            status={status}
            showNumbers={showNumbers}
            showStatus={showStatus}
            onReady={fitWholePlan}
            setShowNumbers={setShowNumbers}
setShowStatus={setShowStatus}
          />
        )}

        <DetailPanel
          plot={selPlot}
          status={status}
          // setStatus={setStatus}
          latLng={selLL}
          onClose={() => setSelected(null)}
          onQuote={() => setQuote(selPlot)}
        />

        {layout && error && (
          <div style={{
            position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 6,
            fontFamily: MONO, fontSize: 11, color: '#E0A33C', textAlign: 'center',
            pointerEvents: 'none',
          }}>
            {error}
          </div>
        )}

        {loading && <Curtain>Reading map…</Curtain>}

        {!loading && !layout && (
          <Curtain tone="#E0A33C">
            <div style={{
              fontFamily: SANS, fontSize: 20, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: ACCENT, marginBottom: 12,
            }}>
              Nothing to draw
            </div>
            {/* {error
              ? <>Firestore said: {error}</>
              : (
                <>
                  Read {source ? source.label : `maps/${MAP_ID}`} and found{' '}
                  {count} document{count === 1 ? '' : 's'} with usable corners.
                  <br /><br />
                  A plot needs a <code>corners</code> array of at least three
                  {' '}<code>{'{ lat, lng }'}</code> points. If your plots live
                  somewhere else, add that path to SUBCOLLECTIONS in
                  src/firebase/mapRepo.js.
                </>
              )} */}
          </Curtain>
        )}
      </div>

      {quote && (
        <QuotationModal
          plot={quote}
          onClose={() => setQuote(null)}
          onSave={onSaveQuote}
        />
      )}
    </div>
  );
}
