
import React, {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';

import PlanContent from './PlanContent';
import DimensionOverlay from './DimensionOverlay';
import CameraControls from './CameraControls';
import FilterPanel from './FilterPanel';
import StatusLegend from './StatusLegend';
import MapToggles from './Maptoggles';

import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { usePlanCamera } from '../../hooks/usePlanCamera';
import { usePlanOverlay } from '../../hooks/usePlanOverlay';

import { GOOGLE_MAP_STYLE_ID, PAD, MAX_SHEET } from '../../config/site';
import { clamp } from '../../lib/units';
import { quadMatrix } from '../../lib/matrix';
import { pathWithHoles } from '../../lib/geometry';
import { EMPTY_FILTERS } from '../../lib/filters';
import {
  ACCENT, CANVAS, HAIR, LIFT_H, MAX_TILT, MONO,
  SEL_STROKE, SELECTED_FILL, WALL_EDGE, WALL_FILL,
} from '../../theme/tokens';
import '../../styles/home.css';

export const DOWN_MS = 190;   // the old plot sinking
export const UP_MS = 430;     // the new one rising
export const FLY_MS = 6200;    // the camera closing in on a pick
export const easeOut = (t) => 1 - (1 - t) ** 3;

/* The close-up.

   GUTTER is clear ground kept around the plot for the dimension
   figures, in METRES — those stand off the edge by a fixed ground
   distance whatever the plot's size, so a small plot needs a bigger
   share of the screen than a big one, and a percentage would get it
   wrong at both ends. Too low and DimensionOverlay's figures clip.

   CLOSE_BOOST is how much closer than a bare fit the camera goes. 1.0
   is the fit itself — plot plus gutter exactly filling the frame. Above
   that it pushes in and the outermost figures sit nearer the edges,
   which is the trade: legible numbers against seeing the whole plot at
   once. This is the knob to turn if a pick is not close enough; leave
   the fit maths alone. Around 1.35 the plot starts outgrowing the frame.

   SLACK keeps the drawing off the glass.

   LIFT_BIAS sits the plot low by that fraction of the block's reach so
   the RAISED block finishes centred instead of crowding the top edge;
   set it to 0 if your camera stays flat on a pick.

   FLY_MIN_Z is a floor, not a target — it exists so a huge plot cannot
   pull the camera out to nothing. FLY_MAX_Z must not exceed MAP_MAX_Z
   or the fit is silently clamped and small plots stop getting closer.
   Past about 21 the satellite imagery has no more detail and Google
   upscales it: the overlay and its dimensions stay sharp, the photo
   behind them goes soft. 22 is the honest ceiling if that matters to
   the client; 24 if legibility of the figures wins. */
const GUTTER = 0.9;
const CLOSE_BOOST = 1.0;
const SLACK = 1.02;
const LIFT_BIAS = 0.5;
const FLY_MIN_Z = 17;
const FLY_MAX_Z = 24;
const MAP_MAX_Z = 24;

/* How far the camera must be off square before the container counts as
   turned. Below this the transform is visually identity, so the
   oversizing can be dropped and the map left at its natural size. */
const TURNED_EPS = 0.001;

/* Clear ground kept around the whole layout when framing it, in screen
   px. Asymmetric because the logo header sits over the top of the map
   and the action bar over the bottom: the plan is pushed clear of both
   rather than left to hide underneath. The narrow set is for phones,
   where side padding is the difference between a readable plan and a
   postage stamp — measure your own header and bar and match these. */
const FIT_PAD = { top: 110, right: 40, bottom: 50, left: 40 };
const FIT_PAD_NARROW = { top: 76, right: 6, bottom: 64, left: 6 };
const NARROW_PX = 600;

/**
 * Map + plan. The map owns pan and zoom; the plan is one div riding an
 * OverlayView, warped onto the ground each frame.
 *
 * The map instance is kept in BOTH a ref (for the parent, and for the
 * event handlers that must not re-bind) and in state. The state copy is
 * what tells the overlay hook the map exists: a ref assignment does not
 * re-render, so without it the overlay is built on the one render where
 * mapRef.current is still null and never gets built again.
 *
 * SELECTED is what the user has chosen; SHOWN is what is currently
 * standing up. They differ for the length of a swap: the old plot has to
 * finish sinking before the new one is allowed to rise, or the block
 * appears to teleport across the layout.
 *
 * ROTATING THE WHOLE LAYOUT, with nothing raised, is a gesture rather
 * than a mode: two fingers on a touch screen, shift-drag or right-drag
 * on a desktop. It cannot share the one-finger drag, because the map
 * already owns that for panning and one gesture cannot mean both. Finger
 * count is the split every map app uses, so nobody has to be told.
 *
 * With a plot raised the whole surface orbits on a plain drag, as
 * before — there is nothing else the gesture could mean once the layout
 * is dimmed behind a single lit plot.
 *
 * Either way the camera turns the map CONTAINER, which has two
 * consequences, both handled below: the container has to be bigger than
 * the viewport or its corners swing into view, and Google's own pointer
 * maths doesn't know about the transform — so dragging and wheel zoom
 * are taken over for the duration.
 *
 * A pick FLIES the camera in: the chosen plot is brought to the middle
 * of the view and closed in on until the plot and the dimension figures
 * around it fill the screen. See flyTo.
 *
 * The OPENING view is a fit to the PLOTS — see fitPlan. Not a fixed
 * zoom, which frames a laptop and crops a phone, and not the drawing's
 * own bounds, which include margin the customer did not come to see.
 *
 * FILTERS live here rather than in App because everything they need —
 * the layout, and the match set the plan is already drawn against — is
 * here. The panel narrows on top of whatever `matches` the parent sends
 * down, so the toolbar search and the panel stack instead of fighting.
 */
export default function PlanMap({
  layout, selected, onSelect, matches, status, mapRef, onReady,
  showNumbers, setShowNumbers, showStatus, setShowStatus, reserve,
}) {
  const viewRef = useRef(null);
  const hostRef = useRef(null);
  const selRef = useRef(null);
  const shownRef = useRef(null);
  const riseRef = useRef(0);
  const drawRef = useRef(() => {});
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const wheelRef = useRef(0);
  const flyRef = useRef(0);
  const winRef = useRef(null);

  const [pad, setPad] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(null);
  const [walls, setWalls] = useState(null);
  const [map, setMap] = useState(null);
  const [shown, setShown] = useState(null);
  const [win, setWin] = useState(() => ({ ...layout.bounds, s: 1 }));

  const [showFilters, setShowFilters] = useState(false);
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filterHits, setFilterHits] = useState(null);

  /* True once the camera is off square, whether by gesture or by a
     pick. It drives the container oversizing and whether the reset
     control is offered — a free rotation with no way back to north
     would be a trap. State, not a ref, because the render has to react
     to it; the camera itself stays in camRef and is read per frame. */
  const [turned, setTurned] = useState(false);

  /* The two view switches. App owns them when it passes setters down —
     then the toolbar and these toggles stay in step. When it doesn't,
     the flags live here instead, so the switches work on their own
     rather than calling undefined and doing nothing. */
  const [ownNumbers, setOwnNumbers] = useState(showNumbers !== false);
  const [ownStatus, setOwnStatus] = useState(!!showStatus);
  const numbersOn = setShowNumbers ? showNumbers : ownNumbers;
  const statusOn = setShowStatus ? showStatus : ownStatus;
  const toggleNumbers = setShowNumbers || setOwnNumbers;
  const toggleStatus = setShowStatus || setOwnStatus;

  const { maps, error } = useGoogleMaps();
  const { overlayRef, divs } = usePlanOverlay(maps, map, drawRef);
  const {
    camRef, touched, spin, setSpin, faceNorth, bump,
  } = usePlanCamera({ selectedRef: selRef, hostRef, overlayRef });

  const { toLL, toDraw, bounds } = layout;

  const plots = useMemo(() => [...layout.byName.values()], [layout]);

  /* Screen edges that are spoken for — the details panel, and anything
     else sitting over the map. Broken apart and re-assembled because a
     parent passing `reserve={{ right: 340 }}` inline hands us a new
     object every render, and flyTo would then re-aim on every render
     rather than when the space actually changed. */
  const { left: rl = 0, right: rr = 0, top: rt = 0, bottom: rb = 0 } = reserve || {};
  const inset = useMemo(
    () => ({ left: rl, right: rr, top: rt, bottom: rb }),
    [rl, rr, rt, rb],
  );

  /* Search and filter both narrow, so they intersect. Null from both
     means nothing is narrowed and PlanContent dims nothing. */
  const shownMatches = useMemo(() => {
    if (matches && filterHits) {
      return new Set([...matches].filter((n) => filterHits.has(n)));
    }
    return matches || filterHits;
  }, [matches, filterHits]);

  const onApplyFilters = useCallback((hits, next) => {
    setFilterHits(hits);
    setDraft(next);
    setShowFilters(false);
    /* a raised plot that no longer matches would stand lit inside a
       dimmed layout, so put it back down */
    if (hits && selRef.current && !hits.has(selRef.current)) onSelect(null);
  }, [onSelect]);

  /* Called after any camera change. Cheap, and it keeps `turned` from
     drifting out of step with camRef, which is the thing that actually
     moves. */
  const syncTurned = useCallback(() => {
    const c = camRef.current;
    const off = Math.abs(c.spin) > TURNED_EPS || c.tilt > TURNED_EPS;
    setTurned((v) => (v === off ? v : off));
  }, [camRef]);

  /* ---------------------------------------------------------------
     Framing the layout. The opening view, and what a "fit" control
     returns to.

     A FIT, not a fixed zoom: one zoom number frames a laptop and crops
     a phone, and is wrong again on a tablet in portrait.

     It fits the PLOTS, not layout.bounds. The drawing's extent runs
     well past the last plot on most CAD exports — sheet border, title
     block, surrounding roads and open ground. Framing that leaves the
     plots as a small island with empty imagery all around, which is
     worst exactly where there is no screen to spare.
  --------------------------------------------------------------- */
  const fitPlan = useCallback((target) => {
    const m = target || mapRef.current;
    const el = viewRef.current;
    if (!m || !el || !maps) return;

    const b = new maps.LatLngBounds();
    let n = 0;
    plots.forEach((p) => {
      (p.pts || []).forEach(([x, y]) => {
        const ll = toLL(x, y);
        b.extend(new maps.LatLng(ll.lat, ll.lng));
        n += 1;
      });
    });

    /* No plots parsed yet — fall back to the sheet, so the map at least
       opens on the right patch of ground. */
    if (n === 0) {
      [[bounds.x0, bounds.y0], [bounds.x1, bounds.y0],
        [bounds.x1, bounds.y1], [bounds.x0, bounds.y1]].forEach(([x, y]) => {
        const ll = toLL(x, y);
        b.extend(new maps.LatLng(ll.lat, ll.lng));
      });
    }

    m.fitBounds(b, el.clientWidth < NARROW_PX ? FIT_PAD_NARROW : FIT_PAD);
  }, [maps, mapRef, plots, bounds, toLL]);

  /* ---------------------------------------------------------------
     Framing a pick — the close-up.

     Picking a plot brings it to you rather than leaving you to go find
     it, and closes in far enough that the dimension figures are
     readable. Centre is the plot's bounding box, not its centroid: an
     L-shaped plot's centroid can sit outside the plot, and the box is
     what actually has to fit on screen.

     The camera turns the CONTAINER about its own centre, and the
     container is padded symmetrically around the viewport, so the map
     centre and the viewport centre are the same point at every heading.
     That is why this can be a plain setCenter and doesn't have to undo
     the spin.

     Zoom is a real fit, not a nudge: what has to be on screen is the
     plot's box PLUS the gutter its dimension figures live in, and the
     camera goes as close as that allows — then CLOSE_BOOST pushes in
     past it. Fitting each axis separately rather than to the short side
     is what makes the close-up close: a wide plot fills the width
     instead of being framed for a height it doesn't have.

     Two corrections on the vertical. The budget is short by
     cos(MAX_TILT), because the tilted container squashes the ground in
     Y — the same factor the lift and the pad calculation use. And the
     block's reach, LIFT_H·sin(MAX_TILT) metres' worth of screen, is
     spent entirely upward, so it is reserved in the fit and then half
     of it is given back as a downward bias on the aim point.

     One thing worth knowing if this ever seems not to move: the whole
     flight is skipped when the camera is already there (`still`). That
     is right for a re-pick of the same plot, but it means a fit that
     computes a zoom close to the current one produces no visible
     motion — which reads as "it didn't work" rather than "there was
     nothing to do".
  --------------------------------------------------------------- */
  const flyTo = useCallback((name) => {
    const m = mapRef.current;
    const el = viewRef.current;
    const plot = name && layout.byName.get(name);
    if (!m || !el || !plot || !plot.pts.length) return;

    const xs = plot.pts.map((p) => p[0]);
    const ys = plot.pts.map((p) => p[1]);
    const x0 = Math.min(...xs); const x1 = Math.max(...xs);
    const y0 = Math.min(...ys); const y1 = Math.max(...ys);
    const to = toLL((x0 + x1) / 2, (y0 + y1) / 2);
    const world = 156543.03392 * Math.cos((to.lat * Math.PI) / 180);
    const lift = LIFT_H * Math.sin(MAX_TILT);      // the block's reach, in ground metres

    const needW = (x1 - x0 + GUTTER * 2) * SLACK;
    const needH = (y1 - y0 + GUTTER * 2) * SLACK + lift;

    /* The reserve is honoured, but never allowed to starve the fit: a
       panel wider than the viewport would otherwise drive availW toward
       the floor and hold the camera back on every pick. Half the
       viewport is the most any chrome may claim. */
    const availW = Math.max(
      el.clientWidth - Math.min(inset.left + inset.right, el.clientWidth * 0.5),
      160,
    );
    const availH = Math.max(
      (el.clientHeight - Math.min(inset.top + inset.bottom, el.clientHeight * 0.5))
        * Math.cos(MAX_TILT),
      160,
    );

    /* metres per pixel wanted, then divided down to push in past the
       bare fit — see CLOSE_BOOST */
    const mpp = Math.max(needW / availW, needH / availH) / CLOSE_BOOST;
    const z1 = clamp(Math.log2(world / mpp), FLY_MIN_Z, FLY_MAX_Z);

    /* Aim at the middle of what is actually VISIBLE, not the middle of
       the viewport, and sit low by half the lift so the risen block
       lands centred. Both are offsets the CENTRE must make in screen
       px; the container is rotated by spin and squashed in Y by
       cos(tilt), so they are run back through that transform to become
       container px, then divided by the scale to become world units. */
    let aim = to;
    const proj = m.getProjection();
    if (proj) {
      const scale = 2 ** z1;
      const risePx = (lift * scale) / world;
      const sx = (inset.right - inset.left) / 2;
      const sy = (inset.bottom - inset.top) / 2 - risePx * LIFT_BIAS;
      const s = camRef.current.spin;
      const ct = Math.cos(MAX_TILT);
      const cx = sx * Math.cos(s) + (sy / ct) * Math.sin(s);
      const cy = (sy / ct) * Math.cos(s) - sx * Math.sin(s);
      const p = proj.fromLatLngToPoint(new maps.LatLng(to.lat, to.lng));
      const q = proj.fromPointToLatLng(
        new maps.Point(p.x + cx / scale, p.y + cy / scale),
      );
      if (q) aim = { lat: q.lat(), lng: q.lng() };
    }

    const c0 = m.getCenter();
    if (!c0) return;
    const a = { lat: c0.lat(), lng: c0.lng() };
    const z0 = m.getZoom();
    const still = Math.abs(a.lat - aim.lat) < 1e-7
      && Math.abs(a.lng - aim.lng) < 1e-7
      && Math.abs(z1 - z0) < 0.05;
    if (still) return;

    /* Raster hybrid rounds the zoom unless this is on, and a rounded
       zoom mid-flight is a staircase instead of a glide. maxZoom is set
       alongside because the fit above can ask for more than the map was
       constructed with, and the lower of the two silently wins — which
       looks like the close-up refusing to get closer on small plots. */
    m.setOptions({ isFractionalZoomEnabled: true, maxZoom: MAP_MAX_Z });

    cancelAnimationFrame(flyRef.current);
    const t0 = performance.now();
    const step = (now) => {
      const t = easeOut(Math.min(1, (now - t0) / FLY_MS));
      const center = {
        lat: a.lat + (aim.lat - a.lat) * t,
        lng: a.lng + (aim.lng - a.lng) * t,
      };
      const z = z0 + (z1 - z0) * t;
      if (typeof m.moveCamera === 'function') m.moveCamera({ center, zoom: z });
      else { m.setZoom(z); m.setCenter(center); }
      if (t < 1) flyRef.current = requestAnimationFrame(step);
    };
    flyRef.current = requestAnimationFrame(step);
  }, [layout, toLL, mapRef, maps, camRef, inset]);

  /* the flight is the user's the moment they touch anything */
  const stopFly = useCallback(() => cancelAnimationFrame(flyRef.current), []);

  useEffect(() => { selRef.current = selected; }, [selected]);
  useEffect(() => { if (!selected) setSpin(false); }, [selected, setSpin]);
  useEffect(() => { if (selected) flyTo(selected); }, [selected, flyTo]);
  useEffect(() => () => cancelAnimationFrame(flyRef.current), []);

  /* A pick turns the camera by itself, and dropping the pick leaves
     whatever heading the user finished on — so `turned` is re-read from
     the camera on both edges rather than assumed. */
  useEffect(() => { syncTurned(); }, [selected, syncTurned]);

  /* Back out to the whole layout when a plot is dismissed, so closing a
     plot returns you to where you can pick the next one instead of
     leaving you zoomed into empty ground. */
  useEffect(() => {
    if (selected || !map) return;
    if (shownRef.current === null) return;   // nothing was ever up
    fitPlan();
  }, [selected, map, fitPlan]);

  /* Re-frame when the screen changes shape — a rotated phone otherwise
     leaves half the layout off the edge. Only while nothing is picked:
     re-framing under someone who has flown in on a plot would throw
     away the view they are working in, and a phone's address bar
     sliding away counts as a resize. */
  useEffect(() => {
    const onResize = () => { if (!selRef.current) fitPlan(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [fitPlan]);

  /* Sink whatever is up, swap the drawn plot, raise the new one. Height
     lives in a ref because it is read inside the draw callback, which
     runs per frame and must not depend on React having re-rendered. */
  useEffect(() => {
    if (selected === shownRef.current) return undefined;
    let raf = 0;

    const ramp = (from, to, ms, then) => {
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        riseRef.current = from + (to - from) * easeOut(t);
        if (overlayRef.current) overlayRef.current.draw();
        bump((n) => n + 1);
        if (t < 1) raf = requestAnimationFrame(step);
        else if (then) then();
      };
      raf = requestAnimationFrame(step);
    };

    const raise = () => {
      shownRef.current = selected;
      setShown(selected);
      if (selected) ramp(0, 1, UP_MS);
      else riseRef.current = 0;
    };

    if (shownRef.current) ramp(riseRef.current, 0, DOWN_MS, raise);
    else raise();

    return () => cancelAnimationFrame(raf);
  }, [selected, overlayRef, bump]);

  /* How much bigger than the viewport the map has to be so that turning
     it never exposes a corner. Inverse-transform the viewport corners
     into container space and take the worst case over all headings.

     Keyed to `turned`, not `selected`: a free rotation turns the same
     container, and without the padding its corners swing into view
     halfway through the gesture. */
  useEffect(() => {
    const fit = () => {
      const el = viewRef.current;
      if (!el) return;
      if (!turned && !selRef.current) { setPad({ x: 0, y: 0 }); return; }
      const W = el.clientWidth;
      const H = el.clientHeight;
      const half = Math.hypot(W / 2, H / (2 * Math.cos(MAX_TILT)));
      setPad({ x: Math.ceil(half - W / 2), y: Math.ceil(half - H / 2) });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [turned, selected]);

  /* the map itself */
  useEffect(() => {
    if (!maps || !hostRef.current) return;
    if (mapRef.current) { setMap(mapRef.current); return; }
    const centre = toLL((bounds.x0 + bounds.x1) / 2, (bounds.y0 + bounds.y1) / 2);
    const m = new maps.Map(hostRef.current, {
      center: centre,
      /* A starting value only — fitPlan overrides it below. The map
         still needs one to construct. */
      zoom: 18,
      mapTypeId: 'hybrid',
      ...(GOOGLE_MAP_STYLE_ID ? { mapId: GOOGLE_MAP_STYLE_ID } : {}),
      tilt: 0,
      heading: 0,
      streetViewControl: false,
      fullscreenControl: false,
      rotateControl: false,
      mapTypeControl: false,
      zoomControlOptions: { position: maps.ControlPosition.RIGHT_BOTTOM },
      gestureHandling: 'greedy',
      /* Must be at least FLY_MAX_Z. The overlay stays sharp well past
         the imagery, and the lower of the two caps wins — a maxZoom
         below the fit's target is the usual reason a close-up stops
         short on small plots. */
      maxZoom: MAP_MAX_Z,
      isFractionalZoomEnabled: true,
      backgroundColor: CANVAS,
    });
    mapRef.current = m;
    setMap(m);

    /* Passed explicitly: mapRef.current was assigned on the line above,
       in this same tick, and fitPlan reading it back is a race.

       Fitted twice on purpose. The first call frames it immediately;
       the container may still be settling to its final height at that
       moment (fonts, the header laying out, a phone's address bar), and
       a fit against the wrong height leaves the plan small and off
       centre. The second runs once the map is idle, against the real
       size, and is skipped if a plot has already been picked. */
    fitPlan(m);
    maps.event.addListenerOnce(m, 'idle', () => {
      if (!selRef.current) fitPlan(m);
    });

    onReady();
  }, [maps, mapRef, toLL, bounds, onReady, fitPlan]);

  useLayoutEffect(() => {
    winRef.current = win;
    if (overlayRef.current) overlayRef.current.draw();
  }, [win, overlayRef]);

  /* ---------------------------------------------------------------
     Only ever draw the part of the plan you can actually see, at the
     size it appears on screen.

     Drawing the whole half-kilometre onto one sheet and letting the
     transform blow it up does not work: a sheet is rasterised once at
     its own pixel size, so at zoom 21 it would need to be ~6800 px wide
     and it doubles every step after that — past the cap everything turns
     to mush, worst on whatever is largest on screen. Here the window
     follows the viewport and its pixel size follows the zoom, so the
     transform's scale stays at 1.0 forever and every glyph is rendered
     at its final size. Fewer plots per frame, too. The window is padded
     well past the edges so ordinary panning doesn't touch it.
  --------------------------------------------------------------- */
  useEffect(() => {
    drawRef.current = (proj, dPlan, dScrim, dWall, dLift) => {
      if (!proj || !hostRef.current || !winRef.current) return;

      const px = ([x, y]) => {
        const ll = toLL(x, y);
        const q = proj.fromLatLngToDivPixel(new maps.LatLng(ll.lat, ll.lng));
        return { x: q.x, y: q.y };
      };
      const ref = px([0, 0]);
      const refX = px([100, 0]);
      const pxPerM = Math.hypot(refX.x - ref.x, refX.y - ref.y) / 100;
      if (!(pxPerM > 0)) return;

      /* what the viewport covers, back in drawing metres */
      const W = hostRef.current.clientWidth;
      const H = hostRef.current.clientHeight;
      const seen = [[0, 0], [W, 0], [0, H], [W, H]].map(([cx, cy]) => {
        const ll = proj.fromContainerPixelToLatLng(new maps.Point(cx, cy));
        return toDraw(ll.lat(), ll.lng());
      });
      const padX = (W / pxPerM) * 0.35;
      const padY = (H / pxPerM) * 0.35;
      const nw = {
        x0: clamp(Math.min(...seen.map((q) => q[0])) - padX, bounds.x0 - PAD, bounds.x1 + PAD),
        y0: clamp(Math.min(...seen.map((q) => q[1])) - padY, bounds.y0 - PAD, bounds.y1 + PAD),
        x1: clamp(Math.max(...seen.map((q) => q[0])) + padX, bounds.x0 - PAD, bounds.x1 + PAD),
        y1: clamp(Math.max(...seen.map((q) => q[1])) + padY, bounds.y0 - PAD, bounds.y1 + PAD),
        s: pxPerM,
      };
      const cur = winRef.current;

      /* Re-render only when the view has genuinely left the window, or
         the zoom has moved enough to matter. Everything in between rides
         the transform, which is what keeps panning cheap. A flight
         crosses this threshold once or twice on the way in — widen the
         rescale band if that shows up as a flicker on slow machines. */
      const outside = nw.x0 < cur.x0 - 0.01 || nw.y0 < cur.y0 - 0.01
        || nw.x1 > cur.x1 + 0.01 || nw.y1 > cur.y1 + 0.01;
      const rescaled = pxPerM / cur.s > 1.12 || pxPerM / cur.s < 0.55;
      if (outside || rescaled) { setWin(nw); return; }

      /* the window's own pixel size, held to a sane texture budget */
      const spanX = cur.x1 - cur.x0;
      const spanY = cur.y1 - cur.y0;
      const s = Math.min(cur.s, MAX_SHEET / Math.max(spanX, spanY));
      const wpx = spanX * s;
      const hpx = spanY * s;

      const q1 = px([cur.x0, cur.y0]);
      const q2 = px([cur.x1, cur.y0]);
      const q3 = px([cur.x0, cur.y1]);
      const q4 = px([cur.x1, cur.y1]);
      const m = `matrix3d(${quadMatrix(wpx, hpx, q1, q2, q3, q4).join(',')})`;

      /* the scrim follows the SELECTION, so it doesn't blink off and on
         mid-swap; the block follows what is actually drawn */
      const sel = shownRef.current && layout.byName.get(shownRef.current);
      dScrim.style.opacity = selRef.current ? '1' : '0';
      dPlan.style.transform = m;

      if (!sel) {
        dLift.style.transform = m;
        setWalls(null);
        return;
      }

      /* The container is what turns, so the lift has to be expressed in
         container coordinates: take the straight-up screen offset the
         block needs and run it back through the camera. Otherwise the
         block would rise sideways as soon as you turned the view. */
      const cam = camRef.current;
      const ct = Math.cos(cam.tilt);
      const rise = LIFT_H * pxPerM * Math.sin(cam.tilt) * riseRef.current;
      if (rise < 0.5) {
        dLift.style.transform = m;
        setWalls(null);
        return;
      }
      const up = {
        x: (-rise / ct) * Math.sin(cam.spin),
        y: (-rise / ct) * Math.cos(cam.spin),
      };
      dLift.style.transform = `translate(${up.x}px, ${up.y}px) ${m}`;

      /* Walls live in screen pixels, in a box sized exactly to them — a
         0×0 SVG leaning on overflow gets rasterised at nothing and comes
         out soft, which is what fringes the raised block. */
      const ring = sel.pts.map(px);
      const all = ring.concat(ring.map((q) => ({ x: q.x + up.x, y: q.y + up.y })));
      const bx0 = Math.floor(Math.min(...all.map((q) => q.x))) - 2;
      const by0 = Math.floor(Math.min(...all.map((q) => q.y))) - 2;
      const bx1 = Math.ceil(Math.max(...all.map((q) => q.x))) + 2;
      const by1 = Math.ceil(Math.max(...all.map((q) => q.y))) + 2;

      setWalls({
        box: { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 },
        faces: ring.map((_, i) => {
          const u = ring[i];
          const v = ring[(i + 1) % ring.length];
          return {
            i,
            // nearness after the turn: project the edge onto the screen-down axis
            depth: (u.y + v.y) * Math.cos(cam.spin) - (u.x + v.x) * Math.sin(cam.spin),
            d: `M${u.x} ${u.y}L${v.x} ${v.y}`
              + `L${v.x + up.x} ${v.y + up.y}L${u.x + up.x} ${u.y + up.y}Z`,
          };
        }).sort((u, v) => u.depth - v.depth),
      });
    };
    if (overlayRef.current) overlayRef.current.draw();
  }, [maps, map, layout, toLL, toDraw, bounds, selected, shown, win, camRef, overlayRef]);

  /* ── Turning the view ────────────────────────────────────────────
     Shared by both gestures: apply a delta measured from wherever the
     grab started, then redraw. Measuring from the start rather than
     frame to frame is what stops it jumping on the first move. */
  const applyTurn = useCallback((dSpin, dTilt, from) => {
    camRef.current.spin = from.spin + dSpin;
    camRef.current.tilt = clamp(from.tilt + dTilt, 0, MAX_TILT);
    if (overlayRef.current) overlayRef.current.draw();
    bump((n) => n + 1);
    touched.current = Date.now();
  }, [camRef, overlayRef, bump, touched]);

  /* With a plot raised the whole surface orbits on a plain drag. */
  const startOrbit = (e) => {
    stopFly();
    touched.current = Date.now();
    if (!selRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      x: e.clientX, y: e.clientY,
      spin: camRef.current.spin, tilt: camRef.current.tilt, moved: false,
    };
  };

  const onPointerMove = (e) => {
    const g = dragRef.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) g.moved = true;
    applyTurn(dx * 0.008, -dy * 0.006, g);   // across to turn, up/down to tip
  };

  const endDrag = () => {
    touched.current = Date.now();
    dragRef.current = null;
    syncTurned();
  };

  const draggedJustNow = () => !!(dragRef.current && dragRef.current.moved);

  /* ── Free rotation, nothing raised ───────────────────────────────
     Two fingers on touch, shift-drag or right-drag on a desktop. It
     cannot be the one-finger drag: the map already owns that for
     panning, and one gesture cannot mean both.

     The angle BETWEEN the two touches gives the heading, and the change
     in their vertical midpoint gives the tilt. Google's own gesture
     handling is switched off for the duration, or the map would pan and
     rotate at the same time. */
  const twoFingerStart = (e) => {
    if (selRef.current || e.touches.length !== 2) return;
    const [a, b] = e.touches;
    stopFly();
    touched.current = Date.now();
    pinchRef.current = {
      angle: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX),
      midY: (a.clientY + b.clientY) / 2,
      spin: camRef.current.spin,
      tilt: camRef.current.tilt,
    };
    const m = mapRef.current;
    if (m) m.setOptions({ draggable: false, gestureHandling: 'none' });
  };

  const twoFingerMove = (e) => {
    const g = pinchRef.current;
    if (!g || e.touches.length !== 2) return;
    e.preventDefault();
    const [a, b] = e.touches;
    const angle = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
    const midY = (a.clientY + b.clientY) / 2;
    applyTurn(angle - g.angle, (g.midY - midY) * 0.006, g);
  };

  const twoFingerEnd = () => {
    if (!pinchRef.current) return;
    pinchRef.current = null;
    syncTurned();
    const m = mapRef.current;
    if (m && !selRef.current) m.setOptions({ draggable: true, gestureHandling: 'greedy' });
  };

  /* The desktop equivalent: no second finger, so a modifier stands in.
     A plain drag still pans, which is what anyone expects of a map. */
  const modifierTurnStart = (e) => {
    if (selRef.current) return;
    if (!(e.shiftKey || e.button === 2)) return;
    stopFly();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      x: e.clientX, y: e.clientY,
      spin: camRef.current.spin, tilt: camRef.current.tilt, moved: false,
    };
    const m = mapRef.current;
    if (m) m.setOptions({ draggable: false });
  };

  const modifierTurnEnd = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    syncTurned();
    const m = mapRef.current;
    if (m && !selRef.current) m.setOptions({ draggable: true });
  };

  /* A tap on the orbit surface that never became a drag is meant for
     whatever sits under it. The surface can't be pointerEvents:none —
     it has to catch the drags — so blind it for one call and hit-test
     the real DOM: the browser applies the container transform, which is
     precisely the thing we can't compute by hand here. */
  const pickThrough = (e) => {
    const surface = e.currentTarget;
    const prev = surface.style.pointerEvents;
    surface.style.pointerEvents = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    surface.style.pointerEvents = prev;
    const hit = el && el.closest && el.closest('[data-plot]');
    return hit ? hit.getAttribute('data-plot') : null;
  };

  const endOrbit = (e) => {
    const g = dragRef.current;
    touched.current = Date.now();
    dragRef.current = null;
    syncTurned();
    if (g && g.moved) return;                 // turned the view, not a pick
    const name = pickThrough(e);
    if (name && name !== selRef.current) onSelect(name);
  };

  /* Google positions its drag and wheel handling from raw client
     coordinates, which the container transform invalidates. Rather than
     let it pan to the wrong place, take both over while a plot is up. */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    m.setOptions({ draggable: !selected, scrollwheel: !selected });
  }, [selected, mapRef, map]);

  /* The flight leaves the zoom on a fraction, so step from the nearest
     whole one — otherwise every wheel notch inherits the drift. */
  const onWheel = useCallback((e) => {
    const m = mapRef.current;
    if (!selected || !m) return;
    e.preventDefault();
    stopFly();
    wheelRef.current += e.deltaY;
    if (Math.abs(wheelRef.current) < 40) return;
    m.setZoom(Math.round(m.getZoom()) + (wheelRef.current > 0 ? -1 : 1));
    wheelRef.current = 0;
  }, [selected, mapRef, stopFly]);

  const shownPlot = shown ? layout.byName.get(shown) : null;

  /* the window, in the units each layer needs */
  const spanX = win.x1 - win.x0;
  const spanY = win.y1 - win.y0;
  const sheetS = Math.min(win.s, MAX_SHEET / Math.max(spanX, spanY));
  const viewBox = `${win.x0} ${win.y0} ${spanX} ${spanY}`;
  const sheetW = spanX * sheetS;
  const sheetH = spanY * sheetS;

  const planLayer = divs && createPortal(
    <svg
      viewBox={viewBox}
      width={sheetW}
      height={sheetH}
      style={{
        overflow: 'hidden', display: 'block',
        cursor: selected ? 'grab' : 'pointer',
        touchAction: selected ? 'none' : 'auto',
      }}
      onPointerDown={startOrbit}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseLeave={() => setHover(null)}
    >
      <PlanContent
        layout={layout}
        selected={shown}
        matches={shownMatches}
        status={status}
        showNumbers={numbersOn}
        showStatus={statusOn}
        hover={hover}
        setHover={setHover}
        onPick={(name) => { if (!draggedJustNow()) onSelect(name); }}
      />
    </svg>,
    divs.plan,
  );

  const wallLayer = divs && walls && createPortal(
    <svg
      width={walls.box.w}
      height={walls.box.h}
      viewBox={`${walls.box.x} ${walls.box.y} ${walls.box.w} ${walls.box.h}`}
      style={{ position: 'absolute', left: walls.box.x, top: walls.box.y, display: 'block' }}
    >
      {walls.faces.map((f) => (
        <path key={f.i} d={f.d} fill={WALL_FILL} stroke={WALL_EDGE} strokeWidth={1} />
      ))}
    </svg>,
    divs.wall,
  );

  const liftLayer = divs && shownPlot && createPortal(
    <svg
      viewBox={viewBox}
      width={sheetW}
      height={sheetH}
      style={{ overflow: 'hidden', display: 'block' }}
    >
      <path
        d={pathWithHoles(shownPlot.pts)}
        fill={SELECTED_FILL}
        stroke="#E9C6F2"
        strokeWidth={SEL_STROKE}
      />
      <DimensionOverlay plot={shownPlot} />
    </svg>,
    divs.lift,
  );

  return (
    <>
      {/* The window you see through; the map inside it is deliberately
          larger. The turn gestures live here rather than on the plan,
          because they must work over bare ground too — there is no
          reason to have to find a plot before you can rotate. */}
      <div
        ref={viewRef}
        onWheel={onWheel}
        onTouchStart={twoFingerStart}
        onTouchMove={twoFingerMove}
        onTouchEnd={twoFingerEnd}
        onTouchCancel={twoFingerEnd}
        onPointerDown={modifierTurnStart}
        onPointerMove={(e) => { if (!selRef.current && dragRef.current) onPointerMove(e); }}
        onPointerUp={modifierTurnEnd}
        onPointerCancel={modifierTurnEnd}
        onContextMenu={(e) => e.preventDefault()}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: CANVAS }}
      >
        <div
          ref={hostRef}
          style={{
            position: 'absolute',
            left: -pad.x, top: -pad.y, right: -pad.x, bottom: -pad.y,
            background: CANVAS, transformOrigin: '50% 50%', willChange: 'transform',
            cursor: selected ? 'grab' : 'default',
          }}
        />
      </div>

      {/* orbit surface: covers everything while a plot is up, so a drag
          always turns the view. A tap that doesn't move is handed down
          to the plan beneath by endOrbit. */}
      {selected && (
        <div
          onPointerDown={(e) => {
            stopFly();
            touched.current = Date.now();
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = {
              x: e.clientX, y: e.clientY,
              spin: camRef.current.spin, tilt: camRef.current.tilt, moved: false,
            };
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endOrbit}
          onPointerCancel={endOrbit}
          style={{
            position: 'absolute', inset: 0, zIndex: 5,
            touchAction: 'none', cursor: 'grab',
          }}
        />
      )}

      {planLayer}
      {wallLayer}
      {liftLayer}

      {/* Offered whenever the camera is off square, not only while a
          plot is up — a free rotation with no way back to north is a
          trap. */}
      <CameraControls
        enabled={!!selected || turned}
        spin={spin}
        onToggleSpin={() => { touched.current = 0; setSpin((v) => !v); }}
        onFaceNorth={() => { faceNorth(); setTimeout(syncTurned, 400); }}
      />

      {/* Filters. Above the orbit surface (zIndex 5) so it stays usable
          while a plot is raised. The count on the button is the only
          sign, once the panel is shut, that the layout is narrowed. */}
      {!showFilters && (
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="filter-toggle-btn"
          style={{
            font: `500 13px/1 ${MONO}`,
            color: filterHits ? CANVAS : '#E7E1D5',
            background: filterHits ? ACCENT : CANVAS,
            border: `1px solid ${filterHits ? ACCENT : HAIR}`,
            borderRadius: 10,
            padding: '11px 10px',
            cursor: 'pointer',
          }}
        >
          Filters{filterHits ? ` · ${filterHits.size}` : ''}
        </button>
      )}

      {showFilters && (
        <FilterPanel
          plots={plots}
          filters={draft}
          onApply={onApplyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      <MapToggles
        showNumbers={numbersOn}
        setShowNumbers={toggleNumbers}
        showStatus={statusOn}
        setShowStatus={toggleStatus}
      />

      {/* The key to the sale colours, only while those colours are up.
          `status` can be undefined on the first frames, before the
          Firestore read lands, so the legend is given an empty map
          rather than being allowed to index into nothing. */}
      <StatusLegend plots={plots} status={status || {}} show={statusOn} />

      {error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          padding: 24, background: CANVAS, color: '#E68A72', fontFamily: MONO,
          fontSize: 13, textAlign: 'center', lineHeight: 1.6,
        }}>
          {error}
        </div>
      )}
    </>
  );
}