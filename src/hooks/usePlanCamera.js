import { useEffect, useRef, useState } from 'react';
import { D2R } from '../lib/units';
import { MAX_TILT, REST_TILT, SPIN_RATE } from '../theme/tokens';

/**
 * The view the raised plot is seen from.
 *
 * The camera turns the MAP CONTAINER, not the plan. Imagery, roads,
 * plots and the raised block all sit on one element and turn as a single
 * piece — no vector renderer, and nothing can drift out of register
 * because there is only one transform.
 *
 * Kept in a ref so the draw loop reads it without a re-render; state is
 * bumped only to re-run the effects that care.
 */
export function usePlanCamera({ selectedRef, hostRef, overlayRef }) {
  const camRef = useRef({ spin: 0, tilt: 0 });
  const touched = useRef(0);
  const spinRef = useRef(false);
  const [spin, setSpin] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => { spinRef.current = spin; }, [spin]);

  useEffect(() => {
    let raf;
    const want = () => (selectedRef.current ? REST_TILT : 0);
    const step = () => {
      raf = requestAnimationFrame(step);
      const c = camRef.current;
      let moved = false;

      const d = want() - c.tilt;
      if (Math.abs(d) > 0.002) { c.tilt += d * 0.12; moved = true; }
      else if (c.tilt !== want()) { c.tilt = want(); moved = true; }

      // the 360 waits until you have taken your hands off
      if (selectedRef.current && spinRef.current && Date.now() - touched.current > 900) {
        c.spin += SPIN_RATE;
        moved = true;
      }
      if (!selectedRef.current && c.spin !== 0) {
        c.spin *= 0.9;
        if (Math.abs(c.spin) < 0.003) c.spin = 0;
        moved = true;
      }

      if (moved) {
        if (hostRef.current) {
          hostRef.current.style.transform =
            `scaleY(${Math.cos(c.tilt).toFixed(5)}) rotate(${(c.spin / D2R).toFixed(3)}deg)`;
        }
        if (overlayRef.current) overlayRef.current.draw();
        bump((n) => n + 1);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [selectedRef, hostRef, overlayRef]);

  const faceNorth = () => {
    setSpin(false);
    camRef.current.spin = 0;
    touched.current = Date.now();
    if (overlayRef.current) overlayRef.current.draw();
    bump((n) => n + 1);
  };

  return { camRef, touched, spin, setSpin, faceNorth, bump, MAX_TILT };
}
