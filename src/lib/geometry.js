// export function pathWithHoles(pts, holes) {
//   const ring = (r) => `M${r.map((p) => `${p[0]} ${p[1]}`).join('L')}Z`;
//   return [ring(pts), ...(holes || []).map(ring)].join(' ');
// }

// export function centroid(pts) {
//   let a = 0;
//   let x = 0;
//   let y = 0;
//   for (let i = 0; i < pts.length; i++) {
//     const [x0, y0] = pts[i];
//     const [x1, y1] = pts[(i + 1) % pts.length];
//     const f = x0 * y1 - x1 * y0;
//     a += f;
//     x += (x0 + x1) * f;
//     y += (y0 + y1) * f;
//   }
//   if (Math.abs(a) < 1e-9) {
//     const n = pts.length;
//     return [
//       pts.reduce((s, p) => s + p[0], 0) / n,
//       pts.reduce((s, p) => s + p[1], 0) / n,
//     ];
//   }
//   a *= 0.5;
//   return [x / (6 * a), y / (6 * a)];
// }

// /** outward-facing normal of edge p1->p2, away from the plot centre */
// export function outwardNormal(p1, p2, c) {
//   let nx = -(p2[1] - p1[1]);
//   let ny = p2[0] - p1[0];
//   const len = Math.hypot(nx, ny) || 1;
//   nx /= len;
//   ny /= len;
//   const mx = (p1[0] + p2[0]) / 2;
//   const my = (p1[1] + p2[1]) / 2;
//   if (nx * (c[0] - mx) + ny * (c[1] - my) > 0) { nx = -nx; ny = -ny; }
//   return [nx, ny];
// }

// /* CAD fillets arrive as a run of ~0.3 m chords, so a naive
//    one-line-per-edge overlay draws thirty dimension lines around a single
//    rounded corner. Edges are grouped first: anything shorter than
//    SHORT_EDGE is part of a curve, consecutive curve chords collapse into
//    one run, and that run is dimensioned as a single offset arc carrying
//    its total length. */
// export const SHORT_EDGE = 1.0;
// export const MIN_RUN = 0.6;

// export function buildRuns(pts, sides, c) {
//   const n = pts.length;
//   const segs = pts.map((p1, i) => ({
//     p1,
//     p2: pts[(i + 1) % n],
//     len: sides[i],
//     nrm: outwardNormal(p1, pts[(i + 1) % n], c),
//   }));

//   const runs = [];
//   let curve = null;
//   segs.forEach((s) => {
//     if (s.len >= SHORT_EDGE) {
//       if (curve) { runs.push(curve); curve = null; }
//       runs.push({ curved: false, segs: [s], len: s.len });
//     } else {
//       if (!curve) curve = { curved: true, segs: [], len: 0 };
//       curve.segs.push(s);
//       curve.len += s.len;
//     }
//   });
//   if (curve) runs.push(curve);

//   // a curve that wraps the start of the ring is one run, not two
//   if (runs.length > 1 && runs[0].curved && runs[runs.length - 1].curved) {
//     const tail = runs.pop();
//     runs[0] = {
//       curved: true,
//       segs: [...tail.segs, ...runs[0].segs],
//       len: tail.len + runs[0].len,
//     };
//   }
//   return runs.filter((r) => r.len >= MIN_RUN);
// }

// export function offsetRun(run, off) {
//   const poly = [run.segs[0].p1, ...run.segs.map((s) => s.p2)];
//   const nrm = run.segs.map((s) => s.nrm);
//   return poly.map((p, i) => {
//     const a = nrm[Math.max(0, i - 1)];
//     const b = nrm[Math.min(nrm.length - 1, i)];
//     let nx = a[0] + b[0];
//     let ny = a[1] + b[1];
//     const L = Math.hypot(nx, ny) || 1;
//     nx /= L;
//     ny /= L;
//     const cosHalf = Math.max(0.4, a[0] * nx + a[1] * ny);
//     const d = off / cosHalf;
//     return [p[0] + nx * d, p[1] + ny * d];
//   });
// }

// export function midOfPolyline(poly) {
//   let total = 0;
//   const seg = [];
//   for (let i = 0; i < poly.length - 1; i++) {
//     const l = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]);
//     seg.push(l);
//     total += l;
//   }
//   let want = total / 2;
//   let i = 0;
//   while (i < seg.length - 1 && want > seg[i]) { want -= seg[i]; i++; }
//   const t = seg[i] ? want / seg[i] : 0;
//   const a = poly[i];
//   const b = poly[i + 1] || poly[i];
//   const dx = b[0] - a[0];
//   const dy = b[1] - a[1];
//   const L = Math.hypot(dx, dy) || 1;
//   return { p: [a[0] + dx * t, a[1] + dy * t], tan: [dx / L, dy / L], total };
// }

// /** The straight sides of a plot, longest first — the numbers a buyer
//     actually asks for. Fillet chords are excluded. */
// export function straightSides(sides) {
//   const real = sides.filter((s) => s >= SHORT_EDGE);
//   return (real.length ? real : sides).slice().sort((a, b) => b - a);
// }

// /** "12.12 × 26.48 m", the frontage-by-depth string the Flutter app stores. */
// export function dimensionText(sides) {
//   const s = straightSides(sides);
//   if (!s.length) return '';
//   const depth = s[0];
//   const front = s[s.length - 1];
//   return `${front.toFixed(2)} × ${depth.toFixed(2)} m`;
// }

// /* ── measurements taken straight off the ring ─────────────────────── */

// /** Shoelace area in whatever units the points are in (metres, here). */
// export function polygonArea(pts) {
//   let a = 0;
//   for (let i = 0; i < pts.length; i++) {
//     const [x0, y0] = pts[i];
//     const [x1, y1] = pts[(i + 1) % pts.length];
//     a += x0 * y1 - x1 * y0;
//   }
//   return Math.abs(a) / 2;
// }

// /** Length of every edge, in ring order — the `sides` the plan draws. */
// export function edgeLengths(pts) {
//   return pts.map((p, i) => {
//     const q = pts[(i + 1) % pts.length];
//     return Math.hypot(q[0] - p[0], q[1] - p[1]);
//   });
// }

// function distToSegment(p, a, b) {
//   const vx = b[0] - a[0];
//   const vy = b[1] - a[1];
//   const wx = p[0] - a[0];
//   const wy = p[1] - a[1];
//   const len2 = vx * vx + vy * vy;
//   const t = len2 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
//   return Math.hypot(wx - vx * t, wy - vy * t);
// }

// /**
//  * Roughly the largest circle that fits inside the ring, measured from
//  * the label point. This is what decides how big a plot number may be
//  * drawn before it overruns its own edge, so an approximation from the
//  * label outward is exactly the number wanted — an exact inradius
//  * computed elsewhere in the polygon would not be.
//  */
// export function inradiusAt(pts, at) {
//   let d = Infinity;
//   for (let i = 0; i < pts.length; i++) {
//     d = Math.min(d, distToSegment(at, pts[i], pts[(i + 1) % pts.length]));
//   }
//   return Number.isFinite(d) ? d : 3;
// }

// /** Angle of the ring's longest edge, in degrees, flipped to stay
//     readable. A long thin road polygon lines its own name up this way. */
// export function longestEdgeAngle(pts) {
//   let best = 0;
//   let bestLen = -1;
//   for (let i = 0; i < pts.length; i++) {
//     const a = pts[i];
//     const b = pts[(i + 1) % pts.length];
//     const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
//     if (len > bestLen) {
//       bestLen = len;
//       best = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
//     }
//   }
//   if (best > 90) best -= 180;
//   if (best < -90) best += 180;
//   return best;
// }





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

/* ── WHAT A SIDE MEASURES TO ─────────────────────────────────────────
   A SHEET DIMENSIONS TO THE CORNER, NOT TO THE FILLET. A 12 m frontage
   with a 1 m radius at each end is written 12 m on the plan and on the
   sale agreement, and its straight part is only 10 m. Measuring the
   straight part is what makes every figure here read short against the
   customer's own copy of the drawing, and what stops opposite sides
   adding up across a row of plots.

   So each straight run is carried on along its own line until it meets
   the line of the next straight run, and the length reported is between
   those two THEORETICAL CORNERS. Where two straight sides already meet
   at a sharp vertex the intersection is that vertex, so nothing changes.

   EXTEND_MAX is the guard. Two nearly parallel sides intersect a long
   way off, and without a cap one bad pair would print a 400 m frontage;
   past this the run keeps its own endpoint. A fillet radius is metres,
   so 4 m is generous.

   CORNER_TURN_MIN keeps the extension off ends that are not corners at
   all — a run that continues almost straight into the next one has
   nothing to extend to.

   Set `corners: false` in the options to go back to measuring only the
   straight part. */
const EXTEND_MAX = 4.0;
const CORNER_TURN_MIN = 8 * (Math.PI / 180);
const CORNER_TURN_MAX = 172 * (Math.PI / 180);

/* A fillet corner turns about 90°. Two fillets either side of a short
   straight side used to collapse into ONE run — anything under
   SHORT_EDGE counted as a curve chord, including a genuine 0.8 m side —
   and the figure printed was the sum of both arcs and the side between
   them. A run is closed once it has turned more than this, so the two
   corners stay two corners. */
const MAX_RUN_TURN = 135 * (Math.PI / 180);

const TAU = Math.PI * 2;
const wrapPi = (a) => (((a + Math.PI) % TAU) + TAU) % TAU - Math.PI;
const dirOf = (s) => Math.atan2(s.p2[1] - s.p1[1], s.p2[0] - s.p1[0]);

/** Where two infinite lines cross: p along d, q along e. Null if they
    are parallel enough that the answer is meaningless. */
function lineCross(p, d, q, e) {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return [p[0] + d[0] * t, p[1] + d[1] * t];
}

/**
 * The plot's sides, grouped for dimensioning.
 *
 * `sides` is trusted only where it agrees with the ring it came with:
 * a figure that disagrees with the drawn geometry by more than a few
 * per cent is a data problem, and printing it next to a line of a
 * different length is worse than printing the line's own length.
 *
 * opts.corners  extend straight runs to their theoretical corners
 *               (default true — see EXTEND_MAX above)
 * opts.arcs     also dimension the fillet runs themselves (default
 *               false when corners are being extended, because the arc
 *               then sits inside a dimension that already spans it, and
 *               the two figures read as a contradiction)
 */
export function buildRuns(pts, sides, c, opts) {
  const corners = !opts || opts.corners !== false;
  const arcs = opts && opts.arcs !== undefined ? opts.arcs : !corners;

  const n = pts.length;
  const geo = edgeLengths(pts);
  const segs = pts.map((p1, i) => {
    const p2 = pts[(i + 1) % n];
    const given = sides && Number.isFinite(sides[i]) ? sides[i] : null;
    const trust = given !== null && Math.abs(given - geo[i]) <= Math.max(0.02, geo[i] * 0.03);
    const s = { p1, p2, len: trust ? given : geo[i], nrm: outwardNormal(p1, p2, c) };
    s.dir = dirOf(s);
    return s;
  });

  const runs = [];
  let curve = null;
  const closeCurve = () => { if (curve) { runs.push(curve); curve = null; } };

  segs.forEach((s) => {
    if (s.len >= SHORT_EDGE) {
      closeCurve();
      runs.push({ curved: false, segs: [s], len: s.len, turn: 0 });
      return;
    }
    if (curve) {
      const prev = curve.segs[curve.segs.length - 1];
      const turn = Math.abs(wrapPi(s.dir - prev.dir));
      if (curve.turn + turn > MAX_RUN_TURN) closeCurve();
      else curve.turn += turn;
    }
    if (!curve) curve = { curved: true, segs: [], len: 0, turn: 0 };
    curve.segs.push(s);
    curve.len += s.len;
  });
  closeCurve();

  // a curve that wraps the start of the ring is one run, not two
  if (runs.length > 1 && runs[0].curved && runs[runs.length - 1].curved) {
    const tail = runs[runs.length - 1];
    const join = Math.abs(wrapPi(runs[0].segs[0].dir - tail.segs[tail.segs.length - 1].dir));
    if (tail.turn + runs[0].turn + join <= MAX_RUN_TURN) {
      runs.pop();
      runs[0] = {
        curved: true,
        segs: [...tail.segs, ...runs[0].segs],
        len: tail.len + runs[0].len,
        turn: tail.turn + runs[0].turn + join,
      };
    }
  }

  /* Every run carries the polyline it is DRAWN along and the ends its
     extension lines come off, so the offset line, the ticks and the
     printed figure can never describe different spans. */
  runs.forEach((r) => {
    r.p1 = r.segs[0].p1;
    r.p2 = r.segs[r.segs.length - 1].p2;
    r.poly = [r.segs[0].p1, ...r.segs.map((s) => s.p2)];
    r.nrm = r.segs.map((s) => s.nrm);
  });

  if (corners) {
    const straight = runs.filter((r) => !r.curved);

    /* Each end reaches for the next STRAIGHT run round the ring, so a
       fillet — or a whole rounded corner made of thirty chords — is
       stepped over rather than measured. */
    straight.forEach((r, i) => {
      const s0 = r.segs[0];
      const s1 = r.segs[r.segs.length - 1];
      const d = [Math.cos(s1.dir), Math.sin(s1.dir)];
      const prev = straight[(i - 1 + straight.length) % straight.length];
      const next = straight[(i + 1) % straight.length];

      const reach = (from, other, dir, sign) => {
        if (!other || other === r) return from;
        const o = sign > 0 ? other.segs[0] : other.segs[other.segs.length - 1];
        const turn = Math.abs(wrapPi(o.dir - s1.dir));
        if (turn < CORNER_TURN_MIN || turn > CORNER_TURN_MAX) return from;
        const x = lineCross(from, dir, o.p1, [Math.cos(o.dir), Math.sin(o.dir)]);
        if (!x) return from;
        return Math.hypot(x[0] - from[0], x[1] - from[1]) <= EXTEND_MAX ? x : from;
      };

      r.c1 = reach(s0.p1, prev, [Math.cos(s0.dir), Math.sin(s0.dir)], -1);
      r.c2 = reach(s1.p2, next, d, +1);
      r.len = Math.hypot(r.c2[0] - r.c1[0], r.c2[1] - r.c1[1]);
      r.p1 = r.c1;
      r.p2 = r.c2;
      r.poly = [r.c1, r.c2];
      r.nrm = [s1.nrm];
    });
  }

  return runs.filter((r) => r.len >= MIN_RUN && (arcs || !r.curved));
}

export function offsetRun(run, off) {
  const poly = run.poly || [run.segs[0].p1, ...run.segs.map((s) => s.p2)];
  const nrm = run.nrm || run.segs.map((s) => s.nrm);
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
    actually asks for. Fillet chords are excluded.

    NOTE these are the straight parts only, not the corner-to-corner
    figures buildRuns prints. For the two to agree, feed this
    `buildRuns(pts, sides, centroid(pts)).map((r) => r.len)` instead of
    the raw `sides` array. */
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