
// import React from 'react';
// import { pathWithHoles } from '../../lib/geometry';
// import { fittedNumberSize } from '../../lib/labels';
// import { STATUS, statusKeyOf } from '../../theme/status';
// import {
//   DIM_EDGE, DIM_FILL, DIM_INK,
//   KIND, MAPFONT, MONO, SANS, PLOT_STROKE, SEL_STROKE, SOCKET_FILL, toneOf,
// } from '../../theme/tokens';

// /**
//  * The plan itself.
//  *
//  * EVERY size here is in metres. Nothing is measured in screen pixels and
//  * nothing is gated on zoom, so zooming only ever makes the same drawing
//  * bigger or smaller — plot numbers never jump size, labels never pop in
//  * or out, borders never thicken.
//  *
//  * Status arrives from Firestore as the Flutter app writes it — "Sold",
//  * "Partial Payment" — so it goes through statusKeyOf rather than
//  * indexing STATUS directly, which only ever matched the lowercase keys.
//  *
//  * DIMMING is a reduction, not a removal. A filtered-out plot keeps its
//  * own colour, its border and its number, all at lower strength: the
//  * point of narrowing is to see where the matches sit INSIDE the layout,
//  * and that needs the layout still on the screen. The three strengths
//  * differ on purpose — the edge survives highest because a boundary is
//  * what makes a faint shape read at all, and the fill lowest because it
//  * is the largest area and the first thing to turn into noise.
//  */
// export default function PlanContent({
//   layout, selected, matches, status, showNumbers, showStatus, hover, setHover, onPick,
// }) {
//   /* One reading of a plot's status, shared by the shape and its number:
//      they have to agree, or a plot ends up with dark ink on a red fill. */
//   const stateOf = (name) => STATUS[statusKeyOf(status[name])];
// const mix = (a, b, k) => { /* hex → rgb, lerp, back */ };
// const fill = st ? mix(PLOT_FILL, STATUS_COLOR[st], 0.55) : PLOT_FILL;
//   return (
//     <g>
//       {layout.sorted.map((f) => {
//         const k = KIND[f.kind];
//         const isPlot = f.kind === 'plot';
//         const isSel = isPlot && selected === f.name;
//         const dim = isPlot && matches && !matches.has(f.name);

//         let fill = k.fill;
//         if (isPlot) {
//           // master-plan tones by default; the sale palette only when asked for
//           const st = stateOf(f.name);
//           fill = showStatus ? (st.fill || toneOf(f.name)) : toneOf(f.name);
//         }
//         if (isSel) fill = SOCKET_FILL;   // the raised copy carries the real colour

//         return (
//           <path
//             key={f.i}
//             data-plot={isPlot ? f.name : undefined}
//             d={pathWithHoles(f.pts, f.holes)}
//             fill={fill}
//             fillRule="evenodd"
//             stroke={isSel ? '#E9C6F2' : k.stroke}
//             strokeWidth={isSel ? SEL_STROKE : PLOT_STROKE}
//             fillOpacity={dim ? DIM_FILL : 0.92}
//             strokeOpacity={dim ? DIM_EDGE : 1}
//             opacity={hover === f.name && isPlot ? 0.85 : 1}
//             onMouseEnter={() => isPlot && setHover(f.name)}
//             onClick={() => isPlot && onPick(f.name)}
//             style={{ cursor: isPlot ? 'pointer' : 'default' }}
//           />
//         );
//       })}

//       {showNumbers && layout.plots.map((f) => {
//         if (f.name === selected) return null;
//         const dim = matches && !matches.has(f.name);
//         const size = fittedNumberSize(f, 3.2);
//         if (size < 0.85) return null;   // smaller than this is a smudge, not a number
//         /* Dark ink vanishes on the red and blue fills, so the number
//            takes whatever the status says is legible on it. */
//         const ink = showStatus ? stateOf(f.name).ink : '#1A1208';
//         return (
//           <text
//             key={`n${f.i}`} x={f.lp[0]} y={f.lp[1]} textAnchor="middle" dy="0.35em"
//             fontFamily={MAPFONT} fontSize={size} fontWeight="600" fill={ink}
//             fillOpacity={dim ? DIM_INK : 1}
//             style={{ pointerEvents: 'none' }}
//           >
//             {f.name}
//           </text>
//         );
//       })}

//       {/* Roads, open spaces, amenities and utilities name themselves. A
//           road polygon is long and thin, so its longest edge is the
//           direction the name should run — which is how the CAD sheet set
//           "9 MT. WIDE ROAD" along each carriageway. */}
//       {layout.features.map((f) => {
//         if (f.kind === 'plot') return null;
//         const label = (f.title || f.name || '').trim();
//         if (!label) return null;

//         const isRoad = f.kind === 'road';
//         const size = Math.min(Math.max(f.ir * (isRoad ? 0.55 : 0.9), 1.2), isRoad ? 2.8 : 3.8);
//         if (size < 1.2) return null;

//         const ink = KIND[f.kind].ink;
//         const [x, y] = f.lp;

//         return (
//           <g
//             key={`l${f.i}`} style={{ pointerEvents: 'none' }} paintOrder="stroke"
//             stroke="rgba(0,0,0,0.45)" strokeWidth={size * 0.028}
//             transform={`rotate(${f.angle} ${x} ${y})`}
//           >
//             <text
//               x={x} y={isRoad ? y : y - size * 0.4} textAnchor="middle" dy="0.35em"
//               fontFamily={isRoad ? MAPFONT : SANS} fontSize={size}
//               letterSpacing={isRoad ? 0 : 0.5} fill={ink} fontWeight="600"
//             >
//               {label}
//             </text>
//             {!isRoad && f.area > 200 && (
//               <text
//                 x={x} y={y + size * 0.85} textAnchor="middle" dy="0.35em"
//                 fontFamily={MONO} fontSize={size * 0.62} fill={ink} opacity="0.85"
//               >
//                 {Math.round(f.area).toLocaleString('en-IN')} m²
//               </text>
//             )}
//           </g>
//         );
//       })}
//     </g>
//   );
// }





// import React from 'react';
// import { pathWithHoles } from '../../lib/geometry';
// import { fittedNumberSize } from '../../lib/labels';
// import { STATUS, statusKeyOf } from '../../theme/status';
// import {
//   DIM_EDGE, DIM_FILL, DIM_INK,
//   KIND, MAPFONT, MONO, SANS, PLOT_STROKE, SEL_STROKE, SOCKET_FILL, toneOf,
// } from '../../theme/tokens';

// /* ── STATUS OVER THE DRAWING, NOT INSTEAD OF IT ────────────────────
//    How far a plot's fill travels from its master-plan tone toward the
//    sale colour. 0 is the plain drawing; 1 is the flat status colour,
//    which is what this used to do.

//    The tone is not decoration — it is what tells one block of the layout
//    from the next, and at 1 the whole plan collapses into three or four
//    flat colours and stops reading as a drawing. Around 0.55 the sale
//    state is unmistakable across a room and the blocks are still legible
//    underneath it.

//    RAISE THIS AND WATCH THE PLOT NUMBERS. The ink below is chosen by
//    STATUS for the FLAT colour; the further the fill sits from that, the
//    less the pairing is guaranteed. At 0.55 it still holds on the dark
//    fills. Past about 0.8 check "Sold" on a phone in daylight before
//    shipping it. */
// const STATUS_MIX = 0.55;

// /* #abc and #aabbcc both, since token files and CAD exports produce
//    each. Anything else — a named colour, an rgb() string — comes back
//    null and mix falls through to the status colour rather than throwing
//    in the middle of a render. */
// const hexRGB = (c) => {
//   let h = String(c || '').trim().replace('#', '');
//   if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
//   if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
//   const n = parseInt(h, 16);
//   return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
// };

// const mix = (a, b, k) => {
//   const A = hexRGB(a);
//   const B = hexRGB(b);
//   if (!A || !B) return b;
//   const c = (x, y) => Math.round(x + (y - x) * k);
//   return `rgb(${c(A[0], B[0])}, ${c(A[1], B[1])}, ${c(A[2], B[2])})`;
// };

// /**
//  * The plan itself.
//  *
//  * EVERY size here is in metres. Nothing is measured in screen pixels and
//  * nothing is gated on zoom, so zooming only ever makes the same drawing
//  * bigger or smaller — plot numbers never jump size, labels never pop in
//  * or out, borders never thicken.
//  *
//  * Status arrives from Firestore as the Flutter app writes it — "Sold",
//  * "Partial Payment" — so it goes through statusKeyOf rather than
//  * indexing STATUS directly, which only ever matched the lowercase keys.
//  *
//  * THE SALE COLOUR IS BLENDED INTO the master-plan tone rather than
//  * replacing it — see STATUS_MIX. A plot with no status, or one
//  * Firestore hasn't mapped yet, keeps its plain tone untouched, so the
//  * unsold half of a layout still reads as the drawing it came from.
//  *
//  * DIMMING is a reduction, not a removal. A filtered-out plot keeps its
//  * own colour, its border and its number, all at lower strength: the
//  * point of narrowing is to see where the matches sit INSIDE the layout,
//  * and that needs the layout still on the screen. The three strengths
//  * differ on purpose — the edge survives highest because a boundary is
//  * what makes a faint shape read at all, and the fill lowest because it
//  * is the largest area and the first thing to turn into noise.
//  */
// export default function PlanContent({
//   layout, selected, matches, status, showNumbers, showStatus, hover, setHover, onPick,
// }) {
//   /* One reading of a plot's status, shared by the shape and its number:
//      they have to agree, or a plot ends up with dark ink on a red fill.

//      `status` is undefined for the first frames, before the Firestore
//      read lands. That used to be harmless because the status view was
//      off by default and nothing called this; now that the colours are on
//      from the start, indexing it raw would throw on the very first
//      render. */
//   const stateOf = (name) => STATUS[statusKeyOf((status || {})[name])] || {};

//   return (
//     <g>
//       {layout.sorted.map((f) => {
//         const k = KIND[f.kind];
//         const isPlot = f.kind === 'plot';
//         const isSel = isPlot && selected === f.name;
//         const dim = isPlot && matches && !matches.has(f.name);

//         let fill = k.fill;
//         if (isPlot) {
//           /* The master-plan tone is the base in both states. When the
//              sale view is up, a plot that HAS a status is carried part
//              of the way toward its colour; one that hasn't is left
//              exactly as the drawing had it. */
//           const tone = toneOf(f.name);
//           const st = stateOf(f.name);
//           fill = showStatus && st.fill ? mix(tone, st.fill, STATUS_MIX) : tone;
//         }
//         if (isSel) fill = SOCKET_FILL;   // the raised copy carries the real colour

//         return (
//           <path
//             key={f.i}
//             data-plot={isPlot ? f.name : undefined}
//             d={pathWithHoles(f.pts, f.holes)}
//             fill={fill}
//             fillRule="evenodd"
//             stroke={isSel ? '#E9C6F2' : k.stroke}
//             strokeWidth={isSel ? SEL_STROKE : PLOT_STROKE}
//             fillOpacity={dim ? DIM_FILL : 0.92}
//             strokeOpacity={dim ? DIM_EDGE : 1}
//             opacity={hover === f.name && isPlot ? 0.85 : 1}
//             onMouseEnter={() => isPlot && setHover(f.name)}
//             onClick={() => isPlot && onPick(f.name)}
//             style={{ cursor: isPlot ? 'pointer' : 'default' }}
//           />
//         );
//       })}

//       {showNumbers && layout.plots.map((f) => {
//         if (f.name === selected) return null;
//         const dim = matches && !matches.has(f.name);
//         const size = fittedNumberSize(f, 3.2);
//         if (size < 0.85) return null;   // smaller than this is a smudge, not a number
//         /* Dark ink vanishes on the red and blue fills, so the number
//            takes whatever the status says is legible on it — and falls
//            back to the drawing's own ink for a plot that has no status,
//            which is now most of them on an untouched layout. */
//         const st = showStatus ? stateOf(f.name) : null;
//         const ink = (st && st.fill && st.ink) || '#1A1208';
//         return (
//           <text
//             key={`n${f.i}`} x={f.lp[0]} y={f.lp[1]} textAnchor="middle" dy="0.35em"
//             fontFamily={MAPFONT} fontSize={size} fontWeight="600" fill={ink}
//             fillOpacity={dim ? DIM_INK : 1}
//             style={{ pointerEvents: 'none' }}
//           >
//             {f.name}
//           </text>
//         );
//       })}

//       {/* Roads, open spaces, amenities and utilities name themselves. A
//           road polygon is long and thin, so its longest edge is the
//           direction the name should run — which is how the CAD sheet set
//           "9 MT. WIDE ROAD" along each carriageway. */}
//       {layout.features.map((f) => {
//         if (f.kind === 'plot') return null;
//         const label = (f.title || f.name || '').trim();
//         if (!label) return null;

//         const isRoad = f.kind === 'road';
//         const size = Math.min(Math.max(f.ir * (isRoad ? 0.55 : 0.9), 1.2), isRoad ? 2.8 : 3.8);
//         if (size < 1.2) return null;

//         const ink = KIND[f.kind].ink;
//         const [x, y] = f.lp;

//         return (
//           <g
//             key={`l${f.i}`} style={{ pointerEvents: 'none' }} paintOrder="stroke"
//             stroke="rgba(0,0,0,0.45)" strokeWidth={size * 0.028}
//             transform={`rotate(${f.angle} ${x} ${y})`}
//           >
//             <text
//               x={x} y={isRoad ? y : y - size * 0.4} textAnchor="middle" dy="0.35em"
//               fontFamily={isRoad ? MAPFONT : SANS} fontSize={size}
//               letterSpacing={isRoad ? 0 : 0.5} fill={ink} fontWeight="600"
//             >
//               {label}
//             </text>
//             {!isRoad && f.area > 200 && (
//               <text
//                 x={x} y={y + size * 0.85} textAnchor="middle" dy="0.35em"
//                 fontFamily={MONO} fontSize={size * 0.62} fill={ink} opacity="0.85"
//               >
//                 {Math.round(f.area).toLocaleString('en-IN')} m²
//               </text>
//             )}
//           </g>
//         );
//       })}
//     </g>
//   );
// }


import React from 'react';
import { pathWithHoles } from '../../lib/geometry';
import { fittedNumberSize } from '../../lib/labels';
import { STATUS, statusKeyOf } from '../../theme/status';
import {
  DIM_EDGE, DIM_FILL, DIM_INK,
  KIND, MAPFONT, MONO, SANS, PLOT_STROKE, SEL_STROKE, SOCKET_FILL,
} from '../../theme/tokens';

/* EVERY plot on the layout, off-white. This replaces toneOf's per-block
   master-plan tones outright — one plot reads the same as the next, so
   the only colour anywhere on the plan is a sale colour, and a coloured
   plot means something rather than being one more shade among twelve.

   Roads, open spaces and amenities are untouched: their colours come
   from KIND, not from here.

   Change this one constant to recolour the whole layout. */
const PLAIN_FILL = '#F1ECE2';

/**
 * The plan itself.
 *
 * EVERY size here is in metres. Nothing is measured in screen pixels and
 * nothing is gated on zoom, so zooming only ever makes the same drawing
 * bigger or smaller — plot numbers never jump size, labels never pop in
 * or out, borders never thicken.
 *
 * Status arrives from Firestore as the Flutter app writes it — "Sold",
 * "Partial Payment" — so it goes through statusKeyOf rather than
 * indexing STATUS directly, which only ever matched the lowercase keys.
 *
 * ONE BASE COLOUR FOR THE WHOLE LAYOUT — see PLAIN_FILL. Every plot is
 * off-white, and the only thing that ever paints one differently is its
 * sale status, while the status view is up. The per-block master-plan
 * tones are gone on purpose: against twelve shades a red plot is one
 * more colour, and against a flat sheet it is the only one.
 *
 * DIMMING is a reduction, not a removal. A filtered-out plot keeps its
 * own colour, its border and its number, all at lower strength: the
 * point of narrowing is to see where the matches sit INSIDE the layout,
 * and that needs the layout still on the screen. The three strengths
 * differ on purpose — the edge survives highest because a boundary is
 * what makes a faint shape read at all, and the fill lowest because it
 * is the largest area and the first thing to turn into noise.
 */
export default function PlanContent({
  layout, selected, matches, status, showNumbers, showStatus, hover, setHover, onPick,
}) {
  /* One reading of a plot's status, shared by the shape and its number:
     they have to agree, or a plot ends up with dark ink on a red fill.

     `status` is undefined for the first frames, before the Firestore
     read lands, so it is guarded here rather than indexed raw. */
  const stateOf = (name) => STATUS[statusKeyOf((status || {})[name])];

  return (
    <g>
      {layout.sorted.map((f) => {
        const k = KIND[f.kind];
        const isPlot = f.kind === 'plot';
        const isSel = isPlot && selected === f.name;
        const dim = isPlot && matches && !matches.has(f.name);

        let fill = k.fill;
        if (isPlot) {
          /* Off-white unless the plot has a sale state AND the status
             view is up. Nothing else colours a plot. */
          const st = stateOf(f.name);
          fill = (showStatus && st.fill) || PLAIN_FILL;
        }
        if (isSel) fill = SOCKET_FILL;   // the raised copy carries the real colour

        return (
          <path
            key={f.i}
            data-plot={isPlot ? f.name : undefined}
            d={pathWithHoles(f.pts, f.holes)}
            fill={fill}
            fillRule="evenodd"
            stroke={isSel ? '#E9C6F2' : k.stroke}
            strokeWidth={isSel ? SEL_STROKE : PLOT_STROKE}
            fillOpacity={dim ? DIM_FILL : 0.92}
            strokeOpacity={dim ? DIM_EDGE : 1}
            opacity={hover === f.name && isPlot ? 0.85 : 1}
            onMouseEnter={() => isPlot && setHover(f.name)}
            onClick={() => isPlot && onPick(f.name)}
            style={{ cursor: isPlot ? 'pointer' : 'default' }}
          />
        );
      })}

      {showNumbers && layout.plots.map((f) => {
        if (f.name === selected) return null;
        const dim = matches && !matches.has(f.name);
        const size = fittedNumberSize(f, 3.2);
        if (size < 0.85) return null;   // smaller than this is a smudge, not a number
        /* Dark ink vanishes on the red and blue fills, so the number
           takes whatever the status says is legible on it — and stays
           dark on an off-white plot, which has no status to ask. */
        const st = showStatus ? stateOf(f.name) : null;
        const ink = (st && st.fill && st.ink) || '#1A1208';
        return (
          <text
            key={`n${f.i}`} x={f.lp[0]} y={f.lp[1]} textAnchor="middle" dy="0.35em"
            fontFamily={MAPFONT} fontSize={size} fontWeight="600" fill={ink}
            fillOpacity={dim ? DIM_INK : 1}
            style={{ pointerEvents: 'none' }}
          >
            {f.name}
          </text>
        );
      })}

      {/* Roads, open spaces, amenities and utilities name themselves. A
          road polygon is long and thin, so its longest edge is the
          direction the name should run — which is how the CAD sheet set
          "9 MT. WIDE ROAD" along each carriageway. */}
      {layout.features.map((f) => {
        if (f.kind === 'plot') return null;
        const label = (f.title || f.name || '').trim();
        if (!label) return null;

        const isRoad = f.kind === 'road';
        const size = Math.min(Math.max(f.ir * (isRoad ? 0.55 : 0.9), 1.2), isRoad ? 2.8 : 3.8);
        if (size < 1.2) return null;

        const ink = KIND[f.kind].ink;
        const [x, y] = f.lp;

        return (
          <g
            key={`l${f.i}`} style={{ pointerEvents: 'none' }} paintOrder="stroke"
            stroke="rgba(0,0,0,0.45)" strokeWidth={size * 0.028}
            transform={`rotate(${f.angle} ${x} ${y})`}
          >
            <text
              x={x} y={isRoad ? y : y - size * 0.4} textAnchor="middle" dy="0.35em"
              fontFamily={isRoad ? MAPFONT : SANS} fontSize={size}
              letterSpacing={isRoad ? 0 : 0.5} fill={ink} fontWeight="600"
            >
              {label}
            </text>
            {!isRoad && f.area > 200 && (
              <text
                x={x} y={y + size * 0.85} textAnchor="middle" dy="0.35em"
                fontFamily={MONO} fontSize={size * 0.62} fill={ink} opacity="0.85"
              >
                {Math.round(f.area).toLocaleString('en-IN')} m²
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}