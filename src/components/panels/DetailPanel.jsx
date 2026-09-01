
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { SQFT } from '../../lib/units';
// import { straightSides } from '../../lib/geometry';
// import { STATUS, STATUS_KEYS } from '../../theme/status';
// import { MONO, SANS } from '../../theme/tokens';

// /* The panel is the one light surface in a dark app: it is the piece a
//    customer leans over the phone to read, so it reads like paper.

//    Structure is header / scroll body / footer. The name, status and the
//    quotation button are the three things a salesman needs at arm's
//    length, so they never scroll away — on a long plot record it is the
//    dimensions and notes that move.

//    On a laptop it is a rail down the right. On a tablet or a phone
//    there is no width to spare for one, so it goes to the bottom edge as
//    a sheet — and a sheet at 56vh covers the plot it is describing. So it
//    opens at a PEEK: name, status, the four figures and the CTA, which is
//    the whole answer most of the time, in about a third of the height.
//    The record is one tap away on the grab handle.

//    Either way the panel measures itself and reports the band it occupies
//    through onReserve, so the map can frame the plot in the space that is
//    actually left rather than behind the panel. */
// const HAIR = 'rgba(20, 24, 32, 0.10)';
// const HAIR_SOFT = 'rgba(20, 24, 32, 0.06)';
// const TEXT_MAIN = '#1C2230';
// const TEXT_MUTED = '#6B7280';
// const ACCENT = '#2C5A4F';
// const ACCENT_BG = 'rgba(44, 90, 79, 0.08)';
// const PAPER = 'rgba(255, 255, 255, 0.92)';

// const SHEET_BP = 1024;   // at or below this the panel is a bottom sheet

// export default function DetailPanel({
//   plot, status, setStatus, onClose, onQuote, latLng, onReserve,
// }) {
//   const [copied, setCopied] = useState(false);
//   const [collapsed, setCollapsed] = useState(true);
//   const [sheet, setSheet] = useState(
//     () => typeof window !== 'undefined'
//       && window.matchMedia(`(max-width: ${SHEET_BP}px)`).matches,
//   );
//   const boxRef = useRef(null);
//   const reserveRef = useRef(onReserve);

//   useEffect(() => { reserveRef.current = onReserve; }, [onReserve]);

//   /* rail or sheet — the same breakpoint the stylesheet uses, because
//      the measurement below has to know which edge is spoken for */
//   useEffect(() => {
//     if (typeof window === 'undefined') return undefined;
//     const mq = window.matchMedia(`(max-width: ${SHEET_BP}px)`);
//     const onChange = (e) => setSheet(e.matches);
//     mq.addEventListener('change', onChange);
//     return () => mq.removeEventListener('change', onChange);
//   }, []);

//   /* ---------------------------------------------------------------
//      Tell the map what it can't have.

//      Measured rather than declared: the sheet's height depends on the
//      record, the safe-area inset and whether it is peeking, and a
//      hard-coded number would be wrong on most of those. A ResizeObserver
//      on the panel covers all of them at once.

//      The rail only counts when it is TALL. Collapsed to its header it is
//      a small card in the top-right corner and the middle of the map is
//      free, so reserving 348 px of width would push the plot left for no
//      reason.
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
//       if (sheet) {
//         send({ right: 0, bottom: Math.round(Math.max(vh - r.top, 0)) });
//       } else {
//         send({
//           right: r.height > vh * 0.55 ? Math.round(Math.max(vw - r.left, 0)) : 0,
//           bottom: 0,
//         });
//       }
//     };

//     measure();
//     const ro = new ResizeObserver(measure);
//     ro.observe(el);
//     window.addEventListener('resize', measure);
//     return () => {
//       ro.disconnect();
//       window.removeEventListener('resize', measure);
//     };
//   }, [plot, sheet, collapsed]);

//   /* give the space back when the panel goes away for good */
//   useEffect(() => () => {
//     if (reserveRef.current) reserveRef.current({ right: 0, bottom: 0 });
//   }, []);

//   const toggle = useCallback(() => setCollapsed((v) => !v), []);

//   if (!plot) return null;

//   const sides = straightSides(plot.sides);
//   const st = status[plot.name] || 'available';
//   const stMeta = STATUS[st];

//   const doc = plot.doc || {};
//   const sqm = Math.round(plot.area);
//   const sqft = Math.round(plot.area * SQFT);

//   const stats = [
//     { label: 'Area', value: sqm.toLocaleString('en-IN'), unit: 'm²' },
//     { label: 'Area', value: sqft.toLocaleString('en-IN'), unit: 'sq ft' },
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

//   const copyCoords = () => {
//     if (!latLng) return;
//     const text = `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`;
//     if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
//     setCopied(true);
//     setTimeout(() => setCopied(false), 1400);
//   };

//   const more = details.length + (latLng ? 1 : 0);

//   return (
//     <>
//       <style>{`
//         @keyframes panelIn {
//           from { transform: translateX(20px); opacity: 0; }
//           to   { transform: translateX(0);    opacity: 1; }
//         }
//         @keyframes sheetIn {
//           from { transform: translateY(18px); opacity: 0; }
//           to   { transform: translateY(0);    opacity: 1; }
//         }

//         .pp {
//           --pp-peek-body: 88px;
//           position: absolute;
//           top: 14px; right: 14px;
//           width: 320px;
//           max-height: calc(100% - 28px);
//           display: flex;
//           flex-direction: column;
//           background: ${PAPER};
//           border: 1px solid ${HAIR};
//           border-radius: 16px;
//           box-shadow:
//             0 12px 36px rgba(20, 24, 32, 0.14),
//             0 1px 2px rgba(20, 24, 32, 0.06),
//             inset 0 1px 0 rgba(255,255,255,0.7);
//           z-index: 12;
//           box-sizing: border-box;
//           overflow: hidden;
//           animation: panelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
//         }
//         @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
//           .pp {
//             background: rgba(255, 255, 255, 0.76);
//             -webkit-backdrop-filter: blur(18px) saturate(150%);
//             backdrop-filter: blur(18px) saturate(150%);
//           }
//         }

//         .pp-grab { display: none; }

//         .pp-head {
//           flex: 0 0 auto;
//           display: flex; align-items: flex-start; gap: 10px;
//           padding: 16px 16px 12px;
//           border-bottom: 1px solid ${HAIR_SOFT};
//         }
//         .pp-title { min-width: 0; }
//         .pp-rows { margin-bottom: 4px; }
//         .pp-eyebrow {
//           font-family: ${SANS}; font-size: 10px; font-weight: 600;
//           letter-spacing: 0.14em; text-transform: uppercase;
//           color: ${TEXT_MUTED}; margin-bottom: 3px;
//         }
//         .pp-name {
//           font-family: ${MONO}; font-size: 32px; font-weight: 600;
//           color: ${ACCENT}; line-height: 1; letter-spacing: -0.01em;
//           word-break: break-word;
//         }
//         .pp-pill {
//           display: inline-flex; align-items: center; gap: 5px;
//           margin-top: 8px; padding: 4px 9px; border-radius: 999px;
//           border: 1px solid ${HAIR}; background: rgba(255,255,255,0.6);
//           font-family: ${SANS}; font-size: 10px; font-weight: 700;
//           letter-spacing: 0.06em; text-transform: uppercase; color: ${TEXT_MAIN};
//         }

//         .pp-tools { flex: 0 0 auto; margin-left: auto; display: flex; gap: 2px; }
//         .pp-x, .pp-min {
//           flex: 0 0 auto;
//           background: none; border: none; color: ${TEXT_MUTED}; cursor: pointer;
//           font-size: 20px; line-height: 1; width: 32px; height: 32px;
//           border-radius: 8px; display: flex; align-items: center; justify-content: center;
//           -webkit-tap-highlight-color: transparent; touch-action: manipulation;
//           transition: background 0.15s ease, color 0.15s ease;
//         }
//         .pp-x:hover, .pp-min:hover { background: rgba(20,24,32,0.06); color: ${TEXT_MAIN}; }
//         .pp-min { font-size: 15px; }

//         .pp-body {
//           flex: 1 1 auto; min-height: 0;
//           overflow-y: auto; -webkit-overflow-scrolling: touch;
//           overscroll-behavior: contain;
//           padding: 14px 16px 16px;
//         }

//         .pp-label {
//           font-family: ${SANS}; font-size: 10px; font-weight: 600;
//           letter-spacing: 0.14em; text-transform: uppercase; color: ${TEXT_MUTED};
//         }

//         .pp-stats {
//           display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
//           margin-bottom: 16px;
//         }
//         .pp-stat {
//           background: ${ACCENT_BG}; border: 1px solid ${HAIR};
//           border-radius: 10px; padding: 9px 11px; min-width: 0;
//         }
//         .pp-stat-k {
//           font-family: ${SANS}; font-size: 9px; font-weight: 600;
//           letter-spacing: 0.08em; text-transform: uppercase;
//           color: ${TEXT_MUTED}; margin-bottom: 3px;
//         }
//         .pp-stat-v {
//           font-family: ${MONO}; font-size: 15px; font-weight: 600; color: ${TEXT_MAIN};
//           white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
//         }
//         .pp-stat-u { font-size: 10px; color: ${TEXT_MUTED}; font-weight: 500; margin-left: 4px; }

//         .pp-row {
//           display: flex; gap: 10px; padding: 7px 0;
//           border-top: 1px solid ${HAIR_SOFT};
//         }
//         .pp-row-k {
//           font-family: ${SANS}; font-size: 10px; font-weight: 600;
//           letter-spacing: 0.08em; text-transform: uppercase;
//           color: ${TEXT_MUTED}; flex: 0 0 74px; padding-top: 1px;
//         }
//         .pp-row-v {
//           font-family: ${MONO}; font-size: 12px; color: ${TEXT_MAIN};
//           flex: 1; min-width: 0; word-break: break-word; line-height: 1.5;
//         }
//         .pp-row-v a { color: ${ACCENT}; text-decoration: none; }
//         .pp-row-v a:hover { text-decoration: underline; }

//         .pp-coords {
//           display: flex; align-items: center; gap: 8px;
//           margin: 14px 0 16px; padding: 8px 10px;
//           border: 1px dashed ${HAIR}; border-radius: 9px;
//           font-family: ${MONO}; font-size: 11px; color: ${TEXT_MUTED};
//         }
//         .pp-copy {
//           margin-left: auto; flex: 0 0 auto; background: none; border: none;
//           font-family: ${SANS}; font-size: 10px; font-weight: 700;
//           letter-spacing: 0.08em; text-transform: uppercase;
//           color: ${ACCENT}; cursor: pointer; padding: 2px 4px;
//           -webkit-tap-highlight-color: transparent; touch-action: manipulation;
//         }

//         .pp-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
//         .pp-chip {
//           display: flex; align-items: center; gap: 6px; padding: 7px 11px;
//           border-radius: 999px; border: 1px solid ${HAIR};
//           background: rgba(255,255,255,0.5); color: ${TEXT_MUTED};
//           font-family: ${SANS}; font-size: 11px; font-weight: 600; cursor: pointer;
//           transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
//           -webkit-tap-highlight-color: transparent; touch-action: manipulation;
//         }
//         .pp-chip[data-on="1"] {
//           border-color: ${ACCENT}; background: ${ACCENT_BG}; color: ${ACCENT};
//         }
//         .pp-dot { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto; }

//         .pp-foot {
//           flex: 0 0 auto;
//           padding: 12px 16px calc(14px + env(safe-area-inset-bottom, 0px));
//           border-top: 1px solid ${HAIR_SOFT};
//           background: linear-gradient(to top, rgba(255,255,255,0.65), rgba(255,255,255,0));
//         }
//         .pp-cta {
//           width: 100%; padding: 12px; background: ${ACCENT}; border: none;
//           border-radius: 10px; color: #FFFFFF; font-family: ${SANS}; font-size: 13px;
//           font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
//           cursor: pointer; box-shadow: 0 4px 14px rgba(44, 90, 79, 0.28);
//           transition: filter 0.15s ease, transform 0.1s ease;
//           -webkit-tap-highlight-color: transparent; touch-action: manipulation;
//         }
//         .pp-cta:hover { filter: brightness(1.08); }
//         .pp-cta:active { transform: translateY(1px); }

//         /* ---- laptop and up: the rail ----
//            Collapsed it is header only, a card in the corner; the map
//            keeps the rest of the width and the framing gives it back. */
//         @media (min-width: ${SHEET_BP + 1}px) {
//           .pp[data-collapsed="1"] { max-height: none; }
//           .pp[data-collapsed="1"] .pp-body,
//           .pp[data-collapsed="1"] .pp-foot { display: none; }
//           .pp[data-collapsed="1"] .pp-head { border-bottom: none; }
//         }
//         @media (min-width: ${SHEET_BP + 1}px) and (max-width: 1240px) {
//           .pp { width: 300px; }
//           .pp-name { font-size: 28px; }
//         }

//         /* ---- tablet and phone: a sheet on the bottom edge ----
//            It covers the band the framing has already stopped using, so
//            the plot stays in view above it.

//            The header goes horizontal here — name and status on one
//            line, eyebrow dropped — because height is the scarce thing in
//            a sheet, and the word PLOT sitting above a plot number was
//            never carrying its keep. */
//         @media (max-width: ${SHEET_BP}px) {
//           .pp {
//             top: auto; bottom: 8px;
//             width: auto; max-height: 60vh;
//             border-radius: 18px;
//             box-shadow: 0 -8px 30px rgba(10, 14, 20, 0.32);
//             animation: sheetIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
//             transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
//           }
//           /* peeking: name, status, figures, CTA — and the plot still
//              visible above it, which is the whole point */
//           .pp[data-collapsed="1"] { max-height: var(--pp-peek); }

//           .pp-grab {
//             display: flex; align-items: center; justify-content: center; gap: 8px;
//             width: 100%; padding: 9px 0 5px; border: none; background: none;
//             cursor: pointer; -webkit-tap-highlight-color: transparent;
//             touch-action: manipulation;
//           }
//           .pp-grab i {
//             display: block; width: 34px; height: 4px; border-radius: 999px;
//             background: rgba(20,24,32,0.18);
//           }
//           .pp-grab span {
//             font-family: ${SANS}; font-size: 10px; font-weight: 600;
//             letter-spacing: 0.08em; text-transform: uppercase; color: ${TEXT_MUTED};
//           }
//           .pp-min { display: none; }

//           .pp-head { align-items: center; }
//           .pp-title { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
//           .pp-eyebrow { display: none; }
//           .pp-pill { margin-top: 0; }
//           .pp-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
//         }

//         /* tablet: centred and capped. A 1024-wide bar of paper leaves a
//            lot of nothing between the figures and the button, so the
//            sheet keeps a readable measure, the record runs in two
//            columns, and the CTA sits at its own width on the right
//            instead of stretching the whole way across. */
//         @media (min-width: 641px) and (max-width: ${SHEET_BP}px) {
//           .pp {
//             left: 16px; right: 16px; bottom: 16px;
//             margin: 0 auto; max-width: 760px;
//             --pp-peek: 210px;
//           }
//           .pp-head { padding: 6px 18px 12px; }
//           .pp-name { font-size: 26px; }
//           .pp-body { padding: 14px 18px 16px; }
//           .pp-stats { gap: 10px; }
//           .pp-stat { padding: 10px 12px; }
//           .pp-stat-v { font-size: 17px; }
//           .pp-rows { display: grid; grid-template-columns: 1fr 1fr; column-gap: 22px; }
//           .pp-foot {
//             display: flex; justify-content: flex-end;
//             padding: 12px 18px calc(14px + env(safe-area-inset-bottom, 0px));
//           }
//           .pp-cta { width: auto; min-width: 300px; }
//         }

//         /* phone */
//         @media (max-width: 640px) {
//           .pp { left: 8px; right: 8px; --pp-peek: 196px; }
//           .pp-head { padding: 6px 14px 10px; }
//           .pp-name { font-size: 24px; }
//           .pp-body { padding: 12px 14px 14px; }
//           .pp-stats { gap: 6px; }
//           .pp-stat { padding: 7px 8px; }
//           .pp-stat-v { font-size: 13px; }
//           .pp-foot { padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px)); }
//           .pp-cta { padding: 12px; font-size: 12px; }
//         }

//         @media (max-width: 380px) {
//           .pp { --pp-peek: 188px; }
//           .pp-name { font-size: 21px; }
//           .pp-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
//           .pp-row-k { flex-basis: 64px; }
//         }

//         /* landscape phone: almost no height to spend, so the peek is
//            most of what there is and expanding is a last resort */
//         @media (max-height: 460px) and (max-width: 900px) {
//           .pp { max-height: 78vh; --pp-peek: 148px; }
//           .pp-name { font-size: 20px; }
//           .pp-rows { grid-template-columns: 1fr 1fr; }
//         }

//         @media (prefers-reduced-motion: reduce) {
//           .pp { animation: none; transition: none; }
//           .pp-chip, .pp-cta, .pp-x, .pp-min { transition: none; }
//         }
//       `}</style>

//       {/* keyed on the plot so the entrance replays when the selection
//           is swapped straight from one plot to another */}
//       <div
//         className="pp"
//         key={plot.name}
//         ref={boxRef}
//         data-collapsed={collapsed ? '1' : '0'}
//         role="dialog"
//         aria-label={`Plot ${plot.name}`}
//       >
//         <button
//           type="button"
//           className="pp-grab"
//           onClick={toggle}
//           aria-expanded={!collapsed}
//           aria-label={collapsed ? 'Show full record' : 'Show less'}
//         >
//           <i />
//           {collapsed && more > 0 && <span>{more} more</span>}
//         </button>

//         <div className="pp-head">
//           <div className="pp-title">
//             <div className="pp-eyebrow">Plot</div>
//             <div className="pp-name">{plot.name}</div>
//             <span className="pp-pill">
//               <span className="pp-dot" style={{ background: stMeta.dot }} />
//               {stMeta.label}
//             </span>
//           </div>
//           <div className="pp-tools">
//             <button
//               type="button"
//               className="pp-min"
//               onClick={toggle}
//               aria-expanded={!collapsed}
//               title={collapsed ? 'Show full record' : 'Collapse'}
//             >
//               {collapsed ? '▾' : '▴'}
//             </button>
//             <button
//               type="button"
//               className="pp-x"
//               onClick={onClose}
//               aria-label="Close plot details"
//             >
//               ×
//             </button>
//           </div>
//         </div>

//         <div className="pp-body">
//           <div className="pp-stats">
//             {stats.map((s, i) => (
//               <div className="pp-stat" key={i}>
//                 <div className="pp-stat-k">{s.label}</div>
//                 <div className="pp-stat-v">
//                   {s.value}
//                   <span className="pp-stat-u">{s.unit}</span>
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
//             <div className="pp-coords">
//               <span>{latLng.lat.toFixed(6)}, {latLng.lng.toFixed(6)}</span>
//               <button type="button" className="pp-copy" onClick={copyCoords}>
//                 {copied ? 'Copied' : 'Copy'}
//               </button>
//             </div>
//           )}

//           {/* <div className="pp-label">Status</div> */}
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
//                   <span className="pp-dot" style={{ background: s.dot }} />
//                   {s.label}
//                 </button>
//               );
//             })}
//           </div> */}
//         </div>

//         <div className="pp-foot">
//           <button type="button" className="pp-cta" onClick={onQuote}>
//             Build quotation
//           </button>
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
   customer leans over the phone to read, so it reads like paper.

   Structure is header / scroll body / footer. The name, status and the
   quotation button are the three things a salesman needs at arm's
   length, so they never scroll away — on a long plot record it is the
   dimensions and notes that move.

   On a laptop it is a rail down the right. On a tablet or a phone
   there is no width to spare for one, so it goes to the bottom edge as
   a sheet — and a sheet at 56vh covers the plot it is describing. So it
   opens at a PEEK: name, status, the four figures and the CTA, which is
   the whole answer most of the time, in about a third of the height.
   The record is one tap away on the grab handle.

   Either way the panel measures itself and reports the band it occupies
   through onReserve, so the map can frame the plot in the space that is
   actually left rather than behind the panel. */
const HAIR = 'rgba(20, 24, 32, 0.10)';
const HAIR_SOFT = 'rgba(20, 24, 32, 0.06)';
const TEXT_MAIN = '#1C2230';
const TEXT_MUTED = '#6B7280';
const ACCENT = '#2C5A4F';
const ACCENT_BG = 'rgba(44, 90, 79, 0.08)';
const PAPER = 'rgba(255, 255, 255, 0.92)';

const SHEET_BP = 1024;   // at or below this the panel is a bottom sheet

export default function DetailPanel({
  plot, status, setStatus, onClose, onQuote, latLng, onReserve,
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [sheet, setSheet] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia(`(max-width: ${SHEET_BP}px)`).matches,
  );
  const boxRef = useRef(null);
  const reserveRef = useRef(onReserve);

  useEffect(() => { reserveRef.current = onReserve; }, [onReserve]);

  /* rail or sheet — the same breakpoint the stylesheet uses, because
     the measurement below has to know which edge is spoken for */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia(`(max-width: ${SHEET_BP}px)`);
    const onChange = (e) => setSheet(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* ---------------------------------------------------------------
     Tell the map what it can't have.

     Measured rather than declared: the sheet's height depends on the
     record, the safe-area inset and whether it is peeking, and a
     hard-coded number would be wrong on most of those. A ResizeObserver
     on the panel covers all of them at once.

     The rail only counts when it is TALL. Collapsed to its header it is
     a small card in the top-right corner and the middle of the map is
     free, so reserving 348 px of width would push the plot left for no
     reason.
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
      if (sheet) {
        send({ right: 0, bottom: Math.round(Math.max(vh - r.top, 0)) });
      } else {
        send({
          right: r.height > vh * 0.55 ? Math.round(Math.max(vw - r.left, 0)) : 0,
          bottom: 0,
        });
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [plot, sheet, collapsed]);

  /* give the space back when the panel goes away for good */
  useEffect(() => () => {
    if (reserveRef.current) reserveRef.current({ right: 0, bottom: 0 });
  }, []);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);

  if (!plot) return null;

  const sides = straightSides(plot.sides);
  const st = status[plot.name] || 'available';
  const stMeta = STATUS[st];

  const doc = plot.doc || {};
  const sqm = Math.round(plot.area);
  const sqft = Math.round(plot.area * SQFT);

  const stats = [
    { label: 'Area', value: sqm.toLocaleString('en-IN'), unit: 'm²' },
    { label: 'Area', value: sqft.toLocaleString('en-IN'), unit: 'sq ft' },
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

  return (
    <>
      <style>{`
        @keyframes panelIn {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes sheetIn {
          from { transform: translateY(18px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .pp {
          --pp-peek-body: 88px;
          position: absolute;
          top: 14px; right: 14px;
          width: 320px;
          max-height: calc(100% - 28px);
          display: flex;
          flex-direction: column;
          background: ${PAPER};
          border: 1px solid ${HAIR};
          border-radius: 16px;
          box-shadow:
            0 12px 36px rgba(20, 24, 32, 0.14),
            0 1px 2px rgba(20, 24, 32, 0.06),
            inset 0 1px 0 rgba(255,255,255,0.7);
          z-index: 12;
          box-sizing: border-box;
          overflow: hidden;
          animation: panelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .pp {
            background: rgba(255, 255, 255, 0.76);
            -webkit-backdrop-filter: blur(18px) saturate(150%);
            backdrop-filter: blur(18px) saturate(150%);
          }
        }

        .pp-grab { display: none; }

        .pp-head {
          flex: 0 0 auto;
          display: flex; align-items: flex-start; gap: 10px;
          padding: 16px 16px 12px;
          border-bottom: 1px solid ${HAIR_SOFT};
        }
        .pp-title { min-width: 0; }
        .pp-rows { margin-bottom: 4px; }
        .pp-eyebrow {
          font-family: ${SANS}; font-size: 10px; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: ${TEXT_MUTED}; margin-bottom: 3px;
        }
        .pp-name {
          font-family: ${MONO}; font-size: 32px; font-weight: 600;
          color: ${ACCENT}; line-height: 1; letter-spacing: -0.01em;
          word-break: break-word;
        }
        .pp-pill {
          display: inline-flex; align-items: center; gap: 5px;
          margin-top: 8px; padding: 4px 9px; border-radius: 999px;
          border: 1px solid ${HAIR}; background: rgba(255,255,255,0.6);
          font-family: ${SANS}; font-size: 10px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase; color: ${TEXT_MAIN};
        }

        .pp-tools { flex: 0 0 auto; margin-left: auto; display: flex; gap: 2px; }
        .pp-x, .pp-min {
          flex: 0 0 auto;
          background: none; border: none; color: ${TEXT_MUTED}; cursor: pointer;
          font-size: 20px; line-height: 1; width: 32px; height: 32px;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .pp-x:hover, .pp-min:hover { background: rgba(20,24,32,0.06); color: ${TEXT_MAIN}; }
        .pp-min { font-size: 15px; }

        .pp-body {
          flex: 1 1 auto; min-height: 0;
          overflow-y: auto; -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 14px 16px 16px;
        }

        .pp-label {
          font-family: ${SANS}; font-size: 10px; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase; color: ${TEXT_MUTED};
        }

        .pp-stats {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          margin-bottom: 16px;
        }
        .pp-stat {
          background: ${ACCENT_BG}; border: 1px solid ${HAIR};
          border-radius: 10px; padding: 9px 11px; min-width: 0;
        }
        .pp-stat-k {
          font-family: ${SANS}; font-size: 9px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: ${TEXT_MUTED}; margin-bottom: 3px;
        }
        .pp-stat-v {
          font-family: ${MONO}; font-size: 15px; font-weight: 600; color: ${TEXT_MAIN};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pp-stat-u { font-size: 10px; color: ${TEXT_MUTED}; font-weight: 500; margin-left: 4px; }

        .pp-row {
          display: flex; gap: 10px; padding: 7px 0;
          border-top: 1px solid ${HAIR_SOFT};
        }
        .pp-row-k {
          font-family: ${SANS}; font-size: 10px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: ${TEXT_MUTED}; flex: 0 0 74px; padding-top: 1px;
        }
        .pp-row-v {
          font-family: ${MONO}; font-size: 12px; color: ${TEXT_MAIN};
          flex: 1; min-width: 0; word-break: break-word; line-height: 1.5;
        }
        .pp-row-v a { color: ${ACCENT}; text-decoration: none; }
        .pp-row-v a:hover { text-decoration: underline; }

        /* The whole strip is the link: plot number first, because that
           is what the person is looking at, the figures under it as the
           proof of where it lands. */
        .pp-coords {
          display: flex; align-items: center; gap: 10px;
          margin: 14px 0 16px; padding: 9px 11px;
          border: 1px dashed ${HAIR}; border-radius: 9px;
          text-decoration: none; cursor: pointer;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .pp-coords:hover {
          background: ${ACCENT_BG}; border-color: ${ACCENT}; border-style: solid;
        }
        .pp-coords:active { transform: translateY(1px); }
        .pp-coords:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
        .pp-pin { flex: 0 0 auto; color: ${ACCENT}; }
        .pp-coords-t { min-width: 0; }
        .pp-coords-n {
          display: block;
          font-family: ${MONO}; font-size: 12px; font-weight: 600;
          color: ${TEXT_MAIN}; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pp-coords-v {
          display: block;
          font-family: ${MONO}; font-size: 10px; color: ${TEXT_MUTED};
          line-height: 1.4; margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pp-open {
          margin-left: auto; flex: 0 0 auto;
          font-family: ${SANS}; font-size: 10px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: ${ACCENT}; white-space: nowrap;
        }

        .pp-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .pp-chip {
          display: flex; align-items: center; gap: 6px; padding: 7px 11px;
          border-radius: 999px; border: 1px solid ${HAIR};
          background: rgba(255,255,255,0.5); color: ${TEXT_MUTED};
          font-family: ${SANS}; font-size: 11px; font-weight: 600; cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .pp-chip[data-on="1"] {
          border-color: ${ACCENT}; background: ${ACCENT_BG}; color: ${ACCENT};
        }
        .pp-dot { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto; }

        .pp-foot {
          flex: 0 0 auto;
          padding: 12px 16px calc(14px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid ${HAIR_SOFT};
          background: linear-gradient(to top, rgba(255,255,255,0.65), rgba(255,255,255,0));
        }
        .pp-cta {
          width: 100%; padding: 12px; background: ${ACCENT}; border: none;
          border-radius: 10px; color: #FFFFFF; font-family: ${SANS}; font-size: 13px;
          font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          cursor: pointer; box-shadow: 0 4px 14px rgba(44, 90, 79, 0.28);
          transition: filter 0.15s ease, transform 0.1s ease;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .pp-cta:hover { filter: brightness(1.08); }
        .pp-cta:active { transform: translateY(1px); }

        /* ---- laptop and up: the rail ----
           Collapsed it is header only, a card in the corner; the map
           keeps the rest of the width and the framing gives it back. */
        @media (min-width: ${SHEET_BP + 1}px) {
          .pp[data-collapsed="1"] { max-height: none; }
          .pp[data-collapsed="1"] .pp-body,
          .pp[data-collapsed="1"] .pp-foot { display: none; }
          .pp[data-collapsed="1"] .pp-head { border-bottom: none; }
        }
        @media (min-width: ${SHEET_BP + 1}px) and (max-width: 1240px) {
          .pp { width: 300px; }
          .pp-name { font-size: 28px; }
        }

        /* ---- tablet and phone: a sheet on the bottom edge ----
           It covers the band the framing has already stopped using, so
           the plot stays in view above it.

           The header goes horizontal here — name and status on one
           line, eyebrow dropped — because height is the scarce thing in
           a sheet, and the word PLOT sitting above a plot number was
           never carrying its keep. */
        @media (max-width: ${SHEET_BP}px) {
          .pp {
            top: auto; bottom: 8px;
            width: auto; max-height: 60vh;
            border-radius: 18px;
            box-shadow: 0 -8px 30px rgba(10, 14, 20, 0.32);
            animation: sheetIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
            transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          /* peeking: name, status, figures, CTA — and the plot still
             visible above it, which is the whole point */
          .pp[data-collapsed="1"] { max-height: none; }
.pp[data-collapsed="1"] .pp-body {
  max-height: var(--pp-peek-body);
  overflow: hidden;
}

          .pp-grab {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            width: 100%; padding: 9px 0 5px; border: none; background: none;
            cursor: pointer; -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          .pp-grab i {
            display: block; width: 34px; height: 4px; border-radius: 999px;
            background: rgba(20,24,32,0.18);
          }
          .pp-grab span {
            font-family: ${SANS}; font-size: 10px; font-weight: 600;
            letter-spacing: 0.08em; text-transform: uppercase; color: ${TEXT_MUTED};
          }
          .pp-min { display: none; }

          .pp-head { align-items: center; }
          .pp-title { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
          .pp-eyebrow { display: none; }
          .pp-pill { margin-top: 0; }
          .pp-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .pp-coords { padding: 10px 11px; }
        }

        /* tablet: centred and capped. A 1024-wide bar of paper leaves a
           lot of nothing between the figures and the button, so the
           sheet keeps a readable measure, the record runs in two
           columns, and the CTA sits at its own width on the right
           instead of stretching the whole way across. */
        @media (min-width: 641px) and (max-width: ${SHEET_BP}px) {
          .pp {
            left: 16px; right: 16px; bottom: 16px;
            margin: 0 auto; max-width: 760px;
            --pp-peek-body: 210px;
          }
          .pp-head { padding: 6px 18px 12px; }
          .pp-name { font-size: 26px; }
          .pp-body { padding: 14px 18px 16px; }
          .pp-stats { gap: 10px; }
          .pp-stat { padding: 10px 12px; }
          .pp-stat-v { font-size: 17px; }
          .pp-rows { display: grid; grid-template-columns: 1fr 1fr; column-gap: 22px; }
          .pp-foot {
            display: flex; justify-content: flex-end;
            padding: 12px 18px calc(14px + env(safe-area-inset-bottom, 0px));
          }
          .pp-cta { width: auto; min-width: 300px; }
        }

        /* phone */
        @media (max-width: 640px) {
          .pp { left: 8px; right: 8px; --pp-peek-body: 196px; }
          .pp-head { padding: 6px 14px 10px; }
          .pp-name { font-size: 24px; }
          .pp-body { padding: 12px 14px 14px; }
          .pp-stats { gap: 6px; }
          .pp-stat { padding: 7px 8px; }
          .pp-stat-v { font-size: 13px; }
          .pp-foot { padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px)); }
          .pp-cta { padding: 12px; font-size: 12px; }
        }

        @media (max-width: 380px) {
          .pp { --pp-peek-body: 188px; }
          .pp-name { font-size: 21px; }
          .pp-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pp-row-k { flex-basis: 64px; }
          /* no width for both, and the pin already says where it goes */
          .pp-open { display: none; }
        }

        /* landscape phone: almost no height to spend, so the peek is
           most of what there is and expanding is a last resort */
        @media (max-height: 460px) and (max-width: 900px) {
          .pp { max-height: 78vh; --pp-peek-body: 148px; }
          .pp-name { font-size: 20px; }
          .pp-rows { grid-template-columns: 1fr 1fr; }
        }

        @media (prefers-reduced-motion: reduce) {
          .pp { animation: none; transition: none; }
          .pp-chip, .pp-cta, .pp-x, .pp-min, .pp-coords { transition: none; }
        }
      `}</style>

      {/* keyed on the plot so the entrance replays when the selection
          is swapped straight from one plot to another */}
      <div
        className="pp"
        key={plot.name}
        ref={boxRef}
        data-collapsed={collapsed ? '1' : '0'}
        role="dialog"
        aria-label={`Plot ${plot.name}`}
      >
        <button
          type="button"
          className="pp-grab"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Show full record' : 'Show less'}
        >
          <i />
          {collapsed && more > 0 && <span>{more} more</span>}
        </button>

        <div className="pp-head">
          <div className="pp-title">
            <div className="pp-eyebrow">Plot</div>
            <div className="pp-name">{plot.name}</div>
            <span className="pp-pill">
              <span className="pp-dot" style={{ background: stMeta.dot }} />
              {stMeta.label}
            </span>
          </div>
          <div className="pp-tools">
            <button
              type="button"
              className="pp-min"
              onClick={toggle}
              aria-expanded={!collapsed}
              title={collapsed ? 'Show full record' : 'Collapse'}
            >
              {collapsed ? '▾' : '▴'}
            </button>
            <button
              type="button"
              className="pp-x"
              onClick={onClose}
              aria-label="Close plot details"
            >
              ×
            </button>
          </div>
        </div>

        <div className="pp-body">
          <div className="pp-stats">
            {stats.map((s, i) => (
              <div className="pp-stat" key={i}>
                <div className="pp-stat-k">{s.label}</div>
                <div className="pp-stat-v">
                  {s.value}
                  <span className="pp-stat-u">{s.unit}</span>
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
              className="pp-coords"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open location of ${pinLabel} in Google Maps`}
            >
              <svg
                className="pp-pin"
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              <span className="pp-coords-t">
                <span className="pp-coords-n">{pinLabel}</span>
                <span className="pp-coords-v">{coordText}</span>
              </span>
              <span className="pp-open">Location</span>
            </a>
          )}

          {/* <div className="pp-label">Status</div> */}
          {/* <div className="pp-chips">
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
                  <span className="pp-dot" style={{ background: s.dot }} />
                  {s.label}
                </button>
              );
            })}
          </div> */}
        </div>

        <div className="pp-foot">
          <button type="button" className="pp-cta" onClick={onQuote}>
            Build quotation
          </button>
        </div>
      </div>
    </>
  );
}