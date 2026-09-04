
import React, {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';

import PlanContent from './PlanContent';
import DimensionOverlay from './DimensionOverlay';
import FilterPanel from './FilterPanel';
import StatusLegend from './Statuslegend';
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
 import { watchGallery } from '../../services/GalleryService';
/* The brochure that ships with the build, rather than one uploaded per
   project. Imported rather than written as a string path: the bundler
   then fingerprints it, copies it into the build output, and fails
   LOUDLY at build time if the file is missing — a bare
   '/assets/brochure.pdf' is only discovered to be wrong when a customer
   taps it and gets a 404 in front of the buyer.

   Put the file at src/assets/brochure.pdf. Vite treats an unknown
   extension as an asset and hands back its URL, so nothing else is
   needed. If your setup refuses to import PDFs, drop the file in
   public/assets/ instead and swap this line for
   `const BROCHURE = '/assets/brochure.pdf';` — everything downstream is
   the same either way. */
import BROCHURE from '../../assets/broucher.pdf';

import '../../styles/home.css';

export const DOWN_MS = 190;   // the old plot sinking
export const UP_MS = 430;     // the new one rising
export const FLY_MS = 900;    // the camera closing in on a pick
export const REAIM_MS = 320;  // the same pick re-aimed once a panel opens
export const REFIT_MS = 260;  // the frame settling after a tilt
export const easeOut = (t) => 1 - (1 - t) ** 3;

/* Slow at both ends. Used by the opening move, which has to start and
   finish from a standstill — easeOut alone leaves at full speed, which
   is the jerk on the first frame. */
export const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2);

const SVG_NS = 'http://www.w3.org/2000/svg';

/* ── ONE PLACE FRAMES THE MAP ────────────────────────────────────────
   This file. fitPlan for the whole layout, flyTo for a pick, and
   nothing else may call fitBounds or setZoom on this map — a second
   fitBounds from a parent runs afterwards and silently wins, which is
   what used to leave a picked plot small in the middle of the frame
   however tight the close-up was made.

   Space taken by chrome is DECLARED, not framed around: pass `reserve`
   ({ left, right, top, bottom } in screen px) and flyTo aims off centre
   by that much. The three site panels below declare their own share the
   same way. The toolbar's fit button gets fitPlan back through `fitRef`
   rather than reimplementing it. */

/* ── TWO CAMERAS, ONE AT A TIME ──────────────────────────────────────
   A PICKED PLOT: the map CONTAINER is CSS-transformed by camRef, which
   is what puts the raised block, its walls, the scrim and the plan in
   one space that turns together.

   THE UNPICKED MAP: Google's own camera turns instead — real heading
   and tilt — so the imagery goes round a full 360° with the plan riding
   on it, and because nothing is CSS-transformed the container needs no
   oversizing and there is no padding at all in that state.

   They must never both be off square at once, or the block would lean
   by the sum. flyTo unwinds the native camera to north and flat across
   the flight in, so the CSS camera takes over from square.

   THE NATIVE HALF NEEDS A VECTOR MAP: GOOGLE_MAP_STYLE_ID must be a Map
   ID whose style is Vector. On raster, heading and tilt are accepted
   and ignored — the two-finger turn below will do nothing, AND THE
   OPENING ORBIT WILL SIT DEAD STILL, though a picked plot still behaves
   exactly as before. If the 360 is dead on every device, check the Map
   ID before reading another line of this. */

const RAD = Math.PI / 180;
const NATIVE_MAX_TILT_DEG = Math.min(MAX_TILT / RAD, 67.5);  // vector cap
const NATIVE_SPIN_DEG_PER_S = 10;                            // a lap in 36s
const NATIVE_IDLE_MS = 2500;
const NATIVE_SPIN_PER_PX = 0.4;   // degrees of heading per px of drag
const NATIVE_TILT_PER_PX = 0.3;

/* ── THE OPENING ───────────────────────────────────────────────────
   IT OPENS FLAT AND NORTH-UP, and stays that way until a hand moves
   it. That is the frame the drawing was made for: plot numbers upright,
   both axes at true scale, roads reading as roads, the whole layout on
   screen. A lean looks impressive and costs the customer the one view
   they can actually read the site from — so the tilt, like the turn, is
   theirs to ask for.

   Nothing here levels the camera behind them afterwards either. Lean it
   and it stays leaned; the only things that flatten it are the compass
   and the toolbar's fit button.

   THE OPENING MOVE IS OFF, and these are what turn it back on:

     INTRO_LEAN   true and the camera eases over to INTRO_TILT_DEG once
                  the fit has landed, instead of holding flat.
     INTRO_LAPS   0 = hands only · 1 = one lap then stop · Infinity =
                  it keeps turning until someone touches the map.
                  Needs INTRO_LEAN, since the lap follows the lean.

   THE TILT IS EASED IN, NOT SET. Leaning the camera over in one frame
   is the same glitch as a step change in zoom: the imagery re-projects
   in a single tick and the plan appears to snap. INTRO_MS is the lean.

   INTRO_PULL is how far the camera backs off, in zoom levels, while it
   leans. A tilted camera crops the near edge of the frame — the fit was
   computed square — so without this the nearest plots slide off the
   bottom the moment the view leans. 0.35 covers a 45° lean on a phone.

   SPIN_TAU_MS is how quickly a lap gets up to speed, and how quickly it
   gives way when a hand lands on the glass: an exponential approach
   rather than a switch, so it fades in and out instead of starting and
   stopping. About 3× tau to settle, so ~2.7s either way.

   Any of it is abandoned the moment anyone touches the map, and none of
   it runs for someone who has asked for reduced motion. */
const INTRO_LEAN = false;
const INTRO_LAPS = 0;

/* Prints the renderer and whether a test turn took. See the map
   constructor. Off in anything a customer will see. */
const CAMERA_DEBUG = false;
const INTRO_WAIT_MS = 700;     // let the fit and the imagery land first
const INTRO_TILT_DEG = 45;
const INTRO_PULL = 0.35;
const INTRO_MS = 1600;
const SPIN_TAU_MS = 900;

/* The last stretch of a counted lap, in degrees, over which the speed
   is taken off. Without it the lap stops dead on the 360th degree,
   which reads as a dropped frame rather than as a camera settling. */
const SPIN_TAPER_DEG = 60;

/* The close-up.

   GUTTER is clear ground kept around the plot for the dimension
   figures, in METRES — those stand off the edge by a fixed ground
   distance whatever the plot's size, so a small plot needs a bigger
   share of the screen than a big one, and a percentage would get it
   wrong at both ends. Too low and DimensionOverlay's figures clip.

   IT IS TIED TO SCALE IN DimensionOverlay. That file's `off + txt` is
   how far the outermost figure reaches past the plot; this must cover
   it. At SCALE 1.35 that is about 1.5 m, hence 1.6. Raise SCALE without
   raising this and the figures are framed off the edge of the screen —
   which looks like the close-up being too tight, and is not.

   LIFT_RESERVE is the fraction of the raised block's screen reach that
   the fit sets aside — of the reach AT THE CURRENT TILT, not at
   MAX_TILT. The block only reaches its full height when the view is
   tilted right over, and a pick lands on a flat camera, so reserving
   the full-tilt reach was what left the plot small and floating with
   empty ground above and below. Worst on a phone, where there is no
   spare screen to absorb it.

   CLOSE_BOOST then pushes in past the fit. 1.0 is the fit itself: plot
   plus gutter exactly filling the frame. Higher fills more screen at
   the cost of the outermost figures sitting nearer the edges. Small
   screens get more of it, because the chrome over them claims a bigger
   share of a smaller frame. This is the knob to turn if a pick is not
   close enough; leave the fit maths alone.

   SLACK keeps the drawing off the glass.

   LIFT_BIAS sits the plot low by that fraction of the reserved reach so
   the RAISED block finishes centred instead of crowding the top edge.

   FLY_MIN_Z is a floor, not a target — it exists so a huge plot cannot
   pull the camera out to nothing. FLY_MAX_Z must not exceed MAP_MAX_Z
   or the fit is silently clamped and small plots stop getting closer.
   Past about 21 the satellite imagery has no more detail and Google
   upscales it: the overlay and its dimensions stay sharp, the photo
   behind them goes soft. */
const GUTTER = 1.6;
const LIFT_RESERVE = 0.4;
const CLOSE_BOOST = 1.4;          // desktop
const CLOSE_BOOST_TABLET = 1.65;
const CLOSE_BOOST_PHONE = 1.9;
const SLACK = 1.02;
const LIFT_BIAS = 0.5;
const FLY_MIN_Z = 17;
const FLY_MAX_Z = 24;
const MAP_MAX_Z = 24;

/* The vertical budget is squashed by cos(tilt). Floored so a camera
   tilted right over cannot drive the fit to nothing. */
const MIN_CT = 0.35;

/* How far a pinch travels. 1.0 is one-to-one with the fingers, which
   feels sluggish on a plot you are trying to read a 12 m edge on; much
   above 2.5 and it overshoots past the imagery in one gesture. */
const PINCH_GAIN = 2.5;

/* One press of the on-screen zoom, in zoom levels, and how long it
   takes. A whole level per press is too coarse to land a plot where you
   want it; much under half is a lot of pressing. */
const ZOOM_STEP = 0.75;
const ZOOM_STEP_MS = 220;

/* Two taps closer together than this, on the same spot, are a
   double-tap. 300 ms is the usual platform figure; the 24 px is what
   stops a slow drag-and-release pair from counting. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 24;

/* ── THE DIMENSION FIGURES ────────────────────────────────────────
   Drawn in SCREEN space, not on the ground.

   DimensionOverlay draws them into the lift sheet, in drawing metres,
   which means they live on the ground plane and inherit the camera:
   tilt the view to look at the raised block and the figures are
   squashed by cos(tilt), skewed by the spin, and — because the sheet is
   rasterised once at the window's pixel size — softened as well. That
   is the tiny illegible text on the edges of plot 9, and no amount of
   zooming fixes it, because everything grows together.

   These are placed on the plot's edges but rendered upright at a FIXED
   pixel size, by counter-transforming each label against the camera. A
   12 pt figure stays a 12 pt figure at every tilt, heading and zoom.

   OFF BY DEFAULT, and it should stay off unless you have a reason.
   DimensionOverlay knows things this layer does not: it walks fillet
   RUNS rather than raw edges, so a rounded corner gets one figure for
   the whole arc instead of one per tiny segment; it draws the extension
   lines and end ticks that make a figure a dimension rather than a
   number floating near an edge; and it carries the plot's name and area
   in the middle. Turning this on throws all of that away in exchange
   for type that does not foreshorten.

   If you do turn it on, the DimensionOverlay in the lift layer is
   skipped automatically — otherwise every measurement prints twice,
   once legibly and once not. */
const SCREEN_DIMS = false;
const DIM_FONT = 12;       // px on screen, whatever the camera is doing
const DIM_OFFSET = 24;     // px clear of the edge it belongs to
const DIM_MIN_EDGE = 34;   // px; shorter edges on screen get no figure
const DIM_PAD = 120;       // px of room the label box needs past the walls

/* How far the CSS camera must be off square before the container counts
   as turned. Below this the transform is visually identity, so the
   oversizing can be dropped and the map left at its natural size. */
const TURNED_EPS = 0.001;

/* The same question for the native camera, in degrees. */
const NATIVE_EPS_DEG = 0.5;

/* Clear ground kept around the whole layout when framing it, in screen
   px — the ONLY padding left around the plan now that the parent no
   longer re-frames.

   The sides are as good as zero: nothing floats over them, so the plots
   run out to the glass. Top and bottom are not decoration and should
   not be zeroed without moving what sits there — the logo header (.mh,
   whose height is --mh-block in Mapheader.css) floats over the top, and
   the Filters button sits at bottom: 50px on tablet and phone. At zero,
   the outermost plots hide underneath both.

   Measure your own header and bar and match these. */
const FIT_PAD = { top: 92, right: 4, bottom: 24, left: 4 };
const FIT_PAD_TABLET = { top: 78, right: 3, bottom: 44, left: 3 };
const FIT_PAD_NARROW = { top: 62, right: 2, bottom: 58, left: 2 };
const NARROW_PX = 600;    // phone
const TABLET_PX = 1024;   // tablet, and a narrow desktop window

/* A resize on a phone is not one event: the address bar sliding away,
   the on-screen keyboard, a sheet animating open and an orientation
   change all arrive as bursts. Re-framing on each one is wasted work
   and visibly jumpy, so they are collapsed into one call. */
const RESIZE_SETTLE_MS = 120;

/* Someone who has asked their device for less movement gets the
   destination, not the journey. Read per call rather than cached: it can
   be changed while the app is open, and on iOS it flips with Low Power
   Mode. */
const reducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {
    return false;
  }
};

/* env() is ignored by browsers that don't know it, so the fallback has
   to be inside the calc rather than relied on from the shorthand —
   older WebKit only understands the two-argument form. */
const safeArea = (side, base) => `calc(${base}px + env(safe-area-inset-${side}, 0px))`;

/* A pick opens FLAT — straight down on the plot, north up, whatever the
   view was doing before. That is the state the figures are drawn for:
   no foreshortening, no skew, both axes at true scale, and the plot
   square in the frame. The block and its walls are still there the
   moment anyone drags to tilt.

   This is about a PICKED plot only. The overview is left exactly as the
   user left it — see fitPlan's keepCamera.

   Set false to keep the heading and tilt the user arrived with. */
const TOP_VIEW_ON_PICK = true;

const wrapDeg = (d) => ((d % 360) + 360) % 360;

/* radians, folded to the short way round: 350° back to north is
   forward 10°, not backward 350° */
const wrapRad = (r) => {
  const two = Math.PI * 2;
  return (((r + Math.PI) % two) + two) % two - Math.PI;
};

/* The plan is the most expensive subtree on the page and it does not
   care about the camera, so it is held still while the view turns. Its
   props must stay referentially stable for this to bite — see the
   useCallback on onPick below. */
const PlanContentMemo = React.memo(PlanContent);

/* ── THE COMPASS ─────────────────────────────────────────────────────
   Which way is north, and one tap to get back to it.

   It reads whichever camera is actually live — Google's own heading
   while nothing is picked, camRef's CSS spin while a plot is raised —
   and writes the needle's rotation STRAIGHT TO THE DOM on a rAF. Never
   setState: the heading changes on every frame of a turn, and a render
   per frame is the flicker the rest of this file spends its length
   avoiding.

   ALWAYS ON SCREEN, pointing up on a north-up map. It used to appear
   only once the view was off square, which reads as a control that is
   not there: nobody turns a map they do not already know turns. Sitting
   in the corner pointing north is the thing that says it moves.

   The loop writes only when the angle has actually changed, so a still
   map costs one comparison a frame and no layout at all. */
function Compass({ mapRef, camRef, selectedRef, onReset }) {
  const gRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const g = gRef.current;
      if (g) {
        /* Flip either sign if the needle turns against the map. The CSS
           camera rotates the CONTAINER by +spin, so north on the ground
           appears at +spin on screen; Google's heading is the direction
           the camera LOOKS, so north sits at -heading. */
        const deg = selectedRef.current
          ? camRef.current.spin / RAD
          : -(mapRef.current?.getHeading?.() || 0);
        const r = Math.round(deg * 10) / 10;
        if (r !== lastRef.current) {
          lastRef.current = r;
          g.style.transform = `rotate(${r}deg)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mapRef, camRef, selectedRef]);

  return (
    <button
      type="button"
      title="Face north"
      aria-label="Face north"
      /* the native turn listens on the document in the capture phase,
         so without this a tap here also starts a camera drag */
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onReset}
      style={{
        position: 'absolute', zIndex: 6,
        right: safeArea('right', 12),
        top: FIT_PAD.top + 4,
        width: 44, height: 44,
        display: 'grid', placeItems: 'center', padding: 0,
        background: CANVAS, border: `1px solid ${HAIR}`, borderRadius: 22,
        cursor: 'pointer', touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitAppearance: 'none', appearance: 'none',
      }}
    >
      <svg width="26" height="26" viewBox="-13 -13 26 26" style={{ display: 'block' }}>
        <g ref={gRef} style={{ transformOrigin: '50% 50%', willChange: 'transform' }}>
          <path d="M0 -9 L4.5 1.5 L0 -0.8 Z" fill={ACCENT} />
          <path d="M0 -9 L-4.5 1.5 L0 -0.8 Z" fill={ACCENT} fillOpacity="0.55" />
          <path d="M0 9 L4.5 -1.5 L0 0.8 Z" fill={HAIR} />
          <path d="M0 9 L-4.5 -1.5 L0 0.8 Z" fill={HAIR} fillOpacity="0.55" />
        </g>
        {/* outside the rotating group on purpose: it labels the top of
            the dial, not the needle, so it stays upright and readable */}
        <text
          x="0" y="-9.5" textAnchor="middle" fill="#E7E1D5"
          fontFamily={MONO} fontSize="7" fontWeight="700"
        >
          N
        </text>
      </svg>
    </button>
  );
}

/* ── INFO · GALLERY · BROCHURES ──────────────────────────────────────
   Everything about the PROJECT rather than about one plot: the address
   and khasra numbers, photographs of the site, and the PDFs a customer
   is going to be asked to take home.

   THREE SEPARATE PANELS, one per rail button, with no tab strip and
   nothing shared between them. They are written out three times on
   purpose: each one owns its own box, its own measuring, its own
   header and its own empty state, so changing how the gallery lays out
   its thumbnails cannot move the brochure list, and adding a filter or
   a search to one is a change to one function.

   ONE AT A TIME, all the same. All three want the same edge of the
   screen — the right on a desktop, the bottom on a phone — and so does
   the filter panel, so opening one closes whichever was up. Pressing
   the button of the one already open closes it.

   EACH DECLARES ITS SHARE OF THE SCREEN through onWidth rather than
   floating over the map. That figure joins `reserve` in the inset
   below, so a pick is framed in the glass that is actually left;
   without it, opening a panel on a desktop centres the picked plot
   behind it.

   They share .site-panel in home.css for one thing only: the
   desktop/phone breakpoint, which decides whether they come in from the
   right or up from the bottom. That stays in one place rather than
   three. */
/* ── THE THREE MARKS ─────────────────────────────────────────────────
   Drawn here rather than imported: three glyphs is not worth an icon
   package in a bundle a customer loads over a site-office connection.

   currentColor throughout, so the active rail button flips the mark to
   CANVAS along with its own text and nothing has to be told twice. A
   24-unit viewBox with a 1.6 stroke is the same weight as the compass
   needle, which is the only other line art on this screen.

   THE RAIL KEEPS A WORD UNDER EACH MARK. A picture-only rail assumes
   the salesperson has used the app before; the first thing anyone does
   in front of a customer is look for the word "brochure". `short` is
   what fits a 44 px button at 8 px — "Brochures" does not. */
const ICONS = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.6v.9" />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.6" r="1.6" />
      <path d="M4 16.6l4.4-4 3.6 3.1 3-2.6 4 3.9" />
    </>
  ),
  brochures: (
    <>
      <path d="M6 3.5h7.6L18.5 8.4V20.5H6z" />
      <path d="M13.4 3.5v5h5.1" />
      <path d="M9 13.5h6M9 16.8h4" />
    </>
  ),
};

function PanelIcon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: '0 0 auto' }}
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

const PANELS = [
  { k: 'info', label: 'Info', short: 'Info' },
  { k: 'gallery', label: 'Gallery', short: 'Photos' },
  { k: 'brochures', label: 'Brochures', short: 'PDF' },
];

/* ── WHICH EDGE, AND HOW BIG ─────────────────────────────────────────
   The three panels are laid out from JS rather than from a media query,
   for one reason: they have to REPORT their footprint back to the map
   through onWidth, and a CSS breakpoint the JS can't see means the
   panel moves to the bottom of a phone while pickFrame is still
   reserving screen on the right. Measuring what CSS did afterwards
   works — but only from the frame after, and that frame is the one the
   customer sees.

   These inline styles therefore OVERRIDE .site-panel's own geometry.
   Whatever position/width/inset rules that class still carries in
   home.css are now dead; delete them there rather than leaving two
   places that both think they own the layout.

   PHONE — a sheet on the bottom edge, full width. Capped by a fraction
   of the height we ACTUALLY have, not by a fixed vh: a phone in
   landscape is about 380 px tall, and 60vh of that is a letterbox with
   two rows in it. Under 520 px tall the sheet is allowed most of the
   screen, because there is nothing else worth seeing behind it.

   TABLET AND DESKTOP — a drawer on the right, floor to ceiling, held
   clear of the logo header by FIT_PAD.top. Width is a share of the
   window with a ceiling, so a 27" monitor gets a readable column rather
   than a third of a metre of brochure list.

   Everything else — the safe areas, the scroll containment, the type —
   is the same on every device. */
const PANEL_GAP = 12;

/* innerWidth AND innerHeight, kept current. The height matters as much
   as the width here: rotating a phone changes which of the two sheet
   caps applies, and nothing else in this file would tell us. */
const readViewport = () => ({
  w: typeof window === 'undefined' ? 1024 : window.innerWidth,
  h: typeof window === 'undefined' ? 768 : window.innerHeight,
});

const useViewport = () => {
  const [vp, setVp] = useState(readViewport);
  useEffect(() => {
    const on = () => setVp(readViewport());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    /* the address bar sliding away changes the height without changing
       the window's — same reason the map watches this */
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      if (vv) vv.removeEventListener('resize', on);
    };
  }, []);
  return vp;
};

const isSheet = (vp) => vp.w < NARROW_PX;

/* The outer box. Same shell for all three so they can't drift apart on
   one device and not another; what goes inside is each panel's own. */
const panelBox = (vp) => {
  const base = {
    position: 'absolute', zIndex: 7,
    background: CANVAS, border: `1px solid ${HAIR}`,
    color: '#E7E1D5', font: `400 13px/1.6 ${MONO}`,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    /* the map's own gesture handlers listen on the document in the
       capture phase; without this a scroll inside the panel also turns
       the camera underneath it */
    touchAction: 'pan-y',
  };

  if (isSheet(vp)) {
    return {
      ...base,
      left: 0, right: 0, bottom: 0, top: 'auto',
      width: 'auto',
      maxHeight: Math.round(Math.min(vp.h * (vp.h < 520 ? 0.86 : 0.6), 560)),
      borderRadius: '16px 16px 0 0',
      borderBottom: 'none',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    };
  }

  return {
    ...base,
    top: FIT_PAD.top,
    bottom: PANEL_GAP,
    right: `calc(${PANEL_GAP}px + env(safe-area-inset-right, 0px))`,
    left: 'auto',
    width: vp.w < TABLET_PX
      ? Math.round(Math.min(340, vp.w * 0.45))
      : Math.round(Math.min(400, vp.w * 0.32)),
    borderRadius: 14,
  };
};

/* The scrolling body. overscrollBehavior is not cosmetic: without it,
   scrolling past the end of a list on iOS carries on into the page
   behind and drags the whole map with it. */
const panelBody = (vp) => ({
  overflow: 'auto',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
  padding: isSheet(vp) ? '12px 16px 16px' : 16,
  flex: 1,
});

/* What the panel takes off the map, in the direction it took it. The
   gap goes in so the plot clears the panel's edge rather than touching
   it. Read straight off the window rather than from the hook's copy:
   the ResizeObserver can fire before the hook's own listener has
   re-rendered, and this has to describe the box as it was actually laid
   out in that frame. */
const panelFootprint = (el) => (isSheet(readViewport())
  ? { bottom: el.offsetHeight + PANEL_GAP }
  : { right: el.offsetWidth + PANEL_GAP });

/* The grab bar on a phone: the thing that says a sheet can be pushed
   down. Decoration on a desktop drawer, so it isn't drawn there. */
function SheetGrip() {
  return (
    <div style={{
      width: 36, height: 4, borderRadius: 2, background: HAIR,
      margin: '8px auto 0', flex: '0 0 auto',
    }} />
  );
}

/* ── INFO ────────────────────────────────────────────────────────────
   The project on paper: address, khasra numbers, sanctioning body,
   whatever `site.info.rows` carries. Rows are PAIRS, not an object, so
   the order on screen is the order the client gave — an object's key
   order is not something to hang a customer-facing document on.

   ON A PHONE THE ROWS STACK, label above value: a 110 px label column
   against a 360 px screen leaves every value wrapping to three lines.
   On anything wider they sit side by side and scan as a table. */
function InfoPanel({ site, onWidth, onClose }) {
  const boxRef = useRef(null);
  const vp = useViewport();
  const sheet = isSheet(vp);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const report = () => onWidth(panelFootprint(el));
    report();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', report);
    window.addEventListener('orientationchange', report);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', report);
      window.removeEventListener('orientationchange', report);
      onWidth(null);   // hand the screen back on the way out
    };
  }, [onWidth]);

  const info = site?.info || {};
  const rows = info.rows || [];

  return (
    <div
      ref={boxRef}
      className="site-panel"
      onPointerDown={(e) => e.stopPropagation()}
      style={panelBox(vp)}
    >
      {sheet && <SheetGrip />}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${HAIR}`, flex: '0 0 auto', paddingLeft: 16,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          font: `500 13px/1 ${MONO}`, opacity: 0.75,
        }}>
          <PanelIcon name="info" size={16} />
          Info
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close"
          style={{
            width: 44, height: 44, background: 'transparent', color: '#E7E1D5',
            border: 'none', cursor: 'pointer', font: `500 16px/1 ${MONO}`,
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
            WebkitAppearance: 'none', appearance: 'none',
          }}
        >
          ×
        </button>
      </div>

      <div style={panelBody(vp)}>
        {info.title && (
          <div style={{
            font: `600 ${sheet ? 15 : 16}px/1.4 ${MONO}`, marginBottom: 12,
          }}>
            {info.title}
          </div>
        )}
        {rows.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: 'flex',
              flexDirection: sheet ? 'column' : 'row',
              gap: sheet ? 2 : 12,
              padding: '8px 0',
              borderBottom: `1px solid ${HAIR}`,
            }}
          >
            <span style={{ opacity: 0.6, minWidth: sheet ? 0 : 110 }}>{k}</span>
            <span style={{ wordBreak: 'break-word' }}>{v}</span>
          </div>
        ))}
        {info.note && <p style={{ marginTop: 14, opacity: 0.85 }}>{info.note}</p>}
        {!info.title && !rows.length && !info.note && (
          <p style={{ opacity: 0.6 }}>Site details haven’t been added yet.</p>
        )}
      </div>
    </div>
  );
}

/* ── GALLERY ─────────────────────────────────────────────────────────
   Photographs of the ground.

   Tapping one opens the full image in a new tab rather than in a
   lightbox of our own, so the browser's own pinch-zoom does the work. A
   customer wants to zoom into the approach road, and a homemade viewer
   would have to reimplement that badly on the one device it matters on.

   THE GRID IS AUTO-FILL, not a column count, so it reflows on its own
   between a phone sheet and a 400 px drawer without either being told
   about the other. Only the minimum tile changes: 104 px gives three
   across a 360 px phone, 140 px keeps a drawer thumbnail big enough to
   tell two plots apart. */
/* GalleryPanel — read-only, live.
 
   Uploading and deleting stay in the Flutter admin app; this panel just
   watches the same collection and draws what is there. Add to the top
   of the file this lives in:
 
     import { watchGallery } from '../../services/Galleryservice';
 
   (plus useMemo on the existing react import).
 
   With no `mapId` it falls back to `site.gallery`, so anywhere already
   passing a plain list keeps working unchanged. */

/* GalleryPanel — read-only, live, and built for an album rather than a
   handful of photographs.
 
   Four things matter once a layout has forty site photos on it:
 
   1. THE TILE SIZE IS THE PANEL'S, NOT THE WINDOW'S. The panel is a
      full-width sheet on a phone and a 340–400px drawer on everything
      else, so a tile sized off window width is wrong in the drawer.
      minmax(min(tile, 100%), 1fr) also stops a tile wider than the
      panel from overflowing it on a 320px phone.
 
   2. THE FOOTPRINT IS ONLY REPORTED WHEN IT CHANGES. Every image that
      decodes fires the ResizeObserver, and each report used to set
      state in PlanMap and re-aim the camera. Forty images was forty
      re-aims. The fixed 4/3 aspect-ratio keeps the box stable while
      they load; this comparison catches whatever is left.
 
   3. OFF-SCREEN TILES ARE NOT LAID OUT. contentVisibility with an
      intrinsic size lets the browser skip rendering rows scrolled out
      of the panel while keeping the scrollbar honest.
 
   4. KEYED BY ID. Two photographs uploaded with the same name resolve
      to different URLs, but a placeholder list can repeat one — and a
      duplicate key silently drops a tile.
 
   Add to the top of the file this lives in:
 
     import { watchGallery } from '../../services/Galleryservice'; */

function GalleryPanel({ site, onWidth, onClose, mapId }) {
  const boxRef = useRef(null);
  const vp = useViewport();
  const sheet = isSheet(vp);

  const [live, setLive] = useState(null);   // null = not loaded yet
  const [error, setError] = useState(null);

  const lastFootprint = useRef('');

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;

    const report = () => {
      const f = panelFootprint(el);
      /* Rounded before comparing: a decoding image can move the box by
         a fraction of a pixel, which is not a change the camera needs
         to hear about. */
      const key = `${Math.round(f.right || 0)}x${Math.round(f.bottom || 0)}`;
      if (key === lastFootprint.current) return;
      lastFootprint.current = key;
      onWidth(f);
    };
    report();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', report);
    window.addEventListener('orientationchange', report);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', report);
      window.removeEventListener('orientationchange', report);
      lastFootprint.current = '';
      onWidth(null);
    };
  }, [onWidth]);

  /* Live rather than one-shot: an admin adding photographs from the
     Flutter app while a salesman has the panel open should show up
     without a reload. watchGallery returns its own unsubscribe. */
  useEffect(() => {
    if (!mapId) return undefined;
    return watchGallery(
      mapId,
      (list) => { setLive(list); setError(null); },
      (err) => setError(err?.message || 'Could not load the gallery.'),
    );
  }, [mapId]);

  const gallery = useMemo(() => {
    if (!mapId) {
      return (site?.gallery || []).map((g, i) => ({
        id: `${g.url || 'img'}-${i}`,
        url: g.url,
        thumb: g.thumb || g.url,
        caption: g.caption || '',
      }));
    }
    return (live || []).map((im) => ({
      id: im.id,
      url: im.url,
      thumb: im.thumb || im.url,
      caption: im.name || '',
    }));
  }, [mapId, live, site]);

  const loading = !!mapId && live === null && !error;

  /* Three across, whatever the device. A 320px phone sheet, a 340px
     tablet drawer and a 400px desktop drawer all want a different
     number here, and one fixed minimum gets two of the three wrong. */
  let tile = 140;
  if (sheet) tile = vp.w < 360 ? 96 : 108;
  else if (vp.w < TABLET_PX) tile = 118;
  const gap = sheet ? 6 : 8;

  return (
    <div
      ref={boxRef}
      className="site-panel"
      onPointerDown={(e) => e.stopPropagation()}
      style={panelBox(vp)}
    >
      {sheet && <SheetGrip />}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${HAIR}`, flex: '0 0 auto', paddingLeft: 16,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
          font: `500 13px/1 ${MONO}`, opacity: 0.75,
        }}>
          <PanelIcon name="gallery" size={16} />
          Gallery
          {gallery.length > 0 && (
            <span style={{ opacity: 0.55 }}>{gallery.length}</span>
          )}
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close"
          style={{
            width: 44, height: 44, background: 'transparent', color: '#E7E1D5',
            border: 'none', cursor: 'pointer', font: `500 16px/1 ${MONO}`,
            flex: '0 0 auto',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
            WebkitAppearance: 'none', appearance: 'none',
          }}
        >
          ×
        </button>
      </div>

      <div style={panelBody(vp)}>
        {error && (
          <p style={{ font: `400 12px/1.5 ${MONO}`, color: '#E0A33C', margin: '0 0 10px' }}>
            {error}
          </p>
        )}

        {loading ? (
          <p style={{ opacity: 0.6 }}>Loading photographs…</p>
        ) : gallery.length ? (
          <div style={{
            display: 'grid',
            /* min(tile, 100%) is what keeps a single wide tile from
               overflowing a narrow panel instead of shrinking */
            gridTemplateColumns: `repeat(auto-fill, minmax(min(${tile}px, 100%), 1fr))`,
            gap,
          }}>
            {gallery.map((g) => (
              /* loading="lazy" is not optional here: a site album is
                 twenty photographs, and fetching all of them the moment
                 the panel opens stalls the map's own tiles on a phone
                 connection. */
              <a
                key={g.id}
                href={g.url}
                target="_blank"
                rel="noreferrer"
                title={g.caption || undefined}
                aria-label={g.caption || 'Open photograph'}
                style={{
                  display: 'block',
                  /* rows scrolled out of the panel cost nothing to keep
                     around; the intrinsic size keeps the scrollbar and
                     the panel height honest while they are skipped */
                  contentVisibility: 'auto',
                  containIntrinsicSize: `${Math.round(tile * 0.75)}px`,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <img
                  src={g.thumb || g.url}
                  alt={g.caption || ''}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '100%', aspectRatio: '4 / 3', objectFit: 'cover',
                    borderRadius: 8, border: `1px solid ${HAIR}`, display: 'block',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                />
              </a>
            ))}
          </div>
        ) : (
          <p style={{ opacity: 0.6 }}>No site photographs yet.</p>
        )}
      </div>
    </div>
  );
}

/* ── BROCHURES ───────────────────────────────────────────────────────
   The one PDF the customer is asked to take home — the file bundled
   with the build, and nothing else.

   `site.brochures` STAYS OUT OF IT deliberately: it also carries the
   layout plan, which is on screen already and does not need handing
   over a second time as a download. If a project ever needs its own
   brochure in place of this one, filter that list by kind here rather
   than appending all of it.

   `download` on a PDF link is a hint, not a guarantee: iOS Safari
   ignores it and opens the file in its own viewer, which is the better
   outcome anyway — the customer sees it straight away and can share it
   from there. */
function BrochuresPanel({ onWidth, onClose }) {
  const boxRef = useRef(null);
  const vp = useViewport();
  const sheet = isSheet(vp);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const report = () => onWidth(panelFootprint(el));
    report();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', report);
    window.addEventListener('orientationchange', report);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', report);
      window.removeEventListener('orientationchange', report);
      onWidth(null);
    };
  }, [onWidth]);

  return (
    <div
      ref={boxRef}
      className="site-panel"
      onPointerDown={(e) => e.stopPropagation()}
      style={panelBox(vp)}
    >
      {sheet && <SheetGrip />}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${HAIR}`, flex: '0 0 auto', paddingLeft: 16,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          font: `500 13px/1 ${MONO}`, opacity: 0.75,
        }}>
          <PanelIcon name="brochures" size={16} />
          Brochures
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close"
          style={{
            width: 44, height: 44, background: 'transparent', color: '#E7E1D5',
            border: 'none', cursor: 'pointer', font: `500 16px/1 ${MONO}`,
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
            WebkitAppearance: 'none', appearance: 'none',
          }}
        >
          ×
        </button>
      </div>

      <div style={panelBody(vp)}>
        <a
          href={BROCHURE}
          target="_blank"
          rel="noreferrer"
          download
          style={{
            /* a whole row, 56 px tall, is the target on a tablet
               someone is holding one-handed in front of a buyer */
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12,
            minHeight: 56, padding: '0 2px',
            borderBottom: `1px solid ${HAIR}`,
            color: '#E7E1D5', textDecoration: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span>Project brochure</span>
          <span style={{ color: ACCENT, whiteSpace: 'nowrap' }}>PDF</span>
        </a>
      </div>
    </div>
  );
}

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
 * IT OPENS FLAT. The layout is fitted north-up and held there; tilting
 * and turning are the user's, by hand or by the compass. Nothing levels
 * the camera again afterwards — see INTRO_LEAN and fitPlan's
 * keepCamera.
 *
 * WITH A PLOT RAISED the whole surface orbits on a plain drag, turning
 * the map CONTAINER, which has two consequences, both handled below:
 * the container has to be bigger than the viewport or its corners swing
 * into view, and Google's own pointer maths doesn't know about the
 * transform — so dragging and wheel zoom are taken over for the
 * duration.
 *
 * WITH NOTHING RAISED the map's own camera turns instead: two fingers
 * on touch, drag on a desktop. Full 360° at any zoom, and no container
 * oversizing, so no padding.
 *
 * NOTHING IN THE HOT PATH CALLS setState. A turn, a rise and a flight
 * all run through overlayRef.draw() and direct DOM writes; React is
 * only re-rendered when the gesture ends or the drawing window actually
 * moves. That is what keeps the animation smooth — a setState per frame
 * was the flicker. The compass follows the same rule.
 *
 * A pick FLIES the camera in — see flyTo. The OPENING view is a fit to
 * the PLOTS — see fitPlan. Not a fixed zoom, which frames a laptop and
 * crops a phone, and not the drawing's own bounds, which include margin
 * the customer did not come to see.
 *
 * FILTERS live here rather than in App because everything they need —
 * the layout, and the match set the plan is already drawn against — is
 * here. The panel narrows on top of whatever `matches` the parent sends
 * down, so the toolbar search and the panel stack instead of fighting.
 *
 * `site` is the project itself — address, photographs, brochures — and
 * is the only prop here that is content rather than geometry. See the
 * three panels above for its shape.
 */
export default function PlanMap({
  layout, selected, onSelect, matches, status, mapRef, fitRef, onReady,
  showNumbers, setShowNumbers, showStatus, setShowStatus, reserve, site,mapId,
}) {
  const viewRef = useRef(null);
  const hostRef = useRef(null);
  const selRef = useRef(null);
  const shownRef = useRef(null);
  const riseRef = useRef(0);
  const drawRef = useRef(() => {});
  const dragRef = useRef(null);
  const pinchRef = useRef(new Map());
  const pinchStartRef = useRef(null);
  const wheelRef = useRef(0);
  const flyRef = useRef(0);
  const winRef = useRef(null);

  /* the wall and dimension SVGs, written to directly rather than
     re-rendered — see paintWalls / paintDims */
  const wallSvgRef = useRef(null);
  const dimSvgRef = useRef(null);

  /* true only while a flight is in the air — see the draw window */
  const flyingRef = useRef(false);

  /* True for as long as the NATIVE camera is being moved — a two-finger
     turn, a mouse drag, or a lap. Same job as flyingRef: it tells the
     draw callback to leave the drawing window alone. Re-rendering the
     plan mid-gesture is what the flickering actually is. */
  const turningRef = useRef(false);
  const settleWinRef = useRef(0);

  /* which plot the camera has already flown to, so a late `reserve`
     re-aims instead of starting the whole flight again */
  const flownRef = useRef(null);

  /* The CSS tilt the current frame was computed for. Tilting squashes
     the view, so the plot shrinks; when the gesture ends this is what
     tells refitPick how much of the frame has been given away. */
  const framedTiltRef = useRef(0);

  /* Set the moment the user pinches or wheels. From then on the plot is
     framed the way THEY left it — no automatic re-fit is allowed to
     take a zoom they chose deliberately, which is the whole point of
     zooming in to read a dimension. Cleared on the next pick. */
  const manualZoomRef = useRef(false);

  /* the last tap that landed on the orbit surface, for double-tap */
  const tapRef = useRef(null);

  /* the CSS camera levelling itself out on a pick */
  const levelRef = useRef(0);

  /* ── TOP VIEW, HELD ──────────────────────────────────────────────
     Set on every new pick, cleared the moment the user actually turns
     the view with their own hand.

     While it is set the CSS camera is FORCED square on every frame, in
     the draw callback, rather than merely being animated to square
     once. That is deliberate: usePlanCamera applies its own tilt and
     its own idle orbit, and levelling once only wins until its next
     frame — which is why a pick kept sliding into a three-quarter view
     on its own. Zeroing per frame is the only version that cannot be
     overwritten by a hook this file does not own.

     It costs nothing while it holds: two assignments per frame, and the
     values are the ones the frame would use anyway. */
  const topLockRef = useRef(false);

  /* the native camera's own drag, two-finger gesture and auto-spin */
  const nativeDragRef = useRef(null);
  const nativeRafRef = useRef(0);
  const nativeTouchRef = useRef(0);
  const natPtrs = useRef(new Map());
  const natGesture = useRef(null);

  /* The lap's speed, as a fraction of NATIVE_SPIN_DEG_PER_S. Eased
     rather than switched, so the orbit fades in and hands back rather
     than starting and stopping dead — see SPIN_TAU_MS. */
  const spinVelRef = useRef(0);

  /* Degrees turned so far in this session, and how many are allowed.
     The budget is a ref, not INTRO_LAPS itself, because the two callers
     want different things: the opening lap is limited to INTRO_LAPS,
     while a lap started by hand turns until it is stopped. */
  const spunRef = useRef(0);
  const lapBudgetRef = useRef(Infinity);

  /* The opening runs once per mount, and the tilt it settled on is kept
     so a resize can put the camera back where it was: fitPlan levels
     the camera, and a phone's address bar sliding away is a resize. */
  const introDoneRef = useRef(false);
  const introTiltRef = useRef(0);

  const [pad, setPad] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(null);
  /* Hover is a PROP of the plan, so every change re-renders all of it.
     A mouse turning the view sweeps across plots the whole time, which
     used to fire one of these per frame — a second, quieter source of
     the same flicker. Refused for the length of a gesture. */
  const setHoverSafe = useCallback((v) => {
    if (turningRef.current) return;
    setHover((h) => (h === v ? h : v));
  }, []);
  const [map, setMap] = useState(null);
  const [shown, setShown] = useState(null);
  const [win, setWin] = useState(() => ({ ...layout.bounds, s: 1 }));

  const [showFilters, setShowFilters] = useState(false);
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filterHits, setFilterHits] = useState(null);

  /* Which of the three panels is open, if any, and what it has claimed
     of the screen. The claim is state rather than a ref because the
     inset it feeds is what flyTo aims by — but it is only written on
     open, close and resize, never per frame. */
  const [panel, setPanel] = useState(null);
  const [panelInset, setPanelInset] = useState(null);

  /* True once the CSS camera is off square. It drives the container
     oversizing and whether the compass is offered — a rotation with no
     way back to north would be a trap. State, not a ref, because the
     render has to react to it; the camera itself stays in camRef and is
     read per frame. */
  const [turned, setTurned] = useState(false);

  /* The same for the native camera, which is the one that moves while
     nothing is picked. Deliberately kept apart from `turned`: this one
     must NOT inflate the container, because nothing is transformed. */
  const [nativeTurned, setNativeTurned] = useState(false);
  const [nativeSpin, setNativeSpin] = useState(false);

  /* The two view switches. App owns them when it passes setters down —
     then the toolbar and these toggles stay in step. When it doesn't,
     the flags live here instead, so the switches work on their own
     rather than calling undefined and doing nothing.

     STATUS IS ON BY DEFAULT now, not a view someone has to go and find
     a switch for: sold / booked / available is the first thing anyone
     opening a layout is looking for. The white master-plan tone is not
     replaced by it — PlanContent only reaches for a status colour when
     a plot actually HAS a status, so an unsold plot, or one Firestore
     has not mapped yet, still draws in the plain drawing tone. */
  const [ownNumbers, setOwnNumbers] = useState(showNumbers !== false);
  const [ownStatus, setOwnStatus] = useState(showStatus !== false);
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

  /* Screen edges that are spoken for — the details panel, whichever
     site panel is open, and anything else sitting over the map. Broken
     apart and re-assembled because a parent passing
     `reserve={{ right: 340 }}` inline hands us a new object every
     render, and flyTo would then re-aim on every render rather than
     when the space actually changed. */
  const { left: rl = 0, right: rr = 0, top: rt = 0, bottom: rb = 0 } = reserve || {};
  const {
    left: pl = 0, right: pr = 0, top: pt = 0, bottom: pb = 0,
  } = panelInset || {};
  const inset = useMemo(
    () => ({
      left: rl + pl, right: rr + pr, top: rt + pt, bottom: rb + pb,
    }),
    [rl, rr, rt, rb, pl, pr, pt, pb],
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

  /* Called after any CSS camera change. Cheap, and it keeps `turned`
     from drifting out of step with camRef, which is the thing that
     actually moves. Called at the END of a gesture, never per frame. */
  const syncTurned = useCallback(() => {
    const c = camRef.current;
    const off = Math.abs(c.spin) > TURNED_EPS || c.tilt > TURNED_EPS;
    setTurned((v) => (v === off ? v : off));
  }, [camRef]);

  /* The native camera is moved by Google's built-in gestures too, not
     only by the handlers below, so this is read off the map rather than
     off any local copy.

     It is also called from the orbit's own listener, once per frame
     while the lap runs. That costs nothing: `off` is true for the whole
     lap, and the functional setState bails out when the value hasn't
     changed, so no render happens. */
  const syncNative = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    const h = wrapDeg(m.getHeading() || 0);
    const off = Math.min(h, 360 - h) > NATIVE_EPS_DEG
      || (m.getTilt() || 0) > NATIVE_EPS_DEG;
    setNativeTurned((v) => (v === off ? v : off));
  }, [mapRef]);

  /* ---------------------------------------------------------------
     The raised block's walls, painted by hand.

     This used to be setWalls({ box, faces }) from inside the draw
     callback — a React state write on every animation frame of every
     orbit, rise and flight, each one re-rendering this whole component
     and the plan SVG underneath it. That is the flicker and the lag.

     One SVG node is created once and its paths are mutated in place.
     Nodes are reused across frames because a plot's edge count doesn't
     change while it is up.
  --------------------------------------------------------------- */
  const paintWalls = useCallback((box, faces) => {
    const svg = wallSvgRef.current;
    if (!svg) return;

    if (!box || !faces || !faces.length) {
      svg.style.display = 'none';
      return;
    }

    svg.style.display = 'block';
    svg.style.left = `${box.x}px`;
    svg.style.top = `${box.y}px`;
    svg.setAttribute('width', box.w);
    svg.setAttribute('height', box.h);
    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);

    while (svg.childNodes.length > faces.length) {
      svg.removeChild(svg.lastChild);
    }
    for (let i = 0; i < faces.length; i += 1) {
      let p = svg.childNodes[i];
      if (!p) {
        p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('fill', WALL_FILL);
        p.setAttribute('stroke', WALL_EDGE);
        p.setAttribute('stroke-width', '1');
        svg.appendChild(p);
      }
      p.setAttribute('d', faces[i].d);
    }
  }, []);

  /* The figures. Same imperative treatment as the walls, and for the
     same reason: this runs on every frame of every turn.

     Each label carries its own counter-transform. The container maps to
     the screen as scaleY(cos tilt) ∘ rotate(spin), so undoing it in the
     label's own coordinates — rotate(-spin) then scale(1, 1/cos tilt) —
     lands the text upright and unsquashed however the view is turned.

     The box behind each figure is not decoration: satellite imagery
     under a figure can be any colour, and white-on-pale is unreadable
     on the one plot the customer is actually looking at. */
  const paintDims = useCallback((box, items) => {
    const svg = dimSvgRef.current;
    if (!svg) return;

    if (!box || !items || !items.length) {
      svg.style.display = 'none';
      return;
    }

    svg.style.display = 'block';
    svg.style.left = `${box.x}px`;
    svg.style.top = `${box.y}px`;
    svg.setAttribute('width', box.w);
    svg.setAttribute('height', box.h);
    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);

    while (svg.childNodes.length > items.length) {
      svg.removeChild(svg.lastChild);
    }
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      let g = svg.childNodes[i];
      if (!g) {
        g = document.createElementNS(SVG_NS, 'g');
        const r = document.createElementNS(SVG_NS, 'rect');
        r.setAttribute('rx', '7');
        r.setAttribute('fill', CANVAS);
        r.setAttribute('fill-opacity', '0.92');
        r.setAttribute('stroke', HAIR);
        r.setAttribute('stroke-width', '1');
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('text-anchor', 'middle');
        /* dy, not dominant-baseline: WebKit ignored the latter on <text>
           for years and still disagrees with Blink on where 'central'
           sits. This is the same trick DimensionOverlay uses. */
        t.setAttribute('dy', '0.35em');
        t.setAttribute('fill', '#E7E1D5');
        t.setAttribute('font-family', MONO);
        t.setAttribute('font-size', String(DIM_FONT));
        t.setAttribute('font-weight', '600');
        g.appendChild(r);
        g.appendChild(t);
        svg.appendChild(g);
      }
      const r = g.childNodes[0];
      const t = g.childNodes[1];

      g.setAttribute(
        'transform',
        `translate(${it.x} ${it.y}) rotate(${it.rot}) scale(1 ${it.sy})`,
      );
      if (t.textContent !== it.label) t.textContent = it.label;

      /* MONO, so a character is a known fraction of the em and the box
         can be sized without measuring — measuring would force a
         layout on every frame. */
      const w = it.label.length * DIM_FONT * 0.62 + 14;
      const h = DIM_FONT + 10;
      r.setAttribute('x', String(-w / 2));
      r.setAttribute('y', String(-h / 2));
      r.setAttribute('width', String(w));
      r.setAttribute('height', String(h));
    }
  }, []);

  /* ---------------------------------------------------------------
     Framing the layout. The opening view, and what the toolbar's fit
     button returns to.

     A FIT, not a fixed zoom: one zoom number frames a laptop and crops
     a phone, and is wrong again on a tablet in portrait.

     It fits the PLOTS, not layout.bounds and not layout.features. The
     drawing's extent runs well past the last plot on most CAD exports —
     sheet border, title block, surrounding roads and open ground.
     Framing that leaves the plots as a small island with empty imagery
     all around, which is worst exactly where there is no screen to
     spare.

     Heading and tilt are levelled first: fitBounds on a turned camera
     fits the bounds as seen from that heading, which is not the frame
     anyone means by "show me the whole layout". THAT IS WHY THE ORBIT
     HAS TO BE LEANED BACK IN AFTERWARDS by whoever called this while
     the lap was running — see the resize settle below.
  --------------------------------------------------------------- */
  const fitPlan = useCallback((target, keepCamera = true) => {
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

    /* Levelled to fit, then PUT BACK. fitBounds frames the bounds as
       seen from the current heading, which is not what anyone means by
       "show me the whole layout" — but on a vector map it also resets
       tilt and heading to zero by itself, and a resize or a closed plot
       is no reason to flatten a view the user leaned on purpose. So the
       fit is computed square and the view is handed straight back.

       Pass keepCamera false to genuinely return to flat north-up. */
    const h0 = wrapDeg(m.getHeading() || 0);
    const t0 = m.getTilt() || 0;
    if (typeof m.moveCamera === 'function') m.moveCamera({ heading: 0, tilt: 0 });
    const w = el.clientWidth;
    let padding = FIT_PAD;
    if (w < NARROW_PX) padding = FIT_PAD_NARROW;
    else if (w < TABLET_PX) padding = FIT_PAD_TABLET;
    m.fitBounds(b, padding);
    if (keepCamera && (h0 || t0) && typeof m.moveCamera === 'function') {
      m.moveCamera({ heading: h0, tilt: t0 });
    }
  }, [maps, mapRef, plots, bounds, toLL]);

  /* Handed back to the parent so the toolbar's fit button calls THIS
     rather than writing its own fitBounds.

     Wrapped, for two reasons. An onClick hands its event in as the
     first argument, and `target || mapRef.current` would take that
     event for a map. And this is the one fit that SHOULD level the
     camera: everywhere else the view is left alone, so the button is
     the deliberate way back to a flat north-up plan. */
  useEffect(() => {
    if (!fitRef) return undefined;
    fitRef.current = () => fitPlan(undefined, false);
    return () => { fitRef.current = null; };
  }, [fitRef, fitPlan]);

  /* ---------------------------------------------------------------
     Framing a pick — the close-up.

     Picking a plot brings it to you rather than leaving you to go find
     it, and closes in until the plot fills the frame with its dimension
     figures legible around it. Centre is the plot's bounding box, not
     its centroid: an L-shaped plot's centroid can sit outside the plot,
     and the box is what actually has to fit on screen.

     The camera turns the CONTAINER about its own centre, and the
     container is padded symmetrically around the viewport, so the map
     centre and the viewport centre are the same point at every heading.
     That is why this can be a plain setCenter and doesn't have to undo
     the spin.

     Zoom is a real fit, then a deliberate push past it. What has to be
     on screen is the plot's box PLUS the gutter its figures live in;
     the axes are fitted separately rather than to the short side, which
     is what lets a wide plot fill the width instead of being framed for
     a height it doesn't have.

     THE TILT IS READ, NOT ASSUMED. Both vertical corrections — the
     cos(tilt) squash and the raised block's reach — are computed at the
     camera's CURRENT tilt, every time, by pickFrame below. A pick lands
     on a flat camera, where both are zero, so the plot fills the frame
     instead of being framed for headroom nothing is using. Tilt the
     view afterwards and refitPick closes the difference, so the plot
     keeps filling the frame instead of shrinking toward the horizon.
  --------------------------------------------------------------- */
  /* The frame a pick deserves, AT THE CAMERA'S CURRENT TILT: the zoom
     that fits the plot, and the centre that puts it in the middle of
     what is actually VISIBLE once the sheet, the panel or a site panel
     has taken its share.

     Split out of flyTo because three other things need the same
     answer: a re-aim when a panel opens, a re-fit when the view is
     tilted, and every pinch and wheel notch — those anchor on the PLOT
     rather than on the map centre, which is why zooming in to read the
     dimensions no longer slides the plot off the edge.

     `zForce` asks the other question: not "how close should this be"
     but "where should the centre sit IF the zoom were this". */
  const pickFrame = useCallback((name, zForce, flat) => {
    const m = mapRef.current;
    const el = viewRef.current;
    const plot = name && layout.byName.get(name);
    if (!m || !el || !plot || !plot.pts.length) return null;

    const xs = plot.pts.map((p) => p[0]);
    const ys = plot.pts.map((p) => p[1]);
    const x0 = Math.min(...xs); const x1 = Math.max(...xs);
    const y0 = Math.min(...ys); const y1 = Math.max(...ys);
    const to = toLL((x0 + x1) / 2, (y0 + y1) / 2);
    const world = 156543.03392 * Math.cos((to.lat * Math.PI) / 180);

    /* the screen this pick actually has, and how hard to push in on it */
    const w = el.clientWidth;
    let boost = CLOSE_BOOST;
    if (w < NARROW_PX) boost = CLOSE_BOOST_PHONE;
    else if (w < TABLET_PX) boost = CLOSE_BOOST_TABLET;

    /* The tilt the camera is AT — not the tilt it may one day reach.
       Tilting squashes the container in Y and spends the block's reach,
       so the fit is a different number at 0° and at 45°. Read it every
       time; refitPick below is what acts on the difference. */
    const tiltNow = flat ? 0 : camRef.current.tilt;
    const ct = Math.max(Math.cos(tiltNow), MIN_CT);
    const lift = LIFT_H * Math.sin(tiltNow);   // the block's reach, in ground metres

    const needW = (x1 - x0 + GUTTER * 2) * SLACK;
    const needH = (y1 - y0 + GUTTER * 2) * SLACK + lift * LIFT_RESERVE;

    /* The reserve is honoured, but never allowed to starve the fit: a
       panel wider than the viewport would otherwise drive availW toward
       the floor and hold the camera back on every pick. Half the
       viewport is the most any chrome may claim. */
    const availW = Math.max(
      el.clientWidth - Math.min(inset.left + inset.right, el.clientWidth * 0.5),
      160,
    );
    const availH = Math.max(
      (el.clientHeight - Math.min(inset.top + inset.bottom, el.clientHeight * 0.5)) * ct,
      160,
    );

    /* metres per pixel wanted, then divided down to push in past the
       bare fit — see CLOSE_BOOST */
    const mpp = Math.max(needW / availW, needH / availH) / boost;
    const fit = clamp(Math.log2(world / mpp), FLY_MIN_Z, FLY_MAX_Z);
    const z = zForce == null ? fit : clamp(zForce, FLY_MIN_Z, MAP_MAX_Z);

    /* Aim at the middle of what is actually VISIBLE, not the middle of
       the viewport, and sit low by half the reserved lift so the risen
       block lands centred. Both are offsets the CENTRE must make in
       screen px; the container is rotated by spin and squashed in Y by
       cos(tilt), so they are run back through that transform to become
       container px, then divided by the scale to become world units. */
    let aim = to;
    const proj = m.getProjection();
    if (proj) {
      const scale = 2 ** z;
      const risePx = (lift * LIFT_RESERVE * scale) / world;
      const sx = (inset.right - inset.left) / 2;
      const sy = (inset.bottom - inset.top) / 2 - risePx * LIFT_BIAS;
      const s = flat ? 0 : camRef.current.spin;
      const cx = sx * Math.cos(s) + (sy / ct) * Math.sin(s);
      const cy = (sy / ct) * Math.cos(s) - sx * Math.sin(s);
      const p = proj.fromLatLngToPoint(new maps.LatLng(to.lat, to.lng));
      const q = proj.fromPointToLatLng(
        new maps.Point(p.x + cx / scale, p.y + cy / scale),
      );
      if (q) aim = { lat: q.lat(), lng: q.lng() };
    }

    return { z, fit, aim, tilt: tiltNow };
  }, [layout, toLL, mapRef, maps, camRef, inset]);

  /* ---------------------------------------------------------------
     Flying in on a pick.

     Everything about WHERE is pickFrame's; this is only the glide, and
     the unwinding of the native camera — the CSS camera takes the view
     from here, and if the map were still turned underneath the two
     rotations would add. That unwinding is also what takes the opening
     orbit's lean back out on the first pick.

     `ms` is short for a re-aim: the same plot, a panel having just
     opened underneath it. A full FLY_MS there reads as a second
     flight.

     One thing worth knowing if this ever seems not to move: the whole
     flight is skipped when the camera is already there (`still`).
  --------------------------------------------------------------- */
  const flyTo = useCallback((name, msIn = FLY_MS, flat = false) => {
    const ms = reducedMotion() ? 1 : msIn;
    const m = mapRef.current;
    const f = pickFrame(name, undefined, flat);
    if (!m || !f) return;

    const z1 = f.z;
    const { aim } = f;

    const c0 = m.getCenter();
    if (!c0) return;
    const a = { lat: c0.lat(), lng: c0.lng() };
    const z0 = m.getZoom();

    /* where the native camera has to be unwound from */
    const h0 = wrapDeg(m.getHeading() || 0);
    const hDelta = h0 > 180 ? 360 - h0 : -h0;      // the short way back to north
    const nt0 = m.getTilt() || 0;

    /* the tilt this frame was computed for — refitPick compares */
    framedTiltRef.current = f.tilt;

    const still = Math.abs(a.lat - aim.lat) < 1e-7
      && Math.abs(a.lng - aim.lng) < 1e-7
      && Math.abs(z1 - z0) < 0.05
      && Math.abs(hDelta) < 0.5 && nt0 < 0.5;
    if (still) return;

    /* Raster hybrid rounds the zoom unless this is on, and a rounded
       zoom mid-flight is a staircase instead of a glide. maxZoom is set
       alongside because the fit above can ask for more than the map was
       constructed with, and the lower of the two silently wins — which
       looks like the close-up refusing to get closer on small plots. */
    m.setOptions({ isFractionalZoomEnabled: true, maxZoom: MAP_MAX_Z });

    cancelAnimationFrame(flyRef.current);
    flyingRef.current = true;
    const t0 = performance.now();
    const step = (now) => {
      const t = easeOut(Math.min(1, (now - t0) / ms));
      const center = {
        lat: a.lat + (aim.lat - a.lat) * t,
        lng: a.lng + (aim.lng - a.lng) * t,
      };
      const z = z0 + (z1 - z0) * t;
      if (typeof m.moveCamera === 'function') {
        m.moveCamera({
          center,
          zoom: z,
          heading: wrapDeg(h0 + hDelta * t),
          tilt: nt0 * (1 - t),
        });
      } else { m.setZoom(z); m.setCenter(center); }
      if (t < 1) {
        flyRef.current = requestAnimationFrame(step);
      } else {
        /* The drawing window was held still for the whole flight so it
           couldn't re-render mid-glide. Let it settle at the zoom it
           actually landed on. */
        flyingRef.current = false;
        if (overlayRef.current) overlayRef.current.draw();
      }
    };
    flyRef.current = requestAnimationFrame(step);
  }, [mapRef, pickFrame, overlayRef]);

  /* ── THE GESTURE FLAG ────────────────────────────────────────────
     One pair of calls around every native camera movement. While it is
     up, the drawing window is frozen and hover is ignored, so a turn
     costs no React renders at all — the plan rides the transform, which
     is the whole point of the matrix3d.

     The end is DELAYED past the last pointer event. A turn that ends
     with the finger still moving is followed by a couple of stray
     frames, and settling the window on one of those re-renders the plan
     into a box the view has already left. 180 ms is long enough for
     the camera to have stopped and short enough not to be noticed. */
  const beginTurn = useCallback(() => {
    clearTimeout(settleWinRef.current);
    turningRef.current = true;
  }, []);

  const endTurn = useCallback(() => {
    clearTimeout(settleWinRef.current);
    settleWinRef.current = setTimeout(() => {
      turningRef.current = false;
      if (overlayRef.current) overlayRef.current.draw();
    }, 180);
  }, [overlayRef]);

  useEffect(() => () => clearTimeout(settleWinRef.current), []);

  /* the flight is the user's the moment they touch anything */
  const stopFly = useCallback(() => {
    cancelAnimationFrame(flyRef.current);
    flyingRef.current = false;
  }, []);

  /* ---------------------------------------------------------------
     Zooming ABOUT THE PLOT.

     moveCamera({ zoom }) holds the map CENTRE still, and the centre is
     not the plot: it is offset upward by whatever the bottom sheet
     claims. So zooming in pushed the plot toward the top of the screen
     and eventually off it — which is why zooming in to read a dimension
     never worked. Re-aim at the plot on every step and it stays put
     under the fingers.

     This is the ONLY thing that should change the zoom while a plot is
     raised: pinch, wheel and refit all come through here.
  --------------------------------------------------------------- */
  const zoomAtPlot = useCallback((z) => {
    const m = mapRef.current;
    if (!m) return;
    const f = pickFrame(selRef.current, z);
    if (!f) {
      if (typeof m.moveCamera === 'function') m.moveCamera({ zoom: clamp(z, FLY_MIN_Z, MAP_MAX_Z) });
      else m.setZoom(clamp(z, FLY_MIN_Z, MAP_MAX_Z));
      return;
    }
    if (typeof m.moveCamera === 'function') m.moveCamera({ zoom: f.z, center: f.aim });
    else { m.setZoom(f.z); m.setCenter(f.aim); }
  }, [mapRef, pickFrame]);

  /* ---------------------------------------------------------------
     Re-fitting after a tilt.

     A pick is framed flat, and then the user tilts the view to see the
     block stand up — which squashes the ground in Y and spends the
     block's reach, so the plot ends up smaller than it was framed to
     be. That is the small floating plot with the dimensions too fine to
     read.

     So when a turn ENDS, re-fit to the tilt they finished on. Short and
     eased, so it reads as the view settling rather than a second
     flight. Skipped entirely once they have pinched: a zoom someone
     chose deliberately is never taken back.
  --------------------------------------------------------------- */
  const refitPick = useCallback((msIn = REFIT_MS, force = false) => {
    const ms = reducedMotion() ? 1 : msIn;
    const m = mapRef.current;
    if (!m || !selRef.current) return;
    if (!force && manualZoomRef.current) return;

    const f = pickFrame(selRef.current);
    if (!f) return;

    /* nothing meaningful has changed since this frame was set */
    if (!force && Math.abs(f.tilt - framedTiltRef.current) < 0.02) return;
    framedTiltRef.current = f.tilt;

    const c0 = m.getCenter();
    const z0 = m.getZoom();
    if (!c0) return;
    const a = { lat: c0.lat(), lng: c0.lng() };
    if (!force && Math.abs(f.z - z0) < 0.04) return;

    cancelAnimationFrame(flyRef.current);
    flyingRef.current = true;
    const t0 = performance.now();
    const step = (now) => {
      const t = easeOut(Math.min(1, (now - t0) / ms));
      const center = {
        lat: a.lat + (f.aim.lat - a.lat) * t,
        lng: a.lng + (f.aim.lng - a.lng) * t,
      };
      const z = z0 + (f.z - z0) * t;
      if (typeof m.moveCamera === 'function') m.moveCamera({ center, zoom: z });
      else { m.setZoom(z); m.setCenter(center); }
      if (t < 1) {
        flyRef.current = requestAnimationFrame(step);
      } else {
        flyingRef.current = false;
        if (overlayRef.current) overlayRef.current.draw();
      }
    };
    flyRef.current = requestAnimationFrame(step);
  }, [mapRef, pickFrame, overlayRef]);

  /* ---------------------------------------------------------------
     Back to square — the CSS camera only.

     Eased over the same span as the flight, so the view levels out as
     the camera closes in and the two read as one movement rather than a
     snap followed by a glide. The heading takes the short way round:
     from 350° that is forward 10°.

     This is also what the compass calls while a plot is raised.

     If a picked plot still opens tilted after this, the tilt is being
     applied by usePlanCamera on selection — zero its default there
     too, or this will spend the whole flight undoing it.
  --------------------------------------------------------------- */
  const levelCam = useCallback((msIn = FLY_MS) => {
    const ms = reducedMotion() ? 1 : msIn;
    const c = camRef.current;
    setSpin(false);
    cancelAnimationFrame(levelRef.current);

    /* fold the accumulated heading down to its short equivalent first,
       so a view that has been round three times doesn't unwind three
       times on the way back */
    const s0 = wrapRad(c.spin);
    const t0 = c.tilt;
    c.spin = s0;

    if (Math.abs(s0) < TURNED_EPS && t0 < TURNED_EPS) {
      framedTiltRef.current = 0;
      return;
    }

    const start = performance.now();
    const step = (now) => {
      const e = easeOut(Math.min(1, (now - start) / ms));
      c.spin = s0 * (1 - e);
      c.tilt = t0 * (1 - e);
      if (overlayRef.current) overlayRef.current.draw();
      if (e < 1) {
        levelRef.current = requestAnimationFrame(step);
      } else {
        c.spin = 0;
        c.tilt = 0;
        framedTiltRef.current = 0;
        if (overlayRef.current) overlayRef.current.draw();
        syncTurned();
        bump((n) => n + 1);
      }
    };
    levelRef.current = requestAnimationFrame(step);
  }, [camRef, overlayRef, setSpin, syncTurned, bump]);

  useEffect(() => () => cancelAnimationFrame(levelRef.current), []);

  /* One press of + or −, or one double-tap. Eased rather than jumped,
     because a step change in zoom on satellite imagery reads as a
     glitch. Goes through zoomAtPlot, so the plot does not drift. */
  const nudgeZoom = useCallback((d) => {
    const m = mapRef.current;
    if (!m || !selRef.current) return;
    stopFly();
    manualZoomRef.current = true;
    const z0 = m.getZoom() || 18;
    const z1 = clamp(z0 + d, FLY_MIN_Z, MAP_MAX_Z);
    if (Math.abs(z1 - z0) < 0.01) return;

    const ms = reducedMotion() ? 1 : ZOOM_STEP_MS;
    flyingRef.current = true;
    const t0 = performance.now();
    const step = (now) => {
      const t = easeOut(Math.min(1, (now - t0) / ms));
      zoomAtPlot(z0 + (z1 - z0) * t);
      if (t < 1) {
        flyRef.current = requestAnimationFrame(step);
      } else {
        flyingRef.current = false;
        if (overlayRef.current) overlayRef.current.draw();
      }
    };
    flyRef.current = requestAnimationFrame(step);
  }, [mapRef, stopFly, zoomAtPlot, overlayRef]);

  /* Back to the frame the pick was given, whatever the user has done to
     it since. Hands the frame back to the code, so tilting starts
     re-fitting again. */
  const fitPick = useCallback(() => {
    stopFly();
    manualZoomRef.current = false;
    refitPick(REFIT_MS, true);
  }, [stopFly, refitPick]);

  /* ---------------------------------------------------------------
     The pinch, listened for on the DOCUMENT.

     It used to hang off the orbit surface, which only ever sees a
     gesture if BOTH fingers land on it — and on a phone the quotation
     sheet covers the bottom third of the screen, so most pinches put at
     least one finger somewhere else and nothing happened at all. That
     is the "it doesn't zoom" you are seeing.

     Capture phase on the document sees every touch on the way DOWN,
     before the sheet, the header or anything else can take it, so a
     two-finger pinch ANYWHERE on the screen zooms the raised plot while
     one-finger taps and scrolls inside the sheet carry on working
     untouched.

     `touchmove` is cancelled separately, non-passive, or the browser
     zooms the whole page instead — and on iOS that leaves the map
     behind at the old zoom while the document itself scales.

     Only ever bound while a plot is raised.
  --------------------------------------------------------------- */
  useEffect(() => {
    if (!selected) return undefined;

    const pts = new Map();
    let start = null;

    const onDown = (e) => {
      if (e.pointerType !== 'touch') return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [p, q] = [...pts.values()];
        start = {
          dist: Math.max(1, Math.hypot(q.x - p.x, q.y - p.y)),
          zoom: mapRef.current?.getZoom?.() || 18,
        };
        stopFly();
      }
    };

    const onMove = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size < 2 || !start) return;
      const [p, q] = [...pts.values()];
      const dist = Math.max(1, Math.hypot(q.x - p.x, q.y - p.y));
      manualZoomRef.current = true;
      zoomAtPlot(start.zoom + Math.log2(dist / start.dist) * PINCH_GAIN);
      touched.current = Date.now();
    };

    const onUp = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) start = null;
    };

    /* the browser's own page zoom, refused for the length of a pinch */
    const onTouchMove = (e) => {
      if (e.touches && e.touches.length >= 2 && e.cancelable) e.preventDefault();
    };

    /* Safari does NOT route its pinch through touchmove — it raises its
       own gesturestart/gesturechange, and cancelling touchmove alone
       leaves the page scaling while the map stays put, which is the
       worst of both. Non-standard and WebKit-only; every other engine
       simply never fires these. */
    const onGesture = (e) => { if (e.cancelable) e.preventDefault(); };

    const cap = { capture: true };
    document.addEventListener('pointerdown', onDown, cap);
    document.addEventListener('pointermove', onMove, cap);
    document.addEventListener('pointerup', onUp, cap);
    document.addEventListener('pointercancel', onUp, cap);
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    document.addEventListener('gesturestart', onGesture, { capture: true, passive: false });
    document.addEventListener('gesturechange', onGesture, { capture: true, passive: false });

    return () => {
      document.removeEventListener('pointerdown', onDown, cap);
      document.removeEventListener('pointermove', onMove, cap);
      document.removeEventListener('pointerup', onUp, cap);
      document.removeEventListener('pointercancel', onUp, cap);
      document.removeEventListener('touchmove', onTouchMove, { capture: true });
      document.removeEventListener('gesturestart', onGesture, { capture: true });
      document.removeEventListener('gesturechange', onGesture, { capture: true });
    };
  }, [selected, mapRef, zoomAtPlot, stopFly, touched]);

  useEffect(() => { selRef.current = selected; }, [selected]);
  useEffect(() => { if (!selected) setSpin(false); }, [selected, setSpin]);

  /* usePlanCamera starts its own idle orbit after a while. Zeroing the
     camera per frame would fight that animation to a standstill rather
     than stop it, so the flag itself is refused for as long as the top
     view holds. Turn the view by hand and the orbit is available again,
     because the lock is gone by then. */
  useEffect(() => {
    if (spin && topLockRef.current) setSpin(false);
  }, [spin, setSpin]);
  useEffect(() => () => cancelAnimationFrame(flyRef.current), []);

  /* A pick flies once. `reserve` usually arrives a beat later — the
     panel or bottom sheet has to mount and measure first — and that
     changes flyTo's identity, which used to restart the flight from
     wherever the first one had got to. That restart is the stutter you
     see on a phone. Same plot, second run: re-aim briefly instead.

     Opening or closing a site panel comes through the same path, for
     the same reason: its width lands in `inset`, pickFrame answers
     differently, and the plot slides clear of it in REAIM_MS. */
  useEffect(() => {
    if (!selected) {
      flownRef.current = null;
      manualZoomRef.current = false;
      topLockRef.current = false;
      return;
    }
    const reaim = flownRef.current === selected;
    /* a NEW plot gets a fresh frame; the user's own zoom belonged to
       the last one */
    if (!reaim) manualZoomRef.current = false;
    flownRef.current = selected;

    /* Level and close in together. The fit is computed for where the
       camera is GOING, not where it is — otherwise a pick made from a
       tilted view is framed for headroom that is gone by the time the
       flight lands, and the plot sits small.

       A re-aim is not a new pick: the view is already flat and levelling
       it again would fight whatever tilt the user has since chosen. */
    if (!reaim && TOP_VIEW_ON_PICK) {
      topLockRef.current = true;
      levelCam(FLY_MS);
    }
    flyTo(selected, reaim ? REAIM_MS : FLY_MS, !reaim && TOP_VIEW_ON_PICK);
  }, [selected, flyTo, levelCam]);

  /* A pick turns the CSS camera by itself, and dropping the pick leaves
     whatever heading the user finished on — so both flags are re-read
     on each edge rather than assumed. The native camera is being
     levelled by the flight, so it is given until the flight lands. */
  useEffect(() => {
    syncTurned();
    if (selected) setNativeSpin(false);
    const id = setTimeout(syncNative, FLY_MS + 60);
    return () => clearTimeout(id);
  }, [selected, syncTurned, syncNative]);

  /* ── The 360, with nothing raised ────────────────────────────────
     Heading climbs and wraps, so it goes round and round rather than
     stopping at either end, at whatever zoom you are on. Because the
     map turns about its own centre this circles whatever you have
     centred.

     THE SPEED IS EASED, NOT SWITCHED. The lap comes up to speed over
     roughly 3× SPIN_TAU_MS and falls away just as smoothly the moment a
     hand lands on the glass — a hard start or a hard stop is the thing
     that reads as an animation rather than as a camera. It waits out
     NATIVE_IDLE_MS after the last touch before taking the view back. */
  useEffect(() => {
    if (!nativeSpin || selected) {
      cancelAnimationFrame(nativeRafRef.current);
      spinVelRef.current = 0;
      return undefined;
    }
    spunRef.current = 0;
    turningRef.current = true;
    let last = performance.now();
    const step = (now) => {
      /* A backgrounded tab hands back one enormous dt on return, which
         would jump the heading half a lap in a single frame. */
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = mapRef.current;
      if (m && typeof m.moveCamera === 'function') {
        /* Date.now(), NOT the rAF timestamp. nativeTouchRef is stamped
           with Date.now() — epoch milliseconds — while `now` here is
           performance.now(), milliseconds since the page loaded. The
           two are about 1.7e12 apart, so `now - nativeTouchRef.current`
           is hugely negative and never clears NATIVE_IDLE_MS: once
           anything had been touched even once, idle was false forever
           and the lap sat at zero speed while every manual gesture went
           on working. That is the whole "manual haan, automatic nahi"
           bug. */
        const idle = !nativeTouchRef.current
          || Date.now() - nativeTouchRef.current > NATIVE_IDLE_MS;

        /* What is left of the budget, and the taper that lands the last
           degrees of it gently. Infinity leaves both out of the way. */
        const left = lapBudgetRef.current === Infinity
          ? Infinity
          : lapBudgetRef.current - spunRef.current;
        if (left <= 0.2) {
          setNativeSpin(false);
          return;
        }
        const taper = left === Infinity ? 1 : clamp(left / SPIN_TAPER_DEG, 0, 1);

        const k = 1 - Math.exp(-(dt * 1000) / SPIN_TAU_MS);
        spinVelRef.current += ((idle ? taper : 0) - spinVelRef.current) * k;
        if (spinVelRef.current > 0.001) {
          const deg = Math.min(
            NATIVE_SPIN_DEG_PER_S * spinVelRef.current * dt,
            left,
          );
          spunRef.current += deg;
          m.moveCamera({ heading: wrapDeg((m.getHeading() || 0) + deg) });
        }
      }
      nativeRafRef.current = requestAnimationFrame(step);
    };
    nativeRafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(nativeRafRef.current);
      endTurn();
    };
  }, [nativeSpin, selected, mapRef, endTurn]);

  useEffect(() => () => cancelAnimationFrame(nativeRafRef.current), []);

  /* ── The opening: lean, pull back, then lap ──────────────────────
     Armed once the map exists. By the time INTRO_WAIT_MS is up the fit
     has run twice — once at construction and again on the map's first
     idle — so this leans away from a frame that is already correct.

     The lean and the pull-back go together: a tilted camera crops the
     near edge, and INTRO_PULL is what keeps the front row of plots on
     screen through it.

     GIVEN UP THE INSTANT ANYONE TOUCHES THE MAP or picks a plot, at any
     point — before the delay is up, or halfway through the lean.
     Someone who has already grabbed the map is looking at something,
     and an intro that pulls the camera off them is worse than none.

     Reduced motion gets the fit and nothing else. */
  useEffect(() => {
    if (!INTRO_LEAN || !map || selected || introDoneRef.current) return undefined;
    if (typeof map.moveCamera !== 'function') return undefined;
    if (reducedMotion()) { introDoneRef.current = true; return undefined; }

    let raf = 0;
    let timer = 0;

    const lean = () => {
      if (selRef.current) return;

      /* A tap while the tiles were still landing is not a decision to
         take the camera — someone poking a loading screen should not
         lose the opening for good. Wait until they have been still for
         NATIVE_IDLE_MS and try again, rather than giving up. */
      if (nativeTouchRef.current
        && Date.now() - nativeTouchRef.current < NATIVE_IDLE_MS) {
        timer = setTimeout(lean, 400);
        return;
      }

      introDoneRef.current = true;
      const mark = Date.now();

      const tilt = Math.min(INTRO_TILT_DEG, NATIVE_MAX_TILT_DEG);
      introTiltRef.current = tilt;
      const z0 = map.getZoom() || 18;
      const t0 = performance.now();

      const step = (now) => {
        /* theirs now — leave the camera exactly where they put it */
        if (selRef.current || nativeTouchRef.current > mark) return;
        const e = easeInOut(Math.min(1, (now - t0) / INTRO_MS));
        map.moveCamera({ tilt: tilt * e, zoom: z0 - INTRO_PULL * e });
        if (e < 1) {
          raf = requestAnimationFrame(step);
        } else {
          syncNative();
          /* The lean is done. Whether anything turns from here is
             INTRO_LAPS' business — at 0 the camera simply waits for a
             hand. */
          if (INTRO_LAPS > 0) {
            lapBudgetRef.current = 360 * INTRO_LAPS;
            setNativeSpin(true);
          }
        }
      };
      raf = requestAnimationFrame(step);
    };

    timer = setTimeout(lean, INTRO_WAIT_MS);

    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [map, selected, syncNative]);

  /* Back to north and flat, the short way round — from 350° that is
     forward 10°, not backward 350°. The compass calls this while
     nothing is picked; levelCam is its opposite number for a raised
     plot. */
  const nativeFaceNorth = useCallback(() => {
    const m = mapRef.current;
    if (!m || typeof m.moveCamera !== 'function') return;
    setNativeSpin(false);
    const h0 = wrapDeg(m.getHeading() || 0);
    const t0 = m.getTilt() || 0;
    const d = h0 > 180 ? 360 - h0 : -h0;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 500);
      const e = easeOut(k);
      m.moveCamera({ heading: wrapDeg(h0 + d * e), tilt: t0 * (1 - e) });
      if (k < 1) requestAnimationFrame(step);
      else syncNative();
    };
    requestAnimationFrame(step);
  }, [mapRef, syncNative]);

  /* Whichever camera is live, back to north. This is the compass's
     whole job. */
  const resetHeading = useCallback(() => {
    if (selRef.current) levelCam(500);
    else nativeFaceNorth();
  }, [levelCam, nativeFaceNorth]);

  /* Back out to the whole layout when a plot is dismissed, so closing a
     plot returns you to where you can pick the next one instead of
     leaving you zoomed into empty ground.

     The lean and the heading survive it — fitPlan puts them back — so
     you get the overview at the angle you were working at, not a map
     snapped flat under you. Only the endless lap is picked back up; a
     counted one was spent before the plot was ever opened. */
  useEffect(() => {
    if (selected || !map) return;
    if (shownRef.current === null) return;   // nothing was ever up
    fitPlan();
    if (INTRO_LAPS === Infinity && !reducedMotion()) {
      lapBudgetRef.current = Infinity;
      setNativeSpin(true);
    }
  }, [selected, map, fitPlan]);

  /* ---------------------------------------------------------------
     Watching the element, not the window.

     `window.resize` misses most of what actually changes this map's
     shape: a details panel opening beside it, a sheet animating up, the
     parent laying out after fonts land, a desktop sidebar collapsing —
     the window never changes size for any of them, and the map is left
     framed for a box it no longer occupies.

     ResizeObserver watches the box itself. visualViewport catches the
     one the observer misses on a phone: the address bar sliding away
     and the on-screen keyboard, which change what you can SEE without
     changing any element's size.

     All of it collapses into one debounced call, because a sheet
     animating open fires this thirty times in half a second.
  --------------------------------------------------------------- */
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return undefined;

    let timer = 0;
    const settle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        /* Only while nothing is picked: re-framing under someone who has
           flown in on a plot would throw away the view they are working
           in, and a phone's address bar sliding away counts as a
           resize. */
        if (selRef.current) return;
        /* fitPlan hands the heading and tilt back afterwards, so a
           sliding address bar re-frames the layout without flattening
           the view someone is looking at. */
        fitPlan();
      }, RESIZE_SETTLE_MS);
    };

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(settle);
      ro.observe(el);
    }
    window.addEventListener('resize', settle);
    window.addEventListener('orientationchange', settle);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', settle);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', settle);
      window.removeEventListener('orientationchange', settle);
      if (vv) vv.removeEventListener('resize', settle);
    };
  }, [fitPlan, mapRef]);

  /* Sink whatever is up, swap the drawn plot, raise the new one. Height
     lives in a ref because it is read inside the draw callback, which
     runs per frame and must not depend on React having re-rendered.

     The ramp draws and nothing else — no bump per frame. The walls it
     is animating are painted by hand now, so React has nothing to do
     until the block has finished moving. */
  useEffect(() => {
    if (selected === shownRef.current) return undefined;
    let raf = 0;

    const ramp = (from, to, ms, then) => {
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        riseRef.current = from + (to - from) * easeOut(t);
        if (overlayRef.current) overlayRef.current.draw();
        if (t < 1) raf = requestAnimationFrame(step);
        else {
          bump((n) => n + 1);
          if (then) then();
        }
      };
      raf = requestAnimationFrame(step);
    };

    const raise = () => {
      shownRef.current = selected;
      setShown(selected);
      if (selected) ramp(0, 1, UP_MS);
      else {
        riseRef.current = 0;
        paintWalls(null);
      }
    };

    if (shownRef.current) ramp(riseRef.current, 0, DOWN_MS, raise);
    else raise();

    return () => cancelAnimationFrame(raf);
  }, [selected, overlayRef, bump, paintWalls]);

  /* How much bigger than the viewport the map has to be so that turning
     the CONTAINER never exposes a corner. Inverse-transform the
     viewport corners into container space and take the worst case over
     all headings.

     Keyed to the CSS camera only. The native rotation transforms
     nothing, so browsing a turned map — and the opening orbit — costs
     no oversizing at all. This stays at {0,0} until a plot is picked. */
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

    /* Same reasoning as the re-frame above: the container can change
       size without the window doing anything. An under-sized container
       shows a bare corner the moment the view is turned. */
    let ro = null;
    const el = viewRef.current;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(el);
    }
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
    };
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
      /* Without a Map ID set to Vector there is no native camera: the
         free 360 and the opening orbit do nothing on any device, and
         the compass will never appear, though a picked plot still
         behaves exactly as before. */
      ...(GOOGLE_MAP_STYLE_ID ? { mapId: GOOGLE_MAP_STYLE_ID } : {}),

      /* ── THE THREE LINES THE 360 LIVES OR DIES BY ────────────────
         renderingType overrides whatever the Map ID's cloud config
         says, and the two interaction flags turn tilt and heading on.

         A Map ID can be Vector and STILL refuse to turn: Tilt and
         Rotation are separate checkboxes on it in the Cloud console,
         and with them unticked moveCamera({ heading, tilt }) is
         accepted and silently ignored — which looks exactly like
         broken code and is why this is forced here instead.

         On a raster fallback 'hybrid' only rotates in 90° steps, and
         only where Google has 45° imagery, which most plot sites do
         not. That is the "nothing moves at all" case. */
      renderingType: maps.RenderingType.VECTOR,
      tiltInteractionEnabled: true,
      headingInteractionEnabled: true,
      tilt: 0,
      heading: 0,
      streetViewControl: false,
      fullscreenControl: false,
      /* Google's own rotate control is off because the compass above
         replaces it: one dial that reads whichever camera is live,
         rather than a control that only knows about the native one. */
      rotateControl: false,
      mapTypeControl: false,
      zoomControlOptions: { position: maps.ControlPosition.RIGHT_BOTTOM },
      /* 'greedy' also hands Google's built-in rotate and tilt gestures
         to the map — two fingers on touch, ctrl-drag on a desktop — on
         top of the drag handled below. */
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
       size, and is skipped if a plot has already been picked.

       INTRO_WAIT_MS is measured against this: the opening lean starts
       after the second fit, not before it. */
    fitPlan(m);
    maps.event.addListenerOnce(m, 'idle', () => {
      if (!selRef.current) fitPlan(m);
    });

    /* Turn this on before debugging anything about the rotation. The
       first line says which renderer actually loaded; the second says
       whether the camera accepted a turn. VECTOR followed by real
       numbers means the rendering is fine and the problem is in the
       motion. RASTER, or VECTOR followed by 0 0, means the Map ID or
       the flags above — no amount of code will move it. */
    if (CAMERA_DEBUG) {
      maps.event.addListenerOnce(m, 'tilesloaded', () => {
        // eslint-disable-next-line no-console
        console.log('rendering:', m.getRenderingType());
        m.moveCamera({ heading: 45, tilt: 45 });
        setTimeout(() => {
          // eslint-disable-next-line no-console
          console.log('after moveCamera:', m.getHeading(), m.getTilt());
          m.moveCamera({ heading: 0, tilt: 0 });
        }, 400);
      });
    }

    onReady();
  }, [maps, mapRef, toLL, bounds, onReady, fitPlan]);

  /* Google's own gestures move the native camera without going through
     this file, so the flag that offers the compass is kept in step by
     listening to the map rather than by being written to. */
  useEffect(() => {
    if (!map || !maps) return undefined;
    const ls = ['heading_changed', 'tilt_changed']
      .map((ev) => maps.event.addListener(map, ev, syncNative));
    syncNative();
    return () => ls.forEach((l) => maps.event.removeListener(l));
  }, [map, maps, syncNative]);

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

     This copes with a natively rotated map without being told about it:
     the four window corners are projected one by one and quadMatrix
     takes whatever quadrilateral comes back, turned or not. That is
     what carries the opening orbit — the plan rides the imagery round
     without this file doing anything special about it.
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

      /* ── WHAT THE VIEWPORT COVERS, MADE HEADING-PROOF ─────────
         A SQUARE about the view centre, wide enough to hold the
         viewport whichever way the camera is pointing.

         It used to be the bounding box of the four projected corners,
         which is a different box at every heading: turn the map and the
         box grows and shrinks continuously, crosses the window edge
         several times a second, and each crossing calls setWin — a full
         React re-render of the entire plan, mid-turn. That is the
         flicker. Nothing about the ground has changed; only the shape
         of the axis-aligned box around it.

         Centre and radius don't rotate, so this window is the same
         window at 0° and at 217°, and a turn re-renders nothing at all.
         The cost is drawing a corner or two more of the layout than is
         strictly on screen.

         The radius is capped at the screen diagonal in ground metres:
         under a steep tilt the top corners project out toward the
         horizon, and an uncapped radius would swallow the whole drawing
         and rasterise it at MAX_SHEET, which is soft type on every
         plot. */
      const W = hostRef.current.clientWidth;
      const H = hostRef.current.clientHeight;
      const mid = proj.fromContainerPixelToLatLng(new maps.Point(W / 2, H / 2));
      if (!mid) return;
      const cd = toDraw(mid.lat(), mid.lng());
      const cap = Math.hypot(W, H) / pxPerM;
      let r = 0;
      [[0, 0], [W, 0], [0, H], [W, H]].forEach(([cx, cy]) => {
        const ll = proj.fromContainerPixelToLatLng(new maps.Point(cx, cy));
        if (!ll) return;
        const q = toDraw(ll.lat(), ll.lng());
        r = Math.max(r, Math.hypot(q[0] - cd[0], q[1] - cd[1]));
      });
      r = Math.min(r || cap * 0.5, cap) * 1.35;   // 1.35 = room to pan into
      const nw = {
        x0: clamp(cd[0] - r, bounds.x0 - PAD, bounds.x1 + PAD),
        y0: clamp(cd[1] - r, bounds.y0 - PAD, bounds.y1 + PAD),
        x1: clamp(cd[0] + r, bounds.x0 - PAD, bounds.x1 + PAD),
        y1: clamp(cd[1] + r, bounds.y0 - PAD, bounds.y1 + PAD),
        s: pxPerM,
      };
      const cur = winRef.current;

      /* Re-render only when the view has genuinely left the window, or
         the zoom has moved enough to matter. Everything in between rides
         the transform, which is what keeps panning cheap.

         The band is wide, and NOTHING re-renders mid-flight. A 900 ms
         glide used to cross the old band two or three times, and each
         crossing re-rendered the entire plan SVG — that is the hitch
         halfway into a pick. The window is left alone until the camera
         has landed, then settled once by the flight's own last frame.

         The opening orbit turns without panning or zooming, so the
         window it was fitted for stays valid for the whole lap and this
         costs nothing while the map is turning. */
      const outside = nw.x0 < cur.x0 - 0.01 || nw.y0 < cur.y0 - 0.01
        || nw.x1 > cur.x1 + 0.01 || nw.y1 > cur.y1 + 0.01;
      const rescaled = pxPerM / cur.s > 1.6 || pxPerM / cur.s < 0.45;
      /* Not while the camera is being moved. A flight, a turn, a tilt
         or a lap all ride the transform; the window is settled once,
         afterwards, by the gesture's own last draw. */
      if ((outside || rescaled) && !flyingRef.current && !turningRef.current) {
        setWin(nw);
        return;
      }

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
        paintWalls(null);
        paintDims(null);
        return;
      }

      /* The container is what turns, so the lift has to be expressed in
         container coordinates: take the straight-up screen offset the
         block needs and run it back through the camera. Otherwise the
         block would rise sideways as soon as you turned the view. */
      const cam = camRef.current;

      /* held flat until the user turns it themselves — see topLockRef */
      if (topLockRef.current) { cam.spin = 0; cam.tilt = 0; }

      const ct = Math.cos(cam.tilt);
      const rise = LIFT_H * pxPerM * Math.sin(cam.tilt) * riseRef.current;
      if (rise < 0.5) {
        dLift.style.transform = m;
        paintWalls(null);
        paintDims(null);
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

      const faces = ring.map((_, i) => {
        const u = ring[i];
        const v = ring[(i + 1) % ring.length];
        return {
          i,
          // nearness after the turn: project the edge onto the screen-down axis
          depth: (u.y + v.y) * Math.cos(cam.spin) - (u.x + v.x) * Math.sin(cam.spin),
          d: `M${u.x} ${u.y}L${v.x} ${v.y}`
            + `L${v.x + up.x} ${v.y + up.y}L${u.x + up.x} ${u.y + up.y}Z`,
        };
      }).sort((u, v) => u.depth - v.depth);

      paintWalls({ x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 }, faces);

      /* ── the figures ──────────────────────────────────────────
         One per edge, sitting on the TOP face of the raised block
         (hence + up), pushed clear of the edge along the outward
         direction, and turned back upright against the camera.

         Everything is measured on SCREEN before it is used: an edge is
         skipped when it is too short to carry a figure legibly at this
         zoom, and the offset is a screen distance mapped back into
         container coordinates, so a label sits the same distance off
         its edge whether the view is flat or tilted right over. */
      if (!SCREEN_DIMS) { paintDims(null); return; }

      const cs = Math.cos(cam.spin);
      const ss = Math.sin(cam.spin);
      const gx = ring.reduce((s2, p) => s2 + p.x, 0) / ring.length;
      const gy = ring.reduce((s2, p) => s2 + p.y, 0) / ring.length;
      const items = [];

      for (let i = 0; i < ring.length; i += 1) {
        const u = ring[i];
        const v = ring[(i + 1) % ring.length];
        const a = sel.pts[i];
        const b = sel.pts[(i + 1) % sel.pts.length];

        /* the edge as the screen sees it, to decide if it can carry a
           figure at all */
        const dxc = v.x - u.x;
        const dyc = v.y - u.y;
        const ex = dxc * cs - dyc * ss;
        const ey = (dxc * ss + dyc * cs) * ct;
        if (Math.hypot(ex, ey) < DIM_MIN_EDGE) continue;

        /* outward, normalised in SCREEN px, then mapped back into
           container coordinates */
        const mx = (u.x + v.x) / 2;
        const my = (u.y + v.y) / 2;
        const ox = mx - gx;
        const oy = my - gy;
        const osx = ox * cs - oy * ss;
        const osy = (ox * ss + oy * cs) * ct;
        const n = Math.hypot(osx, osy) || 1;
        const fx = (osx / n) * DIM_OFFSET;
        const fy = (osy / n) * DIM_OFFSET;
        const kx = fx * cs + (fy / ct) * ss;
        const ky = (fy / ct) * cs - fx * ss;

        const metres = Math.hypot(b[0] - a[0], b[1] - a[1]);
        items.push({
          x: mx + up.x + kx,
          y: my + up.y + ky,
          rot: -cam.spin / RAD,
          sy: 1 / ct,
          label: `${metres >= 10 ? metres.toFixed(1) : metres.toFixed(2)} m`,
        });
      }

      paintDims({
        x: bx0 - DIM_PAD,
        y: by0 - DIM_PAD,
        w: (bx1 - bx0) + DIM_PAD * 2,
        h: (by1 - by0) + DIM_PAD * 2,
      }, items);
    };
    if (overlayRef.current) overlayRef.current.draw();
  }, [
    maps, map, layout, toLL, toDraw, bounds, selected, shown, win,
    camRef, overlayRef, paintWalls, paintDims,
  ]);

  /* ── Turning the view, plot raised ───────────────────────────────
     The CSS camera. Apply a delta measured from wherever the grab
     started, then redraw. Measuring from the start rather than frame to
     frame is what stops it jumping on the first move.

     Draw only. No bump, no syncTurned — both are setState, and per
     frame they re-render the plan under a moving camera for no visible
     gain. They run once at the end of the gesture instead. The compass
     needle does not wait for them: it reads camRef on its own rAF. */
  const applyTurn = useCallback((dSpin, dTilt, from) => {
    /* A deliberate turn, not the jitter of a finger resting on the
       glass. Past this the view is theirs and the top-view hold is
       done — for this pick; the next one starts flat again. */
    if (Math.abs(dSpin) > 0.01 || Math.abs(dTilt) > 0.01) {
      topLockRef.current = false;
    }
    camRef.current.spin = from.spin + dSpin;
    camRef.current.tilt = clamp(from.tilt + dTilt, 0, MAX_TILT);
    if (overlayRef.current) overlayRef.current.draw();
    touched.current = Date.now();
  }, [camRef, overlayRef, touched]);

  /* With a plot raised the whole surface orbits on a plain drag. */
  const startOrbit = (e) => {
    stopFly();
    touched.current = Date.now();
    if (!selRef.current) return;

    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchRef.current.size === 2) {
      const points = [...pinchRef.current.values()];
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      pinchStartRef.current = {
        distance: Math.hypot(dx, dy),
        zoom: mapRef.current?.getZoom?.() || 18,
      };
      dragRef.current = null;
      return;
    }

    dragRef.current = {
      x: e.clientX, y: e.clientY,
      spin: camRef.current.spin, tilt: camRef.current.tilt, moved: false,
    };
  };

  const onPointerMove = (e) => {
    if (pinchRef.current.has(e.pointerId)) {
      pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pinchRef.current.size >= 2) {
      const start = pinchStartRef.current;
      const points = [...pinchRef.current.values()];
      if (!start || points.length < 2) return;

      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const zoomDelta = Math.log2(distance / Math.max(1, start.distance));
      const nextZoom = clamp(
        start.zoom + zoomDelta * PINCH_GAIN,
        FLY_MIN_Z,
        MAP_MAX_Z,
      );

      /* the plot stays under the fingers, and the frame is theirs from
         here on — no refit will take this zoom back */
      manualZoomRef.current = true;
      zoomAtPlot(nextZoom);
      touched.current = Date.now();
      return;
    }

    const g = dragRef.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) g.moved = true;
    applyTurn(dx * 0.008, -dy * 0.006, g);
  };

  const endDrag = (e) => {
    pinchRef.current.delete(e?.pointerId);

    if (pinchRef.current.size < 2) {
      pinchStartRef.current = null;
    }

    touched.current = Date.now();

    // Do not interpret the end of a pinch as a tap.
    if (pinchRef.current.size > 0 || pinchStartRef.current) {
      dragRef.current = null;
      if (pinchRef.current.size === 0) pinchStartRef.current = null;
      syncTurned();
      bump((n) => n + 1);
      return;
    }

    dragRef.current = null;
    syncTurned();
    bump((n) => n + 1);
    refitPick();
  };

  const draggedJustNow = () => !!(dragRef.current && dragRef.current.moved);

  /* ── TURNING THE MAP, FROM ANYWHERE, ON ANY DEVICE ───────────────
     The turn, the tilt and the zoom of the UNPICKED map, listened for
     on the DOCUMENT in the capture phase — touch and mouse both.

     It used to hang off the map's own element, which meant BOTH fingers
     had to land on bare map. On a phone the logo header, the filter
     button, the legend and the toggles cover a good part of the screen,
     so half the twists people actually make started on one of those and
     did nothing at all — "rotation kabhi chalta hai, kabhi nahi". The
     capture phase sees every touch on the way DOWN, before any of that
     chrome can take it, so a two-finger gesture ANYWHERE turns the map
     while one-finger taps on those controls keep working untouched.

     All three axes come off the one gesture: the twist between the
     fingers is the heading, sliding them up and down together is the
     tilt, spreading them is the zoom. Computed here rather than left to
     Google, whose own two-finger handling differs by platform and gives
     no tilt below certain zooms — which is the other half of why this
     behaved differently on every device.

     One finger still pans, which is what anyone expects of a map.

     MOUSE: a plain left drag turns and tilts, from anywhere over the
     map — including over the header and the panels, for the same
     reason. Drags that start on something interactive are left alone,
     or a button press would swing the camera. That INTERACTIVE list is
     what keeps the compass and the site rail clickable.

     `touchmove` is cancelled non-passive for the length of a
     two-finger gesture, and Safari's own gesturestart/gesturechange
     with it, or the browser zooms the page instead.

     NONE OF IT WORKS ON A RASTER MAP. If a device somewhere refuses to
     turn, that device fell back off the vector renderer — turn on
     CAMERA_DEBUG and the console will say so. */
  const INTERACTIVE = 'button, a, input, select, textarea, label, [role="button"]';
  useEffect(() => {
    if (selected) return undefined;

    const onDown = (e) => {
      const m = mapRef.current;
      if (!m || typeof m.moveCamera !== 'function') return;

      if (e.pointerType !== 'touch') {
        if (e.button !== 0) return;
        if (e.target && e.target.closest && e.target.closest(INTERACTIVE)) return;
        stopFly();
        beginTurn();
        nativeTouchRef.current = Date.now();
        nativeDragRef.current = {
          x: e.clientX, y: e.clientY,
          heading: m.getHeading() || 0, tilt: m.getTilt() || 0,
        };
        m.setOptions({ draggable: false });
        return;
      }

      natPtrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      nativeTouchRef.current = Date.now();
      if (natPtrs.current.size === 2) {
        const [p, q] = [...natPtrs.current.values()];
        natGesture.current = {
          angle: Math.atan2(q.y - p.y, q.x - p.x),
          dist: Math.max(1, Math.hypot(q.x - p.x, q.y - p.y)),
          midY: (p.y + q.y) / 2,
          heading: m.getHeading() || 0,
          tilt: m.getTilt() || 0,
          zoom: m.getZoom() || 18,
        };
        stopFly();
        beginTurn();
        /* take the gesture over completely, or Google acts on the same
           two fingers and the view turns twice as far as the hand */
        m.setOptions({ gestureHandling: 'none', draggable: false });
      }
    };

    const onMove = (e) => {
      /* mouse: heading off the horizontal, tilt off the vertical, both
         measured from where the drag began */
      const d = nativeDragRef.current;
      if (d && e.pointerType !== 'touch') {
        const m2 = mapRef.current;
        if (!m2) return;
        nativeTouchRef.current = Date.now();
        m2.moveCamera({
          heading: wrapDeg(d.heading + (e.clientX - d.x) * NATIVE_SPIN_PER_PX),
          tilt: clamp(d.tilt - (e.clientY - d.y) * NATIVE_TILT_PER_PX, 0, NATIVE_MAX_TILT_DEG),
        });
        return;
      }

      if (!natPtrs.current.has(e.pointerId)) return;
      natPtrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = natGesture.current;
      const m = mapRef.current;
      if (!g || !m || natPtrs.current.size < 2) return;

      const [p, q] = [...natPtrs.current.values()];
      let dA = (Math.atan2(q.y - p.y, q.x - p.x) - g.angle) / RAD;
      if (dA > 180) dA -= 360;
      if (dA < -180) dA += 360;

      const dist = Math.max(1, Math.hypot(q.x - p.x, q.y - p.y));
      const midY = (p.y + q.y) / 2;

      m.moveCamera({
        /* flip this sign if the map turns against the fingers */
        heading: wrapDeg(g.heading - dA),
        tilt: clamp(g.tilt + (g.midY - midY) * NATIVE_TILT_PER_PX, 0, NATIVE_MAX_TILT_DEG),
        zoom: clamp(g.zoom + Math.log2(dist / g.dist), FLY_MIN_Z, MAP_MAX_Z),
      });
      nativeTouchRef.current = Date.now();
    };

    const onUp = (e) => {
      if (nativeDragRef.current) {
        nativeDragRef.current = null;
        const m2 = mapRef.current;
        if (m2 && !selRef.current) m2.setOptions({ draggable: true });
      }
      natPtrs.current.delete(e.pointerId);
      if (natGesture.current && natPtrs.current.size < 2) {
        natGesture.current = null;
        const m = mapRef.current;
        if (m && !selRef.current) {
          m.setOptions({ gestureHandling: 'greedy', draggable: true });
        }
      }
      nativeTouchRef.current = Date.now();
      if (!natGesture.current && !nativeDragRef.current) endTurn();
      syncNative();
    };

    const onTouchMove = (e) => {
      if (natGesture.current && e.cancelable) e.preventDefault();
    };
    const onGesture = (e) => { if (e.cancelable) e.preventDefault(); };

    const cap = { capture: true };
    document.addEventListener('pointerdown', onDown, cap);
    document.addEventListener('pointermove', onMove, cap);
    document.addEventListener('pointerup', onUp, cap);
    document.addEventListener('pointercancel', onUp, cap);
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    document.addEventListener('gesturestart', onGesture, { capture: true, passive: false });
    document.addEventListener('gesturechange', onGesture, { capture: true, passive: false });

    return () => {
      document.removeEventListener('pointerdown', onDown, cap);
      document.removeEventListener('pointermove', onMove, cap);
      document.removeEventListener('pointerup', onUp, cap);
      document.removeEventListener('pointercancel', onUp, cap);
      document.removeEventListener('touchmove', onTouchMove, { capture: true });
      document.removeEventListener('gesturestart', onGesture, { capture: true });
      document.removeEventListener('gesturechange', onGesture, { capture: true });
      natPtrs.current.clear();
      natGesture.current = null;
      nativeDragRef.current = null;
    };
  }, [selected, mapRef, stopFly, syncNative, beginTurn, endTurn]);

  /* Any touch of the map hands the auto-spin back to the user. */
  const noteNativeTouch = () => { nativeTouchRef.current = Date.now(); };

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

    pinchRef.current.delete(e.pointerId);

    // A pinch must never become a plot click when the second finger lifts.
    if (pinchStartRef.current) {
      if (pinchRef.current.size < 2) pinchStartRef.current = null;
      dragRef.current = null;
      touched.current = Date.now();
      syncTurned();
      bump((n) => n + 1);
      return;
    }

    touched.current = Date.now();
    dragRef.current = null;
    syncTurned();
    bump((n) => n + 1);

    if (g && g.moved) { refitPick(); return; }

    /* A second tap in the same place, quickly, means closer — the
       gesture everyone tries first on a map, and the one that needs no
       second finger to land anywhere in particular. */
    const now = Date.now();
    const last = tapRef.current;
    tapRef.current = { x: e.clientX, y: e.clientY, t: now };
    if (last && now - last.t < DOUBLE_TAP_MS
      && Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_TAP_PX) {
      tapRef.current = null;
      nudgeZoom(ZOOM_STEP);
      return;
    }

    const name = pickThrough(e);
    if (name && name !== selRef.current) onSelect(name);
  };

  /* Google positions its drag and wheel handling from raw client
     coordinates, which the container transform invalidates. Rather than
     let it pan to the wrong place, take both over while a plot is up.
     Anything the native turn switched off is switched back on here, so
     a gesture interrupted by a pick can't leave the map dead. */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (selected) {
      natPtrs.current.clear();
      natGesture.current = null;
      nativeDragRef.current = null;
    }
    m.setOptions({
      draggable: !selected,
      scrollwheel: !selected,
      gestureHandling: 'greedy',
    });
  }, [selected, mapRef, map]);

  /* The flight leaves the zoom on a fraction, so step from the nearest
     whole one — otherwise every wheel notch inherits the drift. Only
     while a plot is up; otherwise the map's own wheel zoom is fine. */
  const onWheel = useCallback((e) => {
    const m = mapRef.current;
    if (!selected || !m) return;
    e.preventDefault();
    stopFly();
    wheelRef.current += e.deltaY;
    if (Math.abs(wheelRef.current) < 12) return;

    const currentZoom = m.getZoom() || 18;
    const direction = wheelRef.current > 0 ? -1 : 1;
    const step = Math.min(0.6, Math.max(0.18, Math.abs(wheelRef.current) / 120));
    const nextZoom = clamp(
      currentZoom + direction * step,
      FLY_MIN_Z,
      MAP_MAX_Z,
    );

    manualZoomRef.current = true;
    zoomAtPlot(nextZoom);

    wheelRef.current = 0;
  }, [selected, mapRef, stopFly, zoomAtPlot]);

  /* React registers its root `wheel` listener as PASSIVE (17 and
     later), so e.preventDefault() inside an onWheel prop is ignored and
     the browser scrolls or zooms the page underneath the raised plot.
     Bind it on the element ourselves, non-passive, where the cancel
     actually takes.

     macOS trackpad pinch arrives here too, as ctrl+wheel, which is also
     the browser's own page-zoom gesture — the same cancel covers it. */
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const shownPlot = shown ? layout.byName.get(shown) : null;

  /* the window, in the units each layer needs */
  const spanX = win.x1 - win.x0;
  const spanY = win.y1 - win.y0;
  const sheetS = Math.min(win.s, MAX_SHEET / Math.max(spanX, spanY));
  const viewBox = `${win.x0} ${win.y0} ${spanX} ${spanY}`;
  const sheetW = spanX * sheetS;
  const sheetH = spanY * sheetS;

  /* Stable, so PlanContentMemo can actually hold. An inline arrow here
     would hand it a new prop every render and the memo would never
     hit. */
  const onPickPlot = useCallback((name) => {
    if (dragRef.current && dragRef.current.moved) return;
    onSelect(name);
  }, [onSelect]);

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
      onMouseLeave={() => setHoverSafe(null)}
    >
      <PlanContentMemo
        layout={layout}
        selected={shown}
        matches={shownMatches}
        status={status}
        showNumbers={numbersOn}
        showStatus={statusOn}
        hover={hover}
        setHover={setHoverSafe}
        onPick={onPickPlot}
      />
    </svg>,
    divs.plan,
  );

  /* Two nodes, mounted once, written to by paintWalls and paintDims.
     Neither is re-rendered per frame — see paintWalls for why. They
     share the wall pane because it is the one layer that carries NO
     matrix3d of its own: its contents are already in container pixels,
     which is what both painters produce.

     The figures come second so they sit over the walls. */
  const wallLayer = divs && createPortal(
    <>
      <svg
        ref={wallSvgRef}
        style={{
          position: 'absolute', left: 0, top: 0,
          display: 'none', pointerEvents: 'none',
        }}
      />
      <svg
        ref={dimSvgRef}
        style={{
          position: 'absolute', left: 0, top: 0,
          display: 'none', pointerEvents: 'none', overflow: 'visible',
        }}
      />
    </>,
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
      {/* The figures moved to the screen-space layer above — see
          SCREEN_DIMS. Leaving this on as well would print every
          measurement twice, once legibly and once not. */}
      {!SCREEN_DIMS && <DimensionOverlay plot={shownPlot} />}
    </svg>,
    divs.lift,
  );

  return (
    <>
      {/* The window you see through. With a plot raised the map inside
          is deliberately larger, because the container turns; with
          nothing raised pad is {0,0} and the map sits flush, because
          the rotation is the map's own and nothing is transformed. */}
      <div
        ref={viewRef}
        onTouchStart={noteNativeTouch}
        onPointerDown={noteNativeTouch}
        onContextMenu={(e) => e.preventDefault()}
        className="plan-map-viewport"
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

      {/* orbit surface: covers the map while a plot is up. The quotation
          sheet is expected to sit above this with pointer-events:none on
          its non-interactive shell, so two-finger gestures can continue
          through the sheet while its buttons remain clickable. */}
      {selected && (
        <div
          onPointerDown={startOrbit}
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

      {/* North, and the way back to it. Always on screen, reading
          whichever camera is live — see Compass. */}
      <Compass
        mapRef={mapRef}
        camRef={camRef}
        selectedRef={selRef}
        onReset={resetHeading}
      />

      {/* The site rail. Sits under the compass — which is always there
          now, so the offset is fixed — and STEPS ASIDE by the width of
          whatever is open rather than hiding: with the tab strip gone,
          this is the only way to reach the other two, so hiding it
          would strand you in whichever panel you opened first. On a
          phone the panel comes up from the bottom and claims no width,
          so the rail doesn't move.

          zIndex 8 puts it over the panel it has moved alongside. */}
      <div
        style={{
          position: 'absolute', zIndex: 8,
          right: safeArea('right', PANEL_GAP + (panelInset?.right || 0)),
          top: FIT_PAD.top + 56,
          display: 'grid', gap: 8, justifyItems: 'center',
        }}
      >
        {PANELS.map((t) => {
          const on = panel === t.k;
          return (
            <button
              key={t.k}
              type="button"
              title={t.label}
              aria-label={t.label}
              aria-pressed={on}
              onPointerDown={(e) => e.stopPropagation()}
              /* pressing the open one closes it, so the rail is the
                 switch as well as the way in */
              onClick={() => setPanel((p) => (p === t.k ? null : t.k))}
              style={{
                /* 44 wide keeps the touch target; 50 tall is what the
                   mark and its word need without either being cramped */
                width: 44, height: 50,
                color: on ? CANVAS : '#E7E1D5',
                background: on ? ACCENT : CANVAS,
                border: `1px solid ${on ? ACCENT : HAIR}`,
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                padding: 0,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                WebkitAppearance: 'none', appearance: 'none',
              }}
            >
              <PanelIcon name={t.k} />
              <span style={{ font: `500 8px/1 ${MONO}`, letterSpacing: '0.02em' }}>
                {t.short}
              </span>
            </button>
          );
        })}
      </div>

      {/* One at a time. Switching unmounts one and mounts the next in
          the same commit, so the outgoing panel's onWidth(null) lands
          before the incoming one measures — `inset` goes straight to
          the new width instead of dipping through zero and re-aiming
          the camera twice. */}
      {panel === 'info' && (
        <InfoPanel site={site} onWidth={setPanelInset} onClose={() => setPanel(null)} />
      )}
      {panel === 'gallery' && (
  <GalleryPanel site={site} mapId={mapId} onWidth={setPanelInset} onClose={() => setPanel(null)} />
)}
      {panel === 'brochures' && (
        <BrochuresPanel onWidth={setPanelInset} onClose={() => setPanel(null)} />
      )}

      {/* Zoom, on screen, while a plot is raised.

          Not decoration and not a fallback for a broken gesture: it is
          the only zoom that is guaranteed to be reachable. A pinch can
          be swallowed by whatever the parent floats over the map, a
          wheel needs a mouse, and neither exists on a demo tablet
          someone is holding in one hand in front of a customer.

          zIndex 6 puts it over the orbit surface. It sits above
          whatever the parent reserved at the bottom, so it never hides
          under the quotation sheet — that is what `reserve` is for. */}
      {selected && (
        <div
          style={{
            position: 'absolute', zIndex: 6,
            /* clear of the notch, the home indicator and a landscape
               phone's rounded corner, on top of whatever the parent
               reserved for its sheet */
            right: safeArea('right', 12),
            bottom: safeArea('bottom', (inset.bottom || 0) + 16),
            display: 'grid', gap: 8, justifyItems: 'center',
          }}
        >
          {[
            { k: 'in', label: '+', title: 'Zoom in', act: () => nudgeZoom(ZOOM_STEP) },
            { k: 'out', label: '−', title: 'Zoom out', act: () => nudgeZoom(-ZOOM_STEP) },
            { k: 'fit', label: '⌂', title: 'Fit plot', act: fitPick },
          ].map((b) => (
            <button
              key={b.k}
              type="button"
              title={b.title}
              aria-label={b.title}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={b.act}
              style={{
                /* 44 px is the smallest target a finger lands on
                   reliably — Apple's figure, and Google's 48 dp rounds
                   to about the same. Do not shrink these on a phone;
                   the phone is where they matter most. */
                width: 44, height: 44,
                /* 16 px or more, or iOS Safari zooms the page when the
                   control is focused */
                font: `500 18px/1 ${MONO}`,
                WebkitTapHighlightColor: 'transparent',
                WebkitAppearance: 'none',
                appearance: 'none',
                color: '#E7E1D5',
                background: CANVAS,
                border: `1px solid ${HAIR}`,
                borderRadius: 12,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                touchAction: 'manipulation',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

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

      {/* The key to the sale colours. It is up by default now, because
          the colours are — see ownStatus. `status` can be undefined on
          the first frames, before the Firestore read lands, so the
          legend is given an empty map rather than being allowed to
          index into nothing. */}
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