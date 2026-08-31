/* A plane seen through a map projection is still a plane, so the whole
   SVG rides on one CSS matrix — every plot, number and dimension moves
   together, stays crisp vector, and still takes clicks. */

export const adj3 = (m) => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];

export function mul3(a, b) {
  const c = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = s;
    }
  }
  return c;
}

export const mulv = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

export function basis(x1, y1, x2, y2, x3, y3, x4, y4) {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const v = mulv(adj3(m), [x4, y4, 1]);
  return mul3(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/** The CSS matrix3d that lands a w×h box on the four ground points. */
export function quadMatrix(w, h, p1, p2, p3, p4) {
  const t = mul3(
    basis(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y),
    adj3(basis(0, 0, w, 0, 0, h, w, h)),
  );
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  return [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]];
}
