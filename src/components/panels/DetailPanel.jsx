// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { SQFT } from '../../lib/units';
// import { straightSides } from '../../lib/geometry';
// import { STATUS, STATUS_KEYS } from '../../theme/status';
// import { MONO, SANS } from '../../theme/tokens';

// /* The panel is the one light surface in a dark app: it is the piece a
//    customer leans over the phone to read, so it reads like paper — and
//    closer to a property spec sheet than to a stack of cards. Figures sit
//    in one ruled block, the record under it in plain label/value rows,
//    and the only saturated things on the surface are the status rail down
//    the leading edge and the quotation button.

//    Structure is header / scroll body / footer. The name, status and the
//    quotation button are the three things a salesman needs at arm's
//    length, so they never scroll away — on a long plot record it is the
//    dimensions and notes that move.

//    On a laptop it is a rail down the right.

//    On a tablet or a phone it DOCKS to a bottom corner instead of
//    spanning the bottom edge. A full-width sheet ate the band of map you
//    put two fingers on to rotate and tilt, and there is no way to rotate
//    around a plot when the panel is sitting on the half of the screen you
//    need to twist. So the resting state is a chip — plot number, status,
//    area, and the two actions that matter as a segmented control — about
//    the height of a button, hard against one corner. Everything else is
//    map, and every gesture lands on map.

//    The chip can be flipped to the other corner when the plot ends up
//    underneath it, and it opens into a narrow card in place; the card is
//    still corner-anchored, so most of the screen stays live.

//    Either way the panel measures itself and reports the band it occupies
//    through onReserve, so the map can frame the plot in the space that is
//    actually left rather than behind the panel. Docked and closed it
//    reserves nothing at all — a chip in a corner is not worth pushing a
//    layout around. */
// const HAIR = 'rgba(20, 24, 32, 0.11)';
// const HAIR_SOFT = 'rgba(20, 24, 32, 0.06)';
// const TEXT_MAIN = '#161B24';
// const TEXT_MUTED = '#6B7280';
// const TEXT_FAINT = '#8A93A0';
// const ACCENT = '#2C5A4F';
// const ACCENT_DEEP = '#23483F';
// const ACCENT_BG = 'rgba(44, 90, 79, 0.07)';
// const FIELD = 'rgba(255, 255, 255, 0.5)';
// const PAPER = 'rgba(255, 255, 255, 0.94)';

// const DOCK_BP = 1024;   // at or below this the panel docks to a corner

// export default function DetailPanel({
//   plot, status, setStatus, onClose, onQuote, latLng, onReserve,
// }) {
//   const [collapsed, setCollapsed] = useState(true);
//   const [side, setSide] = useState('right');
//   const [dock, setDock] = useState(
//     () => typeof window !== 'undefined'
//       && window.matchMedia(`(max-width: ${DOCK_BP}px)`).matches,
//   );
//   const boxRef = useRef(null);
//   const reserveRef = useRef(onReserve);

//   useEffect(() => { reserveRef.current = onReserve; }, [onReserve]);

//   /* rail or dock — the same breakpoint the stylesheet uses, because
//      the measurement below has to know which edge is spoken for */
//   useEffect(() => {
//     if (typeof window === 'undefined') return undefined;
//     const mq = window.matchMedia(`(max-width: ${DOCK_BP}px)`);
//     const onChange = (e) => setDock(e.matches);
//     mq.addEventListener('change', onChange);
//     return () => mq.removeEventListener('change', onChange);
//   }, []);

//   /* ---------------------------------------------------------------
//      Tell the map what it can't have.

//      Measured rather than declared: the card's height depends on the
//      record and the safe-area inset, and a hard-coded number would be
//      wrong on most of those. A ResizeObserver covers them at once.

//      Nothing is reserved for a closed chip, on either layout. The rail
//      only counts when it is TALL; the docked card only counts when it is
//      open, and then as width if it is narrow enough for the plot to sit
//      beside it, as height if it isn't.
//   --------------------------------------------------------------- */
//   useEffect(() => {
//     const send = reserveRef.current;
//     if (!send) return undefined;
//     const el = boxRef.current;
//     if (!plot || !el) { send({ right: 0, bottom: 0 }); return undefined; }

//     const measure = () => {
//       const r = el.getBoundingClientRect();
//       const vw = window.innerWidth;
//       const vh = window.innerHeight;

//       if (dock) {
//         if (collapsed) { send({ right: 0, bottom: 0 }); return; }
//         if (side === 'right' && r.width <= vw * 0.62) {
//           send({ right: Math.round(Math.max(vw - r.left, 0)), bottom: 0 });
//         } else {
//           send({ right: 0, bottom: Math.round(Math.max(vh - r.top, 0)) });
//         }
//         return;
//       }

//       send({
//         right: r.height > vh * 0.55 ? Math.round(Math.max(vw - r.left, 0)) : 0,
//         bottom: 0,
//       });
//     };

//     measure();
//     const ro = new ResizeObserver(measure);
//     ro.observe(el);
//     window.addEventListener('resize', measure);
//     return () => {
//       ro.disconnect();
//       window.removeEventListener('resize', measure);
//     };
//   }, [plot, dock, collapsed, side]);

//   /* give the space back when the panel goes away for good */
//   useEffect(() => () => {
//     if (reserveRef.current) reserveRef.current({ right: 0, bottom: 0 });
//   }, []);

//   const toggle = useCallback(() => setCollapsed((v) => !v), []);
//   const flip = useCallback(() => setSide((s) => (s === 'right' ? 'left' : 'right')), []);

//   if (!plot) return null;

//   const sides = straightSides(plot.sides);
//   const st = status[plot.name] || 'available';
//   const stMeta = STATUS[st];

//   const doc = plot.doc || {};
//   const sqm = Math.round(plot.area);
//   const sqft = Math.round(plot.area * SQFT);

//   const figures = [
//     { label: 'Area', value: sqft.toLocaleString('en-IN'), unit: 'sq ft' },
//     { label: 'Area', value: sqm.toLocaleString('en-IN'), unit: 'm²' },
//     { label: 'Frontage', value: sides[sides.length - 1].toFixed(2), unit: 'm' },
//     { label: 'Perimeter', value: plot.sides.reduce((s, v) => s + v, 0).toFixed(2), unit: 'm' },
//   ];

//   /* Whatever the Flutter app has filled in. Blank fields stay off the
//      panel rather than showing an empty row. */
//   const details = [
//     ['Dimensions', doc.dimensions],
//     ['Facing', doc.facing],
//     ['Owner', doc.ownerName],
//     ['Phone', doc.contactPhone, 'tel'],
//     ['Notes', doc.notes],
//   ].filter(([, v]) => v && String(v).trim());

//   /* The plot number is OUR caption, not Google's — Maps titles a bare
//      coordinate with the coordinate and no URL parameter changes that.
//      So the number is shown here, on the row being tapped. What crosses
//      over to Maps is the position only. */
//   const pinLabel = doc.layoutName
//     ? `Plot ${plot.name} — ${doc.layoutName}`
//     : `Plot ${plot.name}`;

//   const coordText = latLng
//     ? `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`
//     : null;

//   /* Drops the pin and stops there. No route, no navigation prompt —
//      the customer sees where the plot sits and decides what to do with
//      it. */
//   const mapUrl = latLng
//     ? `https://www.google.com/maps/search/?api=1&query=${latLng.lat.toFixed(6)},${latLng.lng.toFixed(6)}`
//     : null;

//   const more = details.length + (latLng ? 1 : 0);

//   return (
//     <>
//       <style>{`
//         @keyframes panelIn {
//           from { transform: translateX(16px); opacity: 0; }
//           to   { transform: translateX(0);    opacity: 1; }
//         }
//         @keyframes dockIn {
//           from { transform: translateY(12px); opacity: 0; }
//           to   { transform: translateY(0);    opacity: 1; }
//         }

//         .pp {
//           position: absolute;
//           top: 14px; right: 14px;
//           width: 324px;
//           max-height: calc(100% - 28px);
//           display: flex;
//           flex-direction: column;
//           background: ${PAPER};
//           border: 1px solid ${HAIR};
//           border-radius: 14px;
//           box-shadow:
//             0 1px 2px rgba(20, 24, 32, 0.08),
//             0 16px 40px -12px rgba(20, 24, 32, 0.28);
//           z-index: 12;
//           box-sizing: border-box;
//           overflow: hidden;
//           animation: panelIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
//         }
//         @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
//           .pp {
//             background: rgba(255, 255, 255, 0.8);
//             -webkit-backdrop-filter: blur(20px) saturate(160%);
//             backdrop-filter: blur(20px) saturate(160%);
//           }
//         }
//         /* status, read at a glance and never in the way of the type */
//         .pp::before {
//           content: ''; position: absolute; left: 0; top: 0; bottom: 0;
//           width: 3px; background: var(--st); opacity: 0.9;
//         }

//         .pp-head {
//           flex: 0 0 auto;
//           display: flex; align-items: center; gap: 10px;
//           padding: 13px 12px 13px 18px;
//           border-bottom: 1px solid ${HAIR_SOFT};
//         }
//         .pp-title { min-width: 0; }
//         .pp-id { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
//         .pp-pre {
//           font-family: ${SANS}; font-size: 12px; font-weight: 500;
//           color: ${TEXT_FAINT}; flex: 0 0 auto;
//         }
//         .pp-name {
//           font-family: ${MONO}; font-size: 26px; font-weight: 600;
//           color: ${TEXT_MAIN}; line-height: 1.05; letter-spacing: -0.02em;
//           font-variant-numeric: tabular-nums;
//           overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
//         }
//         .pp-status {
//           display: inline-flex; align-items: center; gap: 6px; margin-top: 6px;
//           font-family: ${SANS}; font-size: 12px; font-weight: 500;
//           color: ${TEXT_MUTED}; white-space: nowrap;
//         }
//         .pp-status i {
//           width: 6px; height: 6px; border-radius: 50%;
//           background: var(--st); flex: 0 0 auto;
//         }
//         /* the chip's one figure — only ever shown docked and closed */
//         .pp-mini {
//           display: none; flex: 0 0 auto;
//           font-family: ${MONO}; font-size: 12.5px; font-weight: 600;
//           color: ${TEXT_MAIN}; font-variant-numeric: tabular-nums;
//           white-space: nowrap;
//         }
//         .pp-mini em { font-style: normal; font-weight: 500; color: ${TEXT_FAINT}; }
//         .pp-sep { display: none; width: 1px; height: 24px; background: ${HAIR}; flex: 0 0 auto; }

//         /* two actions worth taking without opening the record: one
//            segmented control rather than two floating buttons */
//         .pp-quick {
//           display: none; flex: 0 0 auto;
//           border: 1px solid ${HAIR}; border-radius: 9px;
//           overflow: hidden; background: ${FIELD};
//         }
//         .pp-quick > * {
//           width: 36px; height: 32px; border: none; background: none;
//           border-left: 1px solid ${HAIR_SOFT};
//           display: flex; align-items: center; justify-content: center;
//           color: ${ACCENT}; cursor: pointer; text-decoration: none;
//           -webkit-tap-highlight-color: transparent; touch-action: manipulation;
//           transition: background 0.14s ease;
//         }
//         .pp-quick > *:first-child { border-left: none; }
//         .pp-quick > *:hover { background: ${ACCENT_BG}; }
//         .pp-quick > *:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: -2px; }

//         .pp-tools { flex: 0 0 auto; margin-left: auto; display: flex; align-items: center; }
//         .pp-btn {
//           flex: 0 0 auto;
//           background: none; border: none; color: ${TEXT_FAINT}; cursor: pointer;
//           width: 30px; height: 30px; border-radius: 8px;
//           display: flex; align-items: center; justify-content: center; gap: 3px;
//           line-height: 1;
//           -webkit-tap-highlight-color: transparent; touch-action: manipulation;
//           transition: background 0.14s ease, color 0.14s ease;
//         }
//         .pp-btn:hover { background: rgba(20,24,32,0.05); color: ${TEXT_MAIN}; }
//         .pp-btn:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 1px; }
//         .pp-min { width: auto; min-width: 30px; padding: 0 6px; }
//         .pp-count {
//           font-family: ${SANS}; font-size: 11px; font-weight: 600;
//           font-variant-numeric: tabular-nums;
//         }
//         .pp-flip { display: none; }

//         .pp-body {
//           flex: 1 1 auto; min-height: 0;
//           overflow-y: auto; -webkit-overflow-scrolling: touch;
//           overscroll-behavior: contain;
//           padding: 14px 16px 16px 18px;
//         }

//         /* figures as one ruled block — a spec sheet, not four cards */
//         .pp-figs {
//           display: grid; grid-template-columns: 1fr 1fr;
//           border: 1px solid ${HAIR}; border-radius: 10px;
//           background: ${FIELD}; overflow: hidden;
//         }
//         .pp-fig {
//           padding: 9px 12px; min-width: 0;
//           border-top: 1px solid ${HAIR_SOFT};
//           border-left: 1px solid ${HAIR_SOFT};
//         }
//         .pp-fig:nth-child(-n+2) { border-top: none; }
//         .pp-fig:nth-child(odd) { border-left: none; }
//         .pp-fig-k {
//           font-family: ${SANS}; font-size: 11px; font-weight: 500;
//           color: ${TEXT_FAINT}; margin-bottom: 2px;
//         }
//         .pp-fig-v {
//           font-family: ${MONO}; font-size: 15px; font-weight: 600; color: ${TEXT_MAIN};
//           font-variant-numeric: tabular-nums;
//           white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
//         }
//         .pp-fig-u {
//           font-family: ${SANS}; font-size: 11px; font-weight: 500;
//           color: ${TEXT_FAINT}; margin-left: 4px;
//         }

//         .pp-rows { margin-top: 14px; }
//         .pp-row {
//           display: grid; grid-template-columns: 76px 1fr; gap: 12px;
//           padding: 8px 0; border-top: 1px solid ${HAIR_SOFT};
//         }
//         .pp-row:first-child { border-top: none; padding-top: 2px; }
//         .pp-row-k {
//           font-family: ${SANS}; font-size: 12px; font-weight: 500;
//           color: ${TEXT_FAINT}; padding-top: 1px;
//         }
//         .pp-row-v {
//           font-family: ${MONO}; font-size: 12.5px; color: ${TEXT_MAIN};
//           min-width: 0; word-break: break-word; line-height: 1.5;
//         }
//         .pp-row-v a { color: ${ACCENT}; text-decoration: none; }
//         .pp-row-v a:hover { text-decoration: underline; }

//         /* The whole strip is the link: plot number first, because that
//            is what the person is looking at, the figures under it as the
//            proof of where it lands. */
//         .pp-loc {
//           display: flex; align-items: center; gap: 11px;
//           margin-top: 14px; padding: 10px 12px;
//           border: 1px solid ${HAIR}; border-radius: 10px; background: ${FIELD};
//           text-decoration: none; cursor: pointer;
//           -webkit-tap-highlight-color: transparent; touch-action: manipulation;
//           transition: background 0.14s ease, border-color 0.14s ease;
//         }
//         .pp-loc:hover { background: ${ACCENT_BG}; border-color: rgba(44, 90, 79, 0.35); }
//         .pp-loc:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 1px; }
//         .pp-loc-i { flex: 0 0 auto; color: ${ACCENT}; }
//         .pp-loc-t { min-width: 0; }
//         .pp-loc-n {
//           display: block; font-family: ${SANS}; font-size: 12.5px; font-weight: 600;
//           color: ${TEXT_MAIN}; line-height: 1.3;
//           white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
//         }
//         .pp-loc-v {
//           display: block; font-family: ${MONO}; font-size: 11px; color: ${TEXT_FAINT};
//           font-variant-numeric: tabular-nums; line-height: 1.4; margin-top: 2px;
//           white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
//         }
//         .pp-loc-go { margin-left: auto; flex: 0 0 auto; color: ${TEXT_FAINT}; }

//         .pp-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
//         .pp-chip {
//           display: flex; align-items: center; gap: 6px; padding: 6px 11px;
//           border-radius: 999px; border: 1px solid ${HAIR};
//           background: ${FIELD}; color: ${TEXT_MUTED};
//           font-family: ${SANS}; font-size: 12px; font-weight: 500; cursor: pointer;
//           transition: border-color 0.14s ease, background 0.14s ease, color 0.14s ease;
//           -webkit-tap-highlight-color: transparent; touch-action: manipulation;
//         }
//         .pp-chip[data-on="1"] {
//           border-color: rgba(44, 90, 79, 0.4); background: ${ACCENT_BG}; color: ${ACCENT};
//         }
//         .pp-chip i { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto; }

//         .pp-foot {
//           flex: 0 0 auto;
//           padding: 12px 16px calc(14px + env(safe-area-inset-bottom, 0px)) 18px;
//           border-top: 1px solid ${HAIR_SOFT};
//         }
//         .pp-cta {
//           width: 100%; padding: 11px 14px; background: ${ACCENT}; border: none;
//           border-radius: 9px; color: #FFFFFF;
//           font-family: ${SANS}; font-size: 13.5px; font-weight: 600;
//           letter-spacing: 0.005em; cursor: pointer;
//           box-shadow: 0 1px 2px rgba(20, 24, 32, 0.16);
//           transition: background 0.14s ease, transform 0.1s ease;
//           -webkit-tap-highlight-color: transparent; touch-action: manipulation;
//         }
//         .pp-cta:hover { background: ${ACCENT_DEEP}; }
//         .pp-cta:active { transform: translateY(1px); }
//         .pp-cta:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }

//         /* ---- laptop and up: the rail ----
//            Collapsed it is header only, a card in the corner; the map
//            keeps the rest of the width and the framing gives it back. */
//         @media (min-width: ${DOCK_BP + 1}px) {
//           .pp[data-collapsed="1"] { max-height: none; }
//           .pp[data-collapsed="1"] .pp-body,
//           .pp[data-collapsed="1"] .pp-foot { display: none; }
//           .pp[data-collapsed="1"] .pp-head { border-bottom: none; }
//         }
//         @media (min-width: ${DOCK_BP + 1}px) and (max-width: 1240px) {
//           .pp { width: 302px; }
//           .pp-name { font-size: 24px; }
//         }

//         /* ---- tablet and phone: docked to a corner ----
//            Closed it is a chip on one edge and the rest of the screen is
//            map, so two fingers can rotate and tilt anywhere. Open it
//            grows in place into a narrow card, still in the corner. */
//         @media (max-width: ${DOCK_BP}px) {
//           .pp {
//             top: auto; left: auto;
//             right: 12px;
//             bottom: calc(12px + env(safe-area-inset-bottom, 0px));
//             width: min(344px, calc(100vw - 24px));
//             max-height: min(62vh, 470px);
//             box-shadow:
//               0 1px 2px rgba(10, 14, 20, 0.12),
//               0 14px 32px -10px rgba(10, 14, 20, 0.4);
//             animation: dockIn 0.24s cubic-bezier(0.16, 1, 0.3, 1);
//             transition: max-height 0.26s cubic-bezier(0.16, 1, 0.3, 1);
//           }
//           .pp[data-side="left"] { left: 12px; right: auto; }

//           /* the chip */
//           .pp[data-collapsed="1"] { width: auto; max-height: none; }
//           .pp[data-collapsed="1"] .pp-body,
//           .pp[data-collapsed="1"] .pp-foot { display: none; }
//           .pp[data-collapsed="1"] .pp-head {
//             border-bottom: none; padding: 8px 8px 8px 16px;
//           }
//           .pp[data-collapsed="1"] .pp-title { display: flex; align-items: center; gap: 10px; }
//           .pp[data-collapsed="1"] .pp-status { margin-top: 0; }
//           .pp[data-collapsed="1"] .pp-mini { display: block; }
//           .pp[data-collapsed="1"] .pp-sep { display: block; }
//           .pp[data-collapsed="1"] .pp-quick { display: flex; }
//           .pp[data-collapsed="1"] .pp-name { font-size: 19px; }

//           .pp-head { padding: 10px 10px 10px 16px; }
//           .pp-name { font-size: 22px; }
//           .pp-flip { display: flex; }

//           .pp-body { padding: 13px 14px 14px 16px; }
//           .pp-fig-v { font-size: 14px; }
//           .pp-foot { padding: 11px 14px calc(13px + env(safe-area-inset-bottom, 0px)) 16px; }
//         }

//         /* narrow phones: the chip drops the status word and keeps the
//            dot, which is the part that is read at a glance anyway */
//         @media (max-width: 430px) {
//           .pp { right: 9px; bottom: calc(9px + env(safe-area-inset-bottom, 0px)); }
//           .pp[data-side="left"] { left: 9px; }
//           .pp[data-collapsed="1"] .pp-status span { display: none; }
//           .pp[data-collapsed="1"] .pp-head { padding: 8px 6px 8px 14px; }
//           .pp[data-collapsed="1"] .pp-title { gap: 9px; }
//           .pp-quick > * { width: 34px; }
//           .pp-row { grid-template-columns: 68px 1fr; gap: 10px; }
//         }

//         /* landscape phone: height is the scarce thing, so the open card
//            is allowed to run tall and stays narrow */
//         @media (max-height: 460px) and (max-width: 900px) {
//           .pp { width: min(320px, calc(100vw - 24px)); max-height: 84vh; }
//         }

//         @media (prefers-reduced-motion: reduce) {
//           .pp { animation: none; transition: none; }
//           .pp-chip, .pp-cta, .pp-btn, .pp-loc, .pp-quick > * { transition: none; }
//         }
//       `}</style>

//       {/* keyed on the plot so the entrance replays when the selection
//           is swapped straight from one plot to another */}
//       <div
//         className="pp"
//         key={plot.name}
//         ref={boxRef}
//         style={{ '--st': stMeta.dot }}
//         data-collapsed={collapsed ? '1' : '0'}
//         data-side={side}
//         role="dialog"
//         aria-label={`Plot ${plot.name}`}
//       >
//         <div className="pp-head">
//           <div className="pp-title">
//             <div className="pp-id">
//               <span className="pp-pre">Plot</span>
//               <span className="pp-name">{plot.name}</span>
//             </div>
//             <span className="pp-status">
//               <i />
//               <span>{stMeta.label}</span>
//             </span>
//           </div>

//           <span className="pp-sep" />
//           <span className="pp-mini">
//             {sqft.toLocaleString('en-IN')}
//             <em> sq ft</em>
//           </span>

//           <div className="pp-quick">
//             {mapUrl && (
//               <a
//                 href={mapUrl}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 title="Open location in Google Maps"
//                 aria-label={`Open location of ${pinLabel} in Google Maps`}
//               >
//                 <svg
//                   width="15" height="15" viewBox="0 0 24 24" fill="none"
//                   stroke="currentColor" strokeWidth="2"
//                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
//                 >
//                   <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0z" />
//                   <circle cx="12" cy="10" r="2.6" />
//                 </svg>
//               </a>
//             )}
//             <button
//               type="button"
//               onClick={onQuote}
//               title="Build quotation"
//               aria-label="Build quotation"
//             >
//               <svg
//                 width="15" height="15" viewBox="0 0 24 24" fill="none"
//                 stroke="currentColor" strokeWidth="2"
//                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
//               >
//                 <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
//                 <path d="M14 3v5h5M9 13h6M9 17h4" />
//               </svg>
//             </button>
//           </div>

//           <div className="pp-tools">
//             <button
//               type="button"
//               className="pp-btn pp-flip"
//               onClick={flip}
//               title={side === 'right' ? 'Move to left corner' : 'Move to right corner'}
//               aria-label={side === 'right' ? 'Move panel to left corner' : 'Move panel to right corner'}
//             >
//               <svg
//                 width="15" height="15" viewBox="0 0 24 24" fill="none"
//                 stroke="currentColor" strokeWidth="2"
//                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
//               >
//                 <path d="M8 7 4 11l4 4M16 7l4 4-4 4M4 11h16" />
//               </svg>
//             </button>
//             <button
//               type="button"
//               className="pp-btn pp-min"
//               onClick={toggle}
//               aria-expanded={!collapsed}
//               title={collapsed ? 'Show full record' : 'Collapse'}
//               aria-label={collapsed ? `Show full record, ${more} more fields` : 'Collapse'}
//             >
//               <svg
//                 width="14" height="14" viewBox="0 0 24 24" fill="none"
//                 stroke="currentColor" strokeWidth="2.2"
//                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
//                 style={{ transform: collapsed ? 'none' : 'rotate(180deg)' }}
//               >
//                 <path d="M6 9l6 6 6-6" />
//               </svg>
//               {collapsed && more > 0 && <span className="pp-count">{more}</span>}
//             </button>
//             <button
//               type="button"
//               className="pp-btn"
//               onClick={onClose}
//               aria-label="Close plot details"
//             >
//               <svg
//                 width="14" height="14" viewBox="0 0 24 24" fill="none"
//                 stroke="currentColor" strokeWidth="2.2"
//                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
//               >
//                 <path d="M18 6 6 18M6 6l12 12" />
//               </svg>
//             </button>
//           </div>
//         </div>

//         <div className="pp-body">
//           <div className="pp-figs">
//             {figures.map((f, i) => (
//               <div className="pp-fig" key={i}>
//                 <div className="pp-fig-k">{f.label}</div>
//                 <div className="pp-fig-v">
//                   {f.value}
//                   <span className="pp-fig-u">{f.unit}</span>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {details.length > 0 && (
//             <div className="pp-rows">
//               {details.map(([label, value, kind]) => (
//                 <div className="pp-row" key={label}>
//                   <span className="pp-row-k">{label}</span>
//                   <span className="pp-row-v">
//                     {kind === 'tel'
//                       ? <a href={`tel:${String(value).replace(/\s+/g, '')}`}>{value}</a>
//                       : value}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}

//           {latLng && (
//             <a
//               className="pp-loc"
//               href={mapUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//               aria-label={`Open location of ${pinLabel} in Google Maps`}
//             >
//               <svg
//                 className="pp-loc-i"
//                 width="15" height="15" viewBox="0 0 24 24" fill="none"
//                 stroke="currentColor" strokeWidth="2"
//                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
//               >
//                 <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0z" />
//                 <circle cx="12" cy="10" r="2.6" />
//               </svg>
//               <span className="pp-loc-t">
//                 <span className="pp-loc-n">{pinLabel}</span>
//                 <span className="pp-loc-v">{coordText}</span>
//               </span>
//               <svg
//                 className="pp-loc-go"
//                 width="14" height="14" viewBox="0 0 24 24" fill="none"
//                 stroke="currentColor" strokeWidth="2"
//                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
//               >
//                 <path d="M7 17 17 7M9 7h8v8" />
//               </svg>
//             </a>
//           )}

//           {/* <div className="pp-chips">
//             {STATUS_KEYS.map((k) => {
//               const s = STATUS[k];
//               return (
//                 <button
//                   key={k}
//                   type="button"
//                   className="pp-chip"
//                   data-on={st === k ? '1' : '0'}
//                   aria-pressed={st === k}
//                   onClick={() => setStatus(plot.name, k)}
//                 >
//                   <i style={{ background: s.dot }} />
//                   {s.label}
//                 </button>
//               );
//             })}
//           </div> */}
//         </div>

//         <div className="pp-foot">
//           {/* <button type="button" className="pp-cta" onClick={onQuote}>
//             Build quotation
//           </button> */}

// {onBack && <button type="button" onClick={onBack}>Back</button>}
// {onQuote && <button type="button" className="quote-btn" onClick={onQuote}>Build quotation</button>}
// {setStatus && <StatusPicker value={status} onChange={setStatus} />}
//         </div>
//       </div>
//     </>
//   );
// }





import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SQFT } from '../../lib/units';
import { straightSides } from '../../lib/geometry';
import { STATUS, STATUS_KEYS } from '../../theme/status';
import { MONO, SANS } from '../../theme/tokens';

/* The panel is the one light surface in a dark app: it is the piece a
   customer leans over the phone to read, so it reads like paper — and
   closer to a property spec sheet than to a stack of cards. Figures sit
   in one ruled block, the record under it in plain label/value rows,
   and the only saturated things on the surface are the status rail down
   the leading edge and the quotation button.

   Structure is header / scroll body / footer. The name, status and the
   quotation button are the three things a salesman needs at arm's
   length, so they never scroll away — on a long plot record it is the
   dimensions and notes that move.

   On a laptop it is a rail down the right.

   On a tablet or a phone it DOCKS to a bottom corner instead of
   spanning the bottom edge. A full-width sheet ate the band of map you
   put two fingers on to rotate and tilt, and there is no way to rotate
   around a plot when the panel is sitting on the half of the screen you
   need to twist. So the resting state is a chip — plot number, status,
   area, and the two actions that matter as a segmented control — about
   the height of a button, hard against one corner. Everything else is
   map, and every gesture lands on map.

   The chip can be flipped to the other corner when the plot ends up
   underneath it, and it opens into a narrow card in place; the card is
   still corner-anchored, so most of the screen stays live.

   Either way the panel measures itself and reports the band it occupies
   through onReserve, so the map can frame the plot in the space that is
   actually left rather than behind the panel. Docked and closed it
   reserves nothing at all — a chip in a corner is not worth pushing a
   layout around.

   SHARED LINKS: onQuote and setStatus arrive as null when the page is
   opened from a WhatsApp link. Nothing here asks whether it is a share
   — it just doesn't draw a control it has no handler for, so the
   customer gets the plan and the plot record and nothing that writes. */
const HAIR = 'rgba(20, 24, 32, 0.11)';
const HAIR_SOFT = 'rgba(20, 24, 32, 0.06)';
const TEXT_MAIN = '#161B24';
const TEXT_MUTED = '#6B7280';
const TEXT_FAINT = '#8A93A0';
const ACCENT = '#2C5A4F';
const ACCENT_DEEP = '#23483F';
const ACCENT_BG = 'rgba(44, 90, 79, 0.07)';
const FIELD = 'rgba(255, 255, 255, 0.5)';
const PAPER = 'rgba(255, 255, 255, 0.94)';

const DOCK_BP = 1024;   // at or below this the panel docks to a corner

export default function DetailPanel({
  plot, status, setStatus, onClose, onQuote, latLng, onReserve,
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [side, setSide] = useState('right');
  const [dock, setDock] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia(`(max-width: ${DOCK_BP}px)`).matches,
  );
  const boxRef = useRef(null);
  const reserveRef = useRef(onReserve);

  useEffect(() => { reserveRef.current = onReserve; }, [onReserve]);

  /* rail or dock — the same breakpoint the stylesheet uses, because
     the measurement below has to know which edge is spoken for */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia(`(max-width: ${DOCK_BP}px)`);
    const onChange = (e) => setDock(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* ---------------------------------------------------------------
     Tell the map what it can't have.

     Measured rather than declared: the card's height depends on the
     record and the safe-area inset, and a hard-coded number would be
     wrong on most of those. A ResizeObserver covers them at once.

     Nothing is reserved for a closed chip, on either layout. The rail
     only counts when it is TALL; the docked card only counts when it is
     open, and then as width if it is narrow enough for the plot to sit
     beside it, as height if it isn't.
  --------------------------------------------------------------- */
  useEffect(() => {
    const send = reserveRef.current;
    if (!send) return undefined;
    const el = boxRef.current;
    if (!plot || !el) { send({ right: 0, bottom: 0 }); return undefined; }

    const measure = () => {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (dock) {
        if (collapsed) { send({ right: 0, bottom: 0 }); return; }
        if (side === 'right' && r.width <= vw * 0.62) {
          send({ right: Math.round(Math.max(vw - r.left, 0)), bottom: 0 });
        } else {
          send({ right: 0, bottom: Math.round(Math.max(vh - r.top, 0)) });
        }
        return;
      }

      send({
        right: r.height > vh * 0.55 ? Math.round(Math.max(vw - r.left, 0)) : 0,
        bottom: 0,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [plot, dock, collapsed, side]);

  /* give the space back when the panel goes away for good */
  useEffect(() => () => {
    if (reserveRef.current) reserveRef.current({ right: 0, bottom: 0 });
  }, []);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);
  const flip = useCallback(() => setSide((s) => (s === 'right' ? 'left' : 'right')), []);

  if (!plot) return null;

  const sides = straightSides(plot.sides);
  const st = status[plot.name] || 'available';
  const stMeta = STATUS[st];

  const doc = plot.doc || {};
  const sqm = Math.round(plot.area);
  const sqft = Math.round(plot.area * SQFT);

  const figures = [
    { label: 'Area', value: sqft.toLocaleString('en-IN'), unit: 'sq ft' },
    { label: 'Area', value: sqm.toLocaleString('en-IN'), unit: 'm²' },
    { label: 'Frontage', value: sides[sides.length - 1].toFixed(2), unit: 'm' },
    { label: 'Perimeter', value: plot.sides.reduce((s, v) => s + v, 0).toFixed(2), unit: 'm' },
  ];

  /* Whatever the Flutter app has filled in. Blank fields stay off the
     panel rather than showing an empty row. */
  const details = [
    ['Dimensions', doc.dimensions],
    ['Facing', doc.facing],
    ['Owner', doc.ownerName],
    ['Phone', doc.contactPhone, 'tel'],
    ['Notes', doc.notes],
  ].filter(([, v]) => v && String(v).trim());

  /* The plot number is OUR caption, not Google's — Maps titles a bare
     coordinate with the coordinate and no URL parameter changes that.
     So the number is shown here, on the row being tapped. What crosses
     over to Maps is the position only. */
  const pinLabel = doc.layoutName
    ? `Plot ${plot.name} — ${doc.layoutName}`
    : `Plot ${plot.name}`;

  const coordText = latLng
    ? `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`
    : null;

  /* Drops the pin and stops there. No route, no navigation prompt —
     the customer sees where the plot sits and decides what to do with
     it. */
  const mapUrl = latLng
    ? `https://www.google.com/maps/search/?api=1&query=${latLng.lat.toFixed(6)},${latLng.lng.toFixed(6)}`
    : null;

  const more = details.length + (latLng ? 1 : 0);

  /* Without a quote handler and without a location there is nothing in
     the segmented control, and an empty bordered box in the chip looks
     like a broken button. Same reasoning for the footer below. */
  const showQuick = !!(mapUrl || onQuote);
  const showFoot = !!(onQuote || setStatus);

  return (
    <>
      <style>{`
        @keyframes panelIn {
          from { transform: translateX(16px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes dockIn {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .pp {
          position: absolute;
          top: 14px; right: 14px;
          width: 324px;
          max-height: calc(100% - 28px);
          display: flex;
          flex-direction: column;
          background: ${PAPER};
          border: 1px solid ${HAIR};
          border-radius: 14px;
          box-shadow:
            0 1px 2px rgba(20, 24, 32, 0.08),
            0 16px 40px -12px rgba(20, 24, 32, 0.28);
          z-index: 12;
          box-sizing: border-box;
          overflow: hidden;
          animation: panelIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .pp {
            background: rgba(255, 255, 255, 0.8);
            -webkit-backdrop-filter: blur(20px) saturate(160%);
            backdrop-filter: blur(20px) saturate(160%);
          }
        }
        /* status, read at a glance and never in the way of the type */
        .pp::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: var(--st); opacity: 0.9;
        }

        .pp-head {
          flex: 0 0 auto;
          display: flex; align-items: center; gap: 10px;
          padding: 13px 12px 13px 18px;
          border-bottom: 1px solid ${HAIR_SOFT};
        }
        .pp-title { min-width: 0; }
        .pp-id { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
        .pp-pre {
          font-family: ${SANS}; font-size: 12px; font-weight: 500;
          color: ${TEXT_FAINT}; flex: 0 0 auto;
        }
        .pp-name {
          font-family: ${MONO}; font-size: 26px; font-weight: 600;
          color: ${TEXT_MAIN}; line-height: 1.05; letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pp-status {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 6px;
          font-family: ${SANS}; font-size: 12px; font-weight: 500;
          color: ${TEXT_MUTED}; white-space: nowrap;
        }
        .pp-status i {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--st); flex: 0 0 auto;
        }
        /* the chip's one figure — only ever shown docked and closed */
        .pp-mini {
          display: none; flex: 0 0 auto;
          font-family: ${MONO}; font-size: 12.5px; font-weight: 600;
          color: ${TEXT_MAIN}; font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .pp-mini em { font-style: normal; font-weight: 500; color: ${TEXT_FAINT}; }
        .pp-sep { display: none; width: 1px; height: 24px; background: ${HAIR}; flex: 0 0 auto; }

        /* two actions worth taking without opening the record: one
           segmented control rather than two floating buttons */
        .pp-quick {
          display: none; flex: 0 0 auto;
          border: 1px solid ${HAIR}; border-radius: 9px;
          overflow: hidden; background: ${FIELD};
        }
        .pp-quick > * {
          width: 36px; height: 32px; border: none; background: none;
          border-left: 1px solid ${HAIR_SOFT};
          display: flex; align-items: center; justify-content: center;
          color: ${ACCENT}; cursor: pointer; text-decoration: none;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
          transition: background 0.14s ease;
        }
        .pp-quick > *:first-child { border-left: none; }
        .pp-quick > *:hover { background: ${ACCENT_BG}; }
        .pp-quick > *:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: -2px; }

        .pp-tools { flex: 0 0 auto; margin-left: auto; display: flex; align-items: center; }
        .pp-btn {
          flex: 0 0 auto;
          background: none; border: none; color: ${TEXT_FAINT}; cursor: pointer;
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; gap: 3px;
          line-height: 1;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
          transition: background 0.14s ease, color 0.14s ease;
        }
        .pp-btn:hover { background: rgba(20,24,32,0.05); color: ${TEXT_MAIN}; }
        .pp-btn:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 1px; }
        .pp-min { width: auto; min-width: 30px; padding: 0 6px; }
        .pp-count {
          font-family: ${SANS}; font-size: 11px; font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .pp-flip { display: none; }

        .pp-body {
          flex: 1 1 auto; min-height: 0;
          overflow-y: auto; -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 14px 16px 16px 18px;
        }

        /* figures as one ruled block — a spec sheet, not four cards */
        .pp-figs {
          display: grid; grid-template-columns: 1fr 1fr;
          border: 1px solid ${HAIR}; border-radius: 10px;
          background: ${FIELD}; overflow: hidden;
        }
        .pp-fig {
          padding: 9px 12px; min-width: 0;
          border-top: 1px solid ${HAIR_SOFT};
          border-left: 1px solid ${HAIR_SOFT};
        }
        .pp-fig:nth-child(-n+2) { border-top: none; }
        .pp-fig:nth-child(odd) { border-left: none; }
        .pp-fig-k {
          font-family: ${SANS}; font-size: 11px; font-weight: 500;
          color: ${TEXT_FAINT}; margin-bottom: 2px;
        }
        .pp-fig-v {
          font-family: ${MONO}; font-size: 15px; font-weight: 600; color: ${TEXT_MAIN};
          font-variant-numeric: tabular-nums;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pp-fig-u {
          font-family: ${SANS}; font-size: 11px; font-weight: 500;
          color: ${TEXT_FAINT}; margin-left: 4px;
        }

        .pp-rows { margin-top: 14px; }
        .pp-row {
          display: grid; grid-template-columns: 76px 1fr; gap: 12px;
          padding: 8px 0; border-top: 1px solid ${HAIR_SOFT};
        }
        .pp-row:first-child { border-top: none; padding-top: 2px; }
        .pp-row-k {
          font-family: ${SANS}; font-size: 12px; font-weight: 500;
          color: ${TEXT_FAINT}; padding-top: 1px;
        }
        .pp-row-v {
          font-family: ${MONO}; font-size: 12.5px; color: ${TEXT_MAIN};
          min-width: 0; word-break: break-word; line-height: 1.5;
        }
        .pp-row-v a { color: ${ACCENT}; text-decoration: none; }
        .pp-row-v a:hover { text-decoration: underline; }

        /* The whole strip is the link: plot number first, because that
           is what the person is looking at, the figures under it as the
           proof of where it lands. */
        .pp-loc {
          display: flex; align-items: center; gap: 11px;
          margin-top: 14px; padding: 10px 12px;
          border: 1px solid ${HAIR}; border-radius: 10px; background: ${FIELD};
          text-decoration: none; cursor: pointer;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
          transition: background 0.14s ease, border-color 0.14s ease;
        }
        .pp-loc:hover { background: ${ACCENT_BG}; border-color: rgba(44, 90, 79, 0.35); }
        .pp-loc:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 1px; }
        .pp-loc-i { flex: 0 0 auto; color: ${ACCENT}; }
        .pp-loc-t { min-width: 0; }
        .pp-loc-n {
          display: block; font-family: ${SANS}; font-size: 12.5px; font-weight: 600;
          color: ${TEXT_MAIN}; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pp-loc-v {
          display: block; font-family: ${MONO}; font-size: 11px; color: ${TEXT_FAINT};
          font-variant-numeric: tabular-nums; line-height: 1.4; margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pp-loc-go { margin-left: auto; flex: 0 0 auto; color: ${TEXT_FAINT}; }

        .pp-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .pp-chip {
          display: flex; align-items: center; gap: 6px; padding: 6px 11px;
          border-radius: 999px; border: 1px solid ${HAIR};
          background: ${FIELD}; color: ${TEXT_MUTED};
          font-family: ${SANS}; font-size: 12px; font-weight: 500; cursor: pointer;
          transition: border-color 0.14s ease, background 0.14s ease, color 0.14s ease;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .pp-chip[data-on="1"] {
          border-color: rgba(44, 90, 79, 0.4); background: ${ACCENT_BG}; color: ${ACCENT};
        }
        .pp-chip i { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto; }

        .pp-foot {
          flex: 0 0 auto;
          padding: 12px 16px calc(14px + env(safe-area-inset-bottom, 0px)) 18px;
          border-top: 1px solid ${HAIR_SOFT};
        }
        .pp-cta {
          width: 100%; padding: 11px 14px; background: ${ACCENT}; border: none;
          border-radius: 9px; color: #FFFFFF;
          font-family: ${SANS}; font-size: 13.5px; font-weight: 600;
          letter-spacing: 0.005em; cursor: pointer;
          box-shadow: 0 1px 2px rgba(20, 24, 32, 0.16);
          transition: background 0.14s ease, transform 0.1s ease;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .pp-cta:hover { background: ${ACCENT_DEEP}; }
        .pp-cta:active { transform: translateY(1px); }
        .pp-cta:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }

        /* ---- laptop and up: the rail ----
           Collapsed it is header only, a card in the corner; the map
           keeps the rest of the width and the framing gives it back. */
        @media (min-width: ${DOCK_BP + 1}px) {
          .pp[data-collapsed="1"] { max-height: none; }
          .pp[data-collapsed="1"] .pp-body,
          .pp[data-collapsed="1"] .pp-foot { display: none; }
          .pp[data-collapsed="1"] .pp-head { border-bottom: none; }
        }
        @media (min-width: ${DOCK_BP + 1}px) and (max-width: 1240px) {
          .pp { width: 302px; }
          .pp-name { font-size: 24px; }
        }

        /* ---- tablet and phone: docked to a corner ----
           Closed it is a chip on one edge and the rest of the screen is
           map, so two fingers can rotate and tilt anywhere. Open it
           grows in place into a narrow card, still in the corner. */
        @media (max-width: ${DOCK_BP}px) {
          .pp {
            top: auto; left: auto;
            right: 12px;
            bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            width: min(344px, calc(100vw - 24px));
            max-height: min(62vh, 470px);
            box-shadow:
              0 1px 2px rgba(10, 14, 20, 0.12),
              0 14px 32px -10px rgba(10, 14, 20, 0.4);
            animation: dockIn 0.24s cubic-bezier(0.16, 1, 0.3, 1);
            transition: max-height 0.26s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .pp[data-side="left"] { left: 12px; right: auto; }

          /* the chip */
          .pp[data-collapsed="1"] { width: auto; max-height: none; }
          .pp[data-collapsed="1"] .pp-body,
          .pp[data-collapsed="1"] .pp-foot { display: none; }
          .pp[data-collapsed="1"] .pp-head {
            border-bottom: none; padding: 8px 8px 8px 16px;
          }
          .pp[data-collapsed="1"] .pp-title { display: flex; align-items: center; gap: 10px; }
          .pp[data-collapsed="1"] .pp-status { margin-top: 0; }
          .pp[data-collapsed="1"] .pp-mini { display: block; }
          .pp[data-collapsed="1"] .pp-sep { display: block; }
          .pp[data-collapsed="1"] .pp-quick { display: flex; }
          .pp[data-collapsed="1"] .pp-name { font-size: 19px; }

          .pp-head { padding: 10px 10px 10px 16px; }
          .pp-name { font-size: 22px; }
          .pp-flip { display: flex; }

          .pp-body { padding: 13px 14px 14px 16px; }
          .pp-fig-v { font-size: 14px; }
          .pp-foot { padding: 11px 14px calc(13px + env(safe-area-inset-bottom, 0px)) 16px; }
        }

        /* narrow phones: the chip drops the status word and keeps the
           dot, which is the part that is read at a glance anyway */
        @media (max-width: 430px) {
          .pp { right: 9px; bottom: calc(9px + env(safe-area-inset-bottom, 0px)); }
          .pp[data-side="left"] { left: 9px; }
          .pp[data-collapsed="1"] .pp-status span { display: none; }
          .pp[data-collapsed="1"] .pp-head { padding: 8px 6px 8px 14px; }
          .pp[data-collapsed="1"] .pp-title { gap: 9px; }
          .pp-quick > * { width: 34px; }
          .pp-row { grid-template-columns: 68px 1fr; gap: 10px; }
        }

        /* landscape phone: height is the scarce thing, so the open card
           is allowed to run tall and stays narrow */
        @media (max-height: 460px) and (max-width: 900px) {
          .pp { width: min(320px, calc(100vw - 24px)); max-height: 84vh; }
        }

        @media (prefers-reduced-motion: reduce) {
          .pp { animation: none; transition: none; }
          .pp-chip, .pp-cta, .pp-btn, .pp-loc, .pp-quick > * { transition: none; }
        }
      `}</style>

      {/* keyed on the plot so the entrance replays when the selection
          is swapped straight from one plot to another */}
      <div
        className="pp"
        key={plot.name}
        ref={boxRef}
        style={{ '--st': stMeta.dot }}
        data-collapsed={collapsed ? '1' : '0'}
        data-side={side}
        role="dialog"
        aria-label={`Plot ${plot.name}`}
      >
        <div className="pp-head">
          <div className="pp-title">
            <div className="pp-id">
              <span className="pp-pre">Plot</span>
              <span className="pp-name">{plot.name}</span>
            </div>
            <span className="pp-status">
              <i />
              <span>{stMeta.label}</span>
            </span>
          </div>

          <span className="pp-sep" />
          <span className="pp-mini">
            {sqft.toLocaleString('en-IN')}
            <em> sq ft</em>
          </span>

          {showQuick && (
            <div className="pp-quick">
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open location in Google Maps"
                  aria-label={`Open location of ${pinLabel} in Google Maps`}
                >
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  >
                    <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="2.6" />
                  </svg>
                </a>
              )}
              {onQuote && (
                <button
                  type="button"
                  onClick={onQuote}
                  title="Build quotation"
                  aria-label="Build quotation"
                >
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  >
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5M9 13h6M9 17h4" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className="pp-tools">
            <button
              type="button"
              className="pp-btn pp-flip"
              onClick={flip}
              title={side === 'right' ? 'Move to left corner' : 'Move to right corner'}
              aria-label={side === 'right' ? 'Move panel to left corner' : 'Move panel to right corner'}
            >
              <svg
                width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <path d="M8 7 4 11l4 4M16 7l4 4-4 4M4 11h16" />
              </svg>
            </button>
            <button
              type="button"
              className="pp-btn pp-min"
              onClick={toggle}
              aria-expanded={!collapsed}
              title={collapsed ? 'Show full record' : 'Collapse'}
              aria-label={collapsed ? `Show full record, ${more} more fields` : 'Collapse'}
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                style={{ transform: collapsed ? 'none' : 'rotate(180deg)' }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              {collapsed && more > 0 && <span className="pp-count">{more}</span>}
            </button>
            <button
              type="button"
              className="pp-btn"
              onClick={onClose}
              aria-label="Close plot details"
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="pp-body">
          <div className="pp-figs">
            {figures.map((f, i) => (
              <div className="pp-fig" key={i}>
                <div className="pp-fig-k">{f.label}</div>
                <div className="pp-fig-v">
                  {f.value}
                  <span className="pp-fig-u">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {details.length > 0 && (
            <div className="pp-rows">
              {details.map(([label, value, kind]) => (
                <div className="pp-row" key={label}>
                  <span className="pp-row-k">{label}</span>
                  <span className="pp-row-v">
                    {kind === 'tel'
                      ? <a href={`tel:${String(value).replace(/\s+/g, '')}`}>{value}</a>
                      : value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {latLng && (
            <a
              className="pp-loc"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open location of ${pinLabel} in Google Maps`}
            >
              <svg
                className="pp-loc-i"
                width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              <span className="pp-loc-t">
                <span className="pp-loc-n">{pinLabel}</span>
                <span className="pp-loc-v">{coordText}</span>
              </span>
              <svg
                className="pp-loc-go"
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </a>
          )}

          {/* Status chips stay off for now, as before. When they come
              back, `setStatus &&` is what keeps them out of a shared
              link — a customer must not be able to mark a plot sold.

          {setStatus && (
            <div className="pp-chips">
              {STATUS_KEYS.map((k) => {
                const s = STATUS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    className="pp-chip"
                    data-on={st === k ? '1' : '0'}
                    aria-pressed={st === k}
                    onClick={() => setStatus(plot.name, k)}
                  >
                    <i style={{ background: s.dot }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          )} */}
        </div>

        {/* No handler, no footer — on a shared link the record simply
            ends after the location strip. */}
        {showFoot && (
          <div className="pp-foot">
            {onQuote && (
              <button type="button" className="pp-cta" onClick={onQuote}>
                Build quotation
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}