export function pathWithHoles(pts, holes) {
  const ring = (r) => `M${r.map((p) => `${p[0]} ${p[1]}`).join('L')}Z`;
  return [ring(pts), ...(holes || []).map(ring)].join(' ');
}

export function centroid(pts) {
  let a = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const f = x0 * y1 - x1 * y0;
    a += f;
    x += (x0 + x1) * f;
    y += (y0 + y1) * f;
  }
  if (Math.abs(a) < 1e-9) {
    const n = pts.length;
    return [
      pts.reduce((s, p) => s + p[0], 0) / n,
      pts.reduce((s, p) => s + p[1], 0) / n,
    ];
  }
  a *= 0.5;
  return [x / (6 * a), y / (6 * a)];
}

/** outward-facing normal of edge p1->p2, away from the plot centre */
export function outwardNormal(p1, p2, c) {
  let nx = -(p2[1] - p1[1]);
  let ny = p2[0] - p1[0];
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  const mx = (p1[0] + p2[0]) / 2;
  const my = (p1[1] + p2[1]) / 2;
  if (nx * (c[0] - mx) + ny * (c[1] - my) > 0) { nx = -nx; ny = -ny; }
  return [nx, ny];
}

/* CAD fillets arrive as a run of ~0.3 m chords, so a naive
   one-line-per-edge overlay draws thirty dimension lines around a single
   rounded corner. Edges are grouped first: anything shorter than
   SHORT_EDGE is part of a curve, consecutive curve chords collapse into
   one run, and that run is dimensioned as a single offset arc carrying
   its total length. */
export const SHORT_EDGE = 1.0;
export const MIN_RUN = 0.6;

export function buildRuns(pts, sides, c) {
  const n = pts.length;
  const segs = pts.map((p1, i) => ({
    p1,
    p2: pts[(i + 1) % n],
    len: sides[i],
    nrm: outwardNormal(p1, pts[(i + 1) % n], c),
  }));

  const runs = [];
  let curve = null;
  segs.forEach((s) => {
    if (s.len >= SHORT_EDGE) {
      if (curve) { runs.push(curve); curve = null; }
      runs.push({ curved: false, segs: [s], len: s.len });
    } else {
      if (!curve) curve = { curved: true, segs: [], len: 0 };
      curve.segs.push(s);
      curve.len += s.len;
    }
  });
  if (curve) runs.push(curve);

  // a curve that wraps the start of the ring is one run, not two
  if (runs.length > 1 && runs[0].curved && runs[runs.length - 1].curved) {
    const tail = runs.pop();
    runs[0] = {
      curved: true,
      segs: [...tail.segs, ...runs[0].segs],
      len: tail.len + runs[0].len,
    };
  }
  return runs.filter((r) => r.len >= MIN_RUN);
}

export function offsetRun(run, off) {
  const poly = [run.segs[0].p1, ...run.segs.map((s) => s.p2)];
  const nrm = run.segs.map((s) => s.nrm);
  return poly.map((p, i) => {
    const a = nrm[Math.max(0, i - 1)];
    const b = nrm[Math.min(nrm.length - 1, i)];
    let nx = a[0] + b[0];
    let ny = a[1] + b[1];
    const L = Math.hypot(nx, ny) || 1;
    nx /= L;
    ny /= L;
    const cosHalf = Math.max(0.4, a[0] * nx + a[1] * ny);
    const d = off / cosHalf;
    return [p[0] + nx * d, p[1] + ny * d];
  });
}

export function midOfPolyline(poly) {
  let total = 0;
  const seg = [];
  for (let i = 0; i < poly.length - 1; i++) {
    const l = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]);
    seg.push(l);
    total += l;
  }
  let want = total / 2;
  let i = 0;
  while (i < seg.length - 1 && want > seg[i]) { want -= seg[i]; i++; }
  const t = seg[i] ? want / seg[i] : 0;
  const a = poly[i];
  const b = poly[i + 1] || poly[i];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  return { p: [a[0] + dx * t, a[1] + dy * t], tan: [dx / L, dy / L], total };
}

/** The straight sides of a plot, longest first — the numbers a buyer
    actually asks for. Fillet chords are excluded. */
export function straightSides(sides) {
  const real = sides.filter((s) => s >= SHORT_EDGE);
  return (real.length ? real : sides).slice().sort((a, b) => b - a);
}

/** "12.12 × 26.48 m", the frontage-by-depth string the Flutter app stores. */
export function dimensionText(sides) {
  const s = straightSides(sides);
  if (!s.length) return '';
  const depth = s[0];
  const front = s[s.length - 1];
  return `${front.toFixed(2)} × ${depth.toFixed(2)} m`;
}

/* ── measurements taken straight off the ring ─────────────────────── */

/** Shoelace area in whatever units the points are in (metres, here). */
export function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return Math.abs(a) / 2;
}

/** Length of every edge, in ring order — the `sides` the plan draws. */
export function edgeLengths(pts) {
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  });
}

function distToSegment(p, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = p[0] - a[0];
  const wy = p[1] - a[1];
  const len2 = vx * vx + vy * vy;
  const t = len2 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
  return Math.hypot(wx - vx * t, wy - vy * t);
}

/**
 * Roughly the largest circle that fits inside the ring, measured from
 * the label point. This is what decides how big a plot number may be
 * drawn before it overruns its own edge, so an approximation from the
 * label outward is exactly the number wanted — an exact inradius
 * computed elsewhere in the polygon would not be.
 */
export function inradiusAt(pts, at) {
  let d = Infinity;
  for (let i = 0; i < pts.length; i++) {
    d = Math.min(d, distToSegment(at, pts[i], pts[(i + 1) % pts.length]));
  }
  return Number.isFinite(d) ? d : 3;
}

/** Angle of the ring's longest edge, in degrees, flipped to stay
    readable. A long thin road polygon lines its own name up this way. */
export function longestEdgeAngle(pts) {
  let best = 0;
  let bestLen = -1;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len > bestLen) {
      bestLen = len;
      best = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    }
  }
  if (best > 90) best -= 180;
  if (best < -90) best += 180;
  return best;
}
