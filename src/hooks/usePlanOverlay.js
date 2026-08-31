// import { useEffect, useRef, useState } from 'react';
// import { SCRIM } from '../theme/tokens';

// /**
//  * Four layers, all pinned to the same ground quad:
//  *
//  *   plan   the drawing itself, flat on the ground, takes the clicks
//  *   scrim  dims the imagery AND the rest of the plan, but not the
//  *          raised plot — it sits between them in the same pane, and
//  *          paint order is DOM order
//  *   walls  the sides of the raised plot, in screen pixels
//  *   lift   a copy of the selected plot and its dimensions, shifted up
//  *          the screen so it stands proud of its own socket
//  */
// export function usePlanOverlay(maps, mapRef, drawRef) {
//   const overlayRef = useRef(null);
//   const [divs, setDivs] = useState(null);

//   useEffect(() => {
//     if (!maps || !mapRef.current) return undefined;

//     const mk = (clickable) => {
//       const el = document.createElement('div');
//       Object.assign(el.style, {
//         position: 'absolute', left: '0', top: '0',
//         transformOrigin: '0 0', willChange: 'transform',
//         pointerEvents: clickable ? 'auto' : 'none',
//       });
//       return el;
//     };

//     const dPlan = mk(true);
//     const dWall = mk(false);
//     const dLift = mk(false);
//     const dScrim = mk(false);
//     Object.assign(dScrim.style, {
//       left: '-60000px', top: '-60000px', width: '120000px', height: '120000px',
//       background: SCRIM, opacity: '0', transition: 'opacity 240ms ease',
//     });

//     class Plan extends maps.OverlayView {
//       onAdd() {
//         this.getPanes().overlayMouseTarget.append(dPlan, dScrim, dWall, dLift);
//       }

//       draw() {
//         drawRef.current(this.getProjection(), dPlan, dScrim, dWall, dLift);
//       }

//       onRemove() {
//         [dPlan, dScrim, dWall, dLift].forEach((el) => el.remove());
//       }
//     }

//     const ov = new Plan();
//     ov.setMap(mapRef.current);
//     overlayRef.current = ov;
//     setDivs({ plan: dPlan, scrim: dScrim, wall: dWall, lift: dLift });

//     return () => {
//       ov.setMap(null);
//       overlayRef.current = null;
//       setDivs(null);
//     };
//   }, [maps, mapRef, drawRef]);

//   return { overlayRef, divs };
// }


import { useEffect, useRef, useState } from 'react';
import { SCRIM } from '../theme/tokens';

/**
 * Four layers, all pinned to the same ground quad:
 *
 *   plan   the drawing itself, flat on the ground, takes the clicks
 *   scrim  dims the imagery AND the rest of the plan, but not the
 *          raised plot — it sits between them in the same pane, and
 *          paint order is DOM order
 *   walls  the sides of the raised plot, in screen pixels
 *   lift   a copy of the selected plot and its dimensions, shifted up
 *          the screen so it stands proud of its own socket
 *
 * Takes the map INSTANCE, not a ref to it. A ref assignment doesn't
 * re-render, so a ref here would leave this effect running exactly once
 * — on the render where the map does not exist yet — and never again.
 */
export function usePlanOverlay(maps, map, drawRef) {
  const overlayRef = useRef(null);
  const [divs, setDivs] = useState(null);

  useEffect(() => {
    if (!maps || !map) return undefined;

    const mk = (clickable) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'absolute', left: '0', top: '0',
        transformOrigin: '0 0', willChange: 'transform',
        pointerEvents: clickable ? 'auto' : 'none',
      });
      return el;
    };

    const dPlan = mk(true);
    const dWall = mk(false);
    const dLift = mk(false);
    const dScrim = mk(false);
    Object.assign(dScrim.style, {
      left: '-60000px', top: '-60000px', width: '120000px', height: '120000px',
      background: SCRIM, opacity: '0', transition: 'opacity 240ms ease',
    });

    class Plan extends maps.OverlayView {
      onAdd() {
        this.getPanes().overlayMouseTarget.append(dPlan, dScrim, dWall, dLift);
      }

      draw() {
        drawRef.current(this.getProjection(), dPlan, dScrim, dWall, dLift);
      }

      onRemove() {
        [dPlan, dScrim, dWall, dLift].forEach((el) => el.remove());
      }
    }

    const ov = new Plan();
    ov.setMap(map);
    overlayRef.current = ov;
    setDivs({ plan: dPlan, scrim: dScrim, wall: dWall, lift: dLift });

    return () => {
      ov.setMap(null);
      overlayRef.current = null;
      setDivs(null);
    };
  }, [maps, map, drawRef]);

  return { overlayRef, divs };
}