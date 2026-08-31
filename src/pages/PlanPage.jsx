import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';

import Toolbar from '../components/panels/Toolbar';
import DetailPanel from '../components/panels/DetailPanel';
import QuotationModal from '../components/modals/QuotationModal';
import PlanMap, { DOWN_MS } from '../components/map/PlanMap';

import { useMapLayout } from '../hooks/useMapLayout';
import { usePlotFilters } from '../hooks/usePlotFilters';
import { saveQuotation } from '../firebase/quotationsRepo';
import { useAuth } from '../context/Authcontext';
import { ACCENT, BODY, CANVAS, HAIR, MONO, MUTED, SANS } from '../theme/tokens';

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

export default function PlanPage() {
  const { mapId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const mapRef = useRef(null);
  const flightRef = useRef(0);
  const prevSelRef = useRef(null);

  /* Plot numbers can carry slashes and spaces ("C-14/A"), so they are
     encoded going into the path and decoded coming out. */
  const base = `/maps/${encodeURIComponent(mapId)}`;
  const plotPath = useCallback(
    (name) => `${base}/plot/${encodeURIComponent(name)}`,
    [base],
  );

  /* The URL is the selection. useMatch rather than a <Route> per state,
     so this component — and the Google map inside it — never unmounts. */
  const plotMatch = useMatch('/maps/:mapId/plot/:plotName/*');
  const quoteMatch = useMatch('/maps/:mapId/plot/:plotName/quote');
  const selected = plotMatch ? decodeURIComponent(plotMatch.params.plotName) : null;

  const [showNumbers, setShowNumbers] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  const { layout, status, setStatus, source, error, loading, count } = useMapLayout(mapId);
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
    /* These numbers track the panel: on a phone it is a bottom sheet up
       to 56vh tall sitting 8px off the edge, and on a desktop it is 320px
       wide inset 14px from the right. Change either in DetailPanel and
       these have to move with it, or the plot lands underneath it. */
    const phone = window.innerWidth <= 640;
    map.fitBounds(b, phone
      ? { top: 90, bottom: Math.round(window.innerHeight * 0.62), left: 56, right: 56 }
      : { top: 130, bottom: 130, left: 110, right: 380 });
  }, [layout]);

  const selPlot = selected && layout ? layout.byName.get(selected) : null;
  const selLL = selPlot ? layout.toLL(selPlot.c[0], selPlot.c[1]) : null;

  /* A link to a plot that isn't in this layout falls back to the whole
     plan rather than a dead panel. Replace, not push, so Back doesn't
     bounce into the bad URL again. */
  useEffect(() => {
    if (selected && layout && !layout.byName.has(selected)) {
      navigate(base, { replace: true });
    }
  }, [selected, layout, navigate, base]);

  /* Framing follows the URL, so it happens the same way whether the plot
     was tapped, deep-linked, or reached with the Back button. Swapping
     between plots costs a sink animation first, so the camera waits for
     it; arriving from nothing has nothing to wait for. */
  useEffect(() => {
    const prev = prevSelRef.current;
    prevSelRef.current = selected;

    clearTimeout(flightRef.current);
    if (!selPlot) return undefined;

    if (prev) flightRef.current = setTimeout(() => zoomTo(selPlot), DOWN_MS);
    else zoomTo(selPlot);

    return () => clearTimeout(flightRef.current);
  }, [selected, selPlot, zoomTo]);

  const onSelect = useCallback((name) => {
    if (!name) { navigate(base); return; }
    // tapping the raised plot again puts it back down
    navigate(name === selected ? base : plotPath(name));
  }, [navigate, selected, base, plotPath]);

  const onSaveQuote = useCallback((record) => saveQuotation({
    ...record,
    mapId,
    plotPath: selPlot ? selPlot.docPath : null,
    savedBy: user.uid,
    savedByName: user.name || user.email,
  }), [selPlot, mapId, user]);

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
        onFitPlan={() => { navigate(base); fitWholePlan(); }}
        onBack={() => navigate('/')}
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
          />
        )}

        <DetailPanel
          plot={selPlot}
          status={status}
          setStatus={setStatus}
          latLng={selLL}
          onClose={() => navigate(base)}
          onQuote={() => navigate(`${plotPath(selected)}/quote`)}
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

        {loading && <Curtain>Reading map...</Curtain>}

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
                  Read {source ? source.label : `maps/${mapId}`} and found{' '}
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

      {quoteMatch && selPlot && (
        <QuotationModal
          plot={selPlot}
          onClose={() => navigate(plotPath(selected))}
          onSave={onSaveQuote}
        />
      )}
    </div>
  );
}