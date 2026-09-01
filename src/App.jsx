
// import React, {
//   useCallback, useEffect, useMemo, useRef, useState,
// } from 'react';

// import Toolbar from './components/panels/Toolbar';
// import DetailPanel from './components/panels/DetailPanel';
// import QuotationModal from './components/modals/QuotationModal';
// import PlanMap from './components/map/PlanMap';

// import { useMapLayout } from './hooks/useMapLayout';
// import { usePlotFilters } from './hooks/usePlotFilters';
// import { saveQuotation } from './firebase/quotationsRepo';
// import { MAP_ID } from './config/site';
// import { ACCENT, BODY, CANVAS, HAIR, MONO, MUTED, SANS } from './theme/tokens';

// /* How much screen the details panel takes when it is open. This is
//    DECLARED here and framed by PlanMap, rather than being framed here:
//    two components both calling fitBounds on the same map means the
//    second one wins, and the second one was this file. Match these to
//    DetailPanel's real width and height. */
// const PANEL_W = 340;
// const PANEL_H = 300;
// const NARROW_PX = 640;

// function Curtain({ tone = MUTED, children }) {
//   return (
//     <div style={{
//       position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
//       background: CANVAS, color: tone, fontFamily: MONO, fontSize: 13,
//       zIndex: 50, padding: 28, textAlign: 'center', lineHeight: 1.7,
//     }}>
//       <div style={{ maxWidth: 460 }}>{children}</div>
//     </div>
//   );
// }

// export default function App() {
//   const mapRef = useRef(null);

//   /* PlanMap hands its own fitPlan back through here. The toolbar's fit
//      button calls that rather than a second implementation: PlanMap fits
//      the PLOTS, this file used to fit layout.features, which includes
//      the sheet border and title block and frames the layout as a small
//      island with empty ground all round it. */
//   const fitRef = useRef(null);

//   const [selected, setSelected] = useState(null);
//   const [quote, setQuote] = useState(null);
//   const [showNumbers, setShowNumbers] = useState(true);
//   const [showStatus, setShowStatus] = useState(false);
//   const [narrow, setNarrow] = useState(
//     () => (typeof window !== 'undefined' ? window.innerWidth <= NARROW_PX : false),
//   );

//   const { layout, status, setStatus, source, error, loading, count } = useMapLayout();
//   const filters = usePlotFilters(layout, status);

//   useEffect(() => {
//     const onResize = () => setNarrow(window.innerWidth <= NARROW_PX);
//     window.addEventListener('resize', onResize);
//     window.addEventListener('orientationchange', onResize);
//     return () => {
//       window.removeEventListener('resize', onResize);
//       window.removeEventListener('orientationchange', onResize);
//     };
//   }, []);

//   /* Selecting is now only selecting. The framing that used to live here
//      — a second fitBounds with 350px of padding on the right — ran after
//      PlanMap's close-up and undid it, which is why a picked plot sat
//      small in the middle of the frame whatever CLOSE_BOOST was set to. */
//   const onSelect = useCallback((name) => {
//     setSelected((cur) => (name === cur ? null : name));
//   }, []);

//   /* Null while the panel is shut, so a pick with no panel open gets the
//      whole screen instead of reserving space for something that isn't
//      there. */
//   const reserve = useMemo(() => {
//     if (!selected) return null;
//     return narrow ? { bottom: PANEL_H } : { right: PANEL_W };
//   }, [selected, narrow]);

//   const selPlot = selected && layout ? layout.byName.get(selected) : null;
//   const selLL = selPlot ? layout.toLL(selPlot.c[0], selPlot.c[1]) : null;

//   const onSaveQuote = useCallback((record) => saveQuotation({
//     ...record,
//     mapId: MAP_ID,
//     plotPath: selPlot ? selPlot.docPath : null,
//   }), [selPlot]);

//   return (
//     <div style={{
//       width: '100%', height: '100dvh', minHeight: '100vh', position: 'relative',
//       display: 'flex', flexDirection: 'column', background: CANVAS, color: '#E7E1D5',
//       fontFamily: BODY, overflow: 'hidden',
//     }}>
//       <style>{`
//         * { -webkit-tap-highlight-color: transparent; }
//         input::placeholder { color: #5F6B78; }
//         *:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
//         .toolbar { display: flex; align-items: center; gap: 8px; padding: 9px 14px;
//           border-bottom: 1px solid ${HAIR}; flex-wrap: wrap; }
//         .toolbar .spacer { margin-left: auto; }
//         .toolbar-count { font-family: ${MONO}; font-size: 12px; color: ${MUTED}; }
//         .gm-style img { max-width: none; }
//         @media (max-width: 640px) {
//           .toolbar { gap: 6px; padding: 8px 10px; overflow-x: auto; flex-wrap: nowrap;
//             -webkit-overflow-scrolling: touch; }
//           .toolbar > * { flex: 0 0 auto; }
//           .toolbar .spacer { margin-left: 6px; }
//           .toolbar .area-label { display: none; }
//         }
//       `}</style>

//       <Toolbar
//         filters={filters}
//         layout={layout}
//         showNumbers={showNumbers}
//         setShowNumbers={setShowNumbers}
//         showStatus={showStatus}
//         setShowStatus={setShowStatus}
//         onFitPlan={() => {
//           setSelected(null);
//           /* Dropping the selection already sends PlanMap back to the
//              whole layout, but only if something was ever raised — so
//              this covers the case where nothing has been picked yet. */
//           if (fitRef.current) fitRef.current();
//         }}
//       />

//       <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
//         {layout && (
//           <PlanMap
//             layout={layout}
//             mapRef={mapRef}
//             fitRef={fitRef}
//             selected={selected}
//             onSelect={onSelect}
//             matches={filters.matches}
//             status={status}
//             reserve={reserve}
//             showNumbers={showNumbers}
//             setShowNumbers={setShowNumbers}
//             showStatus={showStatus}
//             setShowStatus={setShowStatus}
//             /* PlanMap frames itself on construction and again on first
//                idle. Anything done here would land on top of that and
//                win, so this stays empty. */
//             onReady={() => {}}
//           />
//         )}

//         <DetailPanel
//           plot={selPlot}
//           status={status}
//           // setStatus={setStatus}
//           latLng={selLL}
//           onClose={() => setSelected(null)}
//           onQuote={() => setQuote(selPlot)}
//         />

//         {layout && error && (
//           <div style={{
//             position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 6,
//             fontFamily: MONO, fontSize: 11, color: '#E0A33C', textAlign: 'center',
//             pointerEvents: 'none',
//           }}>
//             {error}
//           </div>
//         )}

//         {loading && <Curtain>Reading map…</Curtain>}

//         {!loading && !layout && (
//           <Curtain tone="#E0A33C">
//             <div style={{
//               fontFamily: SANS, fontSize: 20, letterSpacing: '0.08em',
//               textTransform: 'uppercase', color: ACCENT, marginBottom: 12,
//             }}>
//               Nothing to draw
//             </div>
//             {/* {error
//               ? <>Firestore said: {error}</>
//               : (
//                 <>
//                   Read {source ? source.label : `maps/${MAP_ID}`} and found{' '}
//                   {count} document{count === 1 ? '' : 's'} with usable corners.
//                   <br /><br />
//                   A plot needs a <code>corners</code> array of at least three
//                   {' '}<code>{'{ lat, lng }'}</code> points. If your plots live
//                   somewhere else, add that path to SUBCOLLECTIONS in
//                   src/firebase/mapRepo.js.
//                 </>
//               )} */}
//           </Curtain>
//         )}
//       </div>

//       {quote && (
//         <QuotationModal
//           plot={quote}
//           onClose={() => setQuote(null)}
//           onSave={onSaveQuote}
//         />
//       )}
//     </div>
//   );
// }




import React, {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';

import Toolbar from './components/panels/Toolbar';
import DetailPanel from './components/panels/DetailPanel';
import QuotationModal from './components/modals/QuotationModal';
import PlanMap from './components/map/PlanMap';

import { useMapLayout } from './hooks/useMapLayout';
import { usePlotFilters } from './hooks/usePlotFilters';
import { saveQuotation } from './firebase/quotationsRepo';
import { MAP_ID } from './config/site';
import { ACCENT, BODY, CANVAS, HAIR, MONO, MUTED, SANS } from './theme/tokens';

/* Matches DetailPanel's own SHEET_BP: below this it renders as a
   bottom sheet, above it as a right-hand rail. Space is reserved on
   whichever edge DetailPanel is ACTUALLY using at that width — a
   mismatched breakpoint here means the map leaves a gap on one edge
   while DetailPanel covers the other. */
const SHEET_BP = 1024;

function Curtain({ tone = MUTED, children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
      background: CANVAS, color: tone, fontFamily: MONO, fontSize: 13,
      zIndex: 50, padding: 28, textAlign: 'center', lineHeight: 1.7,
    }}>
      <div style={{ maxWidth: 460, width: '100%' }}>{children}</div>
    </div>
  );
}

export default function App() {
  const mapRef = useRef(null);
  const panelBoxRef = useRef(null);

  /* PlanMap hands its own fitPlan back through here. The toolbar's fit
     button calls that rather than a second implementation: PlanMap fits
     the PLOTS, this file used to fit layout.features, which includes
     the sheet border and title block and frames the layout as a small
     island with empty ground all round it. */
  const fitRef = useRef(null);

  const [selected, setSelected] = useState(null);
  const [quote, setQuote] = useState(null);
  const [showNumbers, setShowNumbers] = useState(true);
  const [showStatus, setShowStatus] = useState(false);
  const [narrow, setNarrow] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth <= SHEET_BP : false),
  );

  /* The panel's REAL footprint, measured — not guessed. DetailPanel's
     rail width and sheet height both vary with its own breakpoints,
     collapsed/expanded state, and content length (a long owner name or
     a wrapped status pill changes it), so a hardcoded PANEL_W/PANEL_H
     drifts from reality exactly the way it did before. */
  const [panelBox, setPanelBox] = useState({ w: 0, h: 0 });

  const { layout, status, setStatus, source, error, loading, count } = useMapLayout();
  const filters = usePlotFilters(layout, status);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= SHEET_BP);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (vv) vv.removeEventListener('resize', onResize);
    };
  }, []);

  /* Watch DetailPanel's own box. It reports its width/height however
     it is currently laid out — rail, sheet, collapsed peek, or the
     full record open — and this just relays whatever that number is,
     rather than assuming one. */
  useLayoutEffect(() => {
    const el = panelBoxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      setPanelBox({ w: Math.round(box.width), h: Math.round(box.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [selected]); // re-observe when DetailPanel mounts/unmounts its box

  /* Selecting is now only selecting. The framing that used to live here
     — a second fitBounds with 350px of padding on the right — ran after
     PlanMap's close-up and undid it, which is why a picked plot sat
     small in the middle of the frame whatever CLOSE_BOOST was set to. */
  const onSelect = useCallback((name) => {
    setSelected((cur) => (name === cur ? null : name));
  }, []);

  /* Null while the panel is shut, so a pick with no panel open gets the
     whole screen instead of reserving space for something that isn't
     there. Reserves whichever edge DetailPanel is actually occupying
     at this width, sized to what was actually measured — falls back to
     a sane default only for the first frame, before the ResizeObserver
     has reported anything. */
  const reserve = useMemo(() => {
    if (!selected) return null;
    if (narrow) {
      return { bottom: panelBox.h || 210 };
    }
    return { right: panelBox.w || 320 };
  }, [selected, narrow, panelBox]);

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

        @media (max-width: ${SHEET_BP}px) {
          .toolbar { gap: 7px; padding: 8px 12px; }
        }

        @media (max-width: 640px) {
          .toolbar { gap: 6px; padding: 8px 10px; overflow-x: auto; flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch; }
          .toolbar > * { flex: 0 0 auto; }
          .toolbar .spacer { margin-left: 6px; }
          .toolbar .area-label { display: none; }
        }

        @media (max-width: 380px) {
          .toolbar { gap: 4px; padding: 7px 8px; }
          .toolbar-count { font-size: 11px; }
        }
      `}</style>

      <Toolbar
        filters={filters}
        layout={layout}
        showNumbers={showNumbers}
        setShowNumbers={setShowNumbers}
        showStatus={showStatus}
        setShowStatus={setShowStatus}
        onFitPlan={() => {
          setSelected(null);
          /* Dropping the selection already sends PlanMap back to the
             whole layout, but only if something was ever raised — so
             this covers the case where nothing has been picked yet. */
          if (fitRef.current) fitRef.current();
        }}
      />

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {layout && (
          <PlanMap
            layout={layout}
            mapRef={mapRef}
            fitRef={fitRef}
            selected={selected}
            onSelect={onSelect}
            matches={filters.matches}
            status={status}
            reserve={reserve}
            showNumbers={showNumbers}
            setShowNumbers={setShowNumbers}
            showStatus={showStatus}
            setShowStatus={setShowStatus}
            /* PlanMap frames itself on construction and again on first
               idle. Anything done here would land on top of that and
               win, so this stays empty. */
            onReady={() => {}}
          />
        )}

        {/* Wraps DetailPanel purely so its real rendered box can be
            measured — DetailPanel is absolutely positioned itself, so
            this wrapper adds no layout of its own; it's just an anchor
            for the ResizeObserver. */}
        {selPlot && <div ref={panelBoxRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />}

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