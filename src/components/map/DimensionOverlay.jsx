import React from 'react';
import { centroid, buildRuns, offsetRun, midOfPolyline } from '../../lib/geometry';
import { MAPFONT, SELECTED_INK } from '../../theme/tokens';
import { SQFT } from '../../lib/units';

/**
 * The figures that appear around the raised plot: one dimension per
 * straight side, one per fillet run, and the plot's number and area in
 * the middle.
 *
 * Text and stand-off are fixed distances on the ground (~0.38 m and
 * ~0.50 m) rather than fractions of the plot, so every plot's dimensions
 * read at the same weight.
 */

export default function DimensionOverlay({ plot }) {
  const c = centroid(plot.pts);
  const ir = plot.ir || 3;

  const off = 0.50 + ir * 0.02;
  const txt = 0.38;
  const tick = txt * 0.8;
  const hair = 0.045;

  const num = Math.min(ir * 0.27, 3.4);
  const sqm = num * 0.32;
  const sqftSize = num * 0.51;

  const runs = buildRuns(plot.pts, plot.sides, c);

  return (
    <g style={{ pointerEvents: 'none' }}>
      {runs.map((run, ri) => {
        const poly = offsetRun(run, off);
        const first = run.segs[0];
        const last = run.segs[run.segs.length - 1];
        const a = poly[0];
        const b = poly[poly.length - 1];
        const { p: mid, tan } = midOfPolyline(poly);

        const t0 = [poly[1][0] - poly[0][0], poly[1][1] - poly[0][1]];
        const t1 = [b[0] - poly[poly.length - 2][0], b[1] - poly[poly.length - 2][1]];
        const perp = (t) => {
          const L = Math.hypot(t[0], t[1]) || 1;
          return [(-t[1] / L) * tick, (t[0] / L) * tick];
        };
        const k0 = perp(t0);
        const k1 = perp(t1);

        // keep every figure readable from the same side up
        let deg = (Math.atan2(tan[1], tan[0]) * 180) / Math.PI;
        if (deg > 90) deg -= 180;
        if (deg < -90) deg += 180;

        const mn = [-tan[1], tan[0]];
        const away = (mn[0] * (mid[0] - c[0]) + mn[1] * (mid[1] - c[1])) > 0 ? 1 : -1;
        const lx = mid[0] + mn[0] * away * txt * 0.85;
        const ly = mid[1] + mn[1] * away * txt * 0.85;

        const d = `M${poly.map((p) => `${p[0]} ${p[1]}`).join('L')}`;

        return (
          <g key={`run${ri}`}>
            <line
              x1={first.p1[0]} y1={first.p1[1]} x2={a[0]} y2={a[1]}
              stroke="#FFFFFF" strokeWidth={hair}
              strokeDasharray={`${hair * 4} ${hair * 3}`} opacity="0.7"
            />
            <line
              x1={last.p2[0]} y1={last.p2[1]} x2={b[0]} y2={b[1]}
              stroke="#FFFFFF" strokeWidth={hair}
              strokeDasharray={`${hair * 4} ${hair * 3}`} opacity="0.7"
            />
            <path
              d={d} fill="none" stroke="#FFFFFF" strokeWidth={hair}
              strokeDasharray={`${hair * 5} ${hair * 3}`} opacity="0.9"
              strokeLinejoin="round" strokeLinecap="round"
            />
            <line
              x1={a[0] - k0[0]} y1={a[1] - k0[1]} x2={a[0] + k0[0]} y2={a[1] + k0[1]}
              stroke="#FFFFFF" strokeWidth={hair * 1.4}
            />
            <line
              x1={b[0] - k1[0]} y1={b[1] - k1[1]} x2={b[0] + k1[0]} y2={b[1] + k1[1]}
              stroke="#FFFFFF" strokeWidth={hair * 1.4}
            />
            <text
              x={lx} y={ly} transform={`rotate(${deg} ${lx} ${ly})`}
              textAnchor="middle" dy="0.35em"
              fontFamily={MAPFONT} fontSize={txt} fontWeight="500" fill="#FFFFFF"
            >
              {run.len.toFixed(2)} m
            </text>
          </g>
        );
      })}

      <text
        x={c[0]} y={c[1] - num * 0.60} textAnchor="middle" dy="0.35em"
        fontFamily={MAPFONT} fontSize={num} fontWeight="600"
        letterSpacing={-num * 0.02} fill={SELECTED_INK}
      >
        {plot.name}
      </text>
      <text
        x={c[0]} y={c[1] + num * 0.52} textAnchor="middle" dy="0.35em"
        fontFamily={MAPFONT} fontSize={sqm} fontWeight="500" fill={SELECTED_INK} opacity="0.85"
      >
        {plot.area.toFixed(2)} m²
      </text>
      <text
        x={c[0]} y={c[1] + num * 1.12} textAnchor="middle" dy="0.35em"
        fontFamily={MAPFONT} fontSize={sqftSize} fontWeight="600" fill={SELECTED_INK}
      >
        {(plot.area * SQFT).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ft²
      </text>
    </g>
  );
}
