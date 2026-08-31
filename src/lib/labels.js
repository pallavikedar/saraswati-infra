/** "9 Meter Wide Road" rather than the CAD's "9 MT. WIDE ROAD" */
export function roadLabelText(r) {
  const t = r.text.toUpperCase();
  if (t.includes('HIGHWAY')) return `${r.w} Meter Wide State Highway (SH-347)`;
  if (t.includes('SERVICE')) return `${r.w} Meter Wide Service Road`;
  return `${r.w} Meter Wide Road`;
}

/**
 * How large a plot number can be drawn before it overruns the plot edge.
 * `ir` is the radius of the largest circle fitting inside the plot. The
 * plan sits on the ground, so the number is sized in metres and simply
 * gets bigger as you zoom in, the way printed type would.
 */
export function fittedNumberSize(plot, preferred) {
  const budget = (plot.ir || 3) / Math.hypot(0.29 * plot.name.length, 0.35);
  return Math.min(preferred, budget);
}
