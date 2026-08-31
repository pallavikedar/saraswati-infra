
import React from 'react';
import { pathWithHoles } from '../../lib/geometry';
import { fittedNumberSize } from '../../lib/labels';
import { STATUS, statusKeyOf } from '../../theme/status';
import {
  DIM_EDGE, DIM_FILL, DIM_INK,
  KIND, MAPFONT, MONO, SANS, PLOT_STROKE, SEL_STROKE, SOCKET_FILL, toneOf,
} from '../../theme/tokens';

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
     they have to agree, or a plot ends up with dark ink on a red fill. */
  const stateOf = (name) => STATUS[statusKeyOf(status[name])];

  return (
    <g>
      {layout.sorted.map((f) => {
        const k = KIND[f.kind];
        const isPlot = f.kind === 'plot';
        const isSel = isPlot && selected === f.name;
        const dim = isPlot && matches && !matches.has(f.name);

        let fill = k.fill;
        if (isPlot) {
          // master-plan tones by default; the sale palette only when asked for
          const st = stateOf(f.name);
          fill = showStatus ? (st.fill || toneOf(f.name)) : toneOf(f.name);
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
           takes whatever the status says is legible on it. */
        const ink = showStatus ? stateOf(f.name).ink : '#1A1208';
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