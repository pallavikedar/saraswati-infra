# Plot master plan — web viewer

The `ChicholiMasterPlan.jsx` look and interaction, rebuilt as a Vite +
React project that draws **live Firestore data** instead of an inlined
CAD extract.

The JSX was the design reference: the printed-sheet feel, the
metres-not-pixels rule, the raised block with its dimension figures, the
warm plot tones. All of that is kept. What's gone is the static `LAYOUT`
object and everything that existed to align it — control points, nudge
sliders, Align 2 points, Copy fit. Plots come out of Firestore with real
lat/lng corners, so there is nothing left to georeference.

```bash
npm install
cp .env.example .env      # add your Maps key
npm run dev
```

The Maps key needs the Maps JavaScript API enabled and your origins
(`http://localhost:5173` for dev) added as HTTP referrer restrictions.
The Firebase config is already committed in `src/firebase/config.js`.

## Where the data comes from

```
maps/BT1meSHc2TcPf3f0VOrb                the layout document
maps/BT1meSHc2TcPf3f0VOrb/plots/{id}     PlotData documents
maps/BT1meSHc2TcPf3f0VOrb/quotations/{id}
```

I couldn't reach your Firestore to confirm the subcollection name, so
`src/firebase/mapRepo.js` probes for it on first load and remembers what
answered. It tries, in order:

1. `maps/{id}/plots`, then `features`, `polygons`, `layout`
2. a root `plots` collection filtered by `mapId == {id}`
3. an array field (`plots` / `features` / `polygons`) on the map document

If none of them has documents, the app says exactly which paths it read
rather than showing an empty map. If your plots live somewhere else, add
that path to `SUBCOLLECTIONS` at the top of `mapRepo.js` — one line.

Each plot needs a `corners` array of at least three `{ lat, lng }` points.
Everything else is optional and used when present.

## Fields, straight from plot_data.dart

`src/models/PlotData.js` is a one-for-one port of your Dart model — same
field names, same `plotNo` coercions (List values joined with `/`, Map
values unwrapped, `"[88]"` brackets stripped, a baked-in `"Plot "` prefix
removed), same ISO `createdDate`. So a document written by `lotusvencon`
renders correctly here, and a status set here reads back correctly there.

| Field | What the viewer does with it |
|---|---|
| `corners` | the polygon — required |
| `plotNo` | the number drawn on the plot and searched in the toolbar |
| `type` | picks the land use: plot, road, open space, amenity, HTL, utility |
| `area` | trusted as drawn; falls back to the ring's own area |
| `labelPosition` | where the number sits; falls back to the centroid |
| `status` | the sale colour and the status filter |
| `title` | the label for roads and open spaces |
| `dimensions`, `facing`, `ownerName`, `contactPhone`, `notes` | shown in the detail panel when filled in |

`type` is matched loosely — `ROAD`, `road`, `internal_road` and
`Service Road` all land on the road palette. Unrecognised types are drawn
as plots. The alias table is at the top of `src/data/buildLayout.js`.

Statuses map to the Dart strings exactly: `Available`, `Token`,
`Partial Payment`, `Agreement`, `Sold`, with legacy `Booked` and
`Reserved` folded into Token and Partial Payment on read. Colours match
`getPlotColor()` — except Available, which keeps the master plan's warm
tan instead of flat white. **Status colours** in the toolbar switches
between the master-plan tones and the sale palette.

Setting a status writes only the `status` field, back to the exact
document it was read from, so corners, owner and notes are never touched.

## How the plan is drawn

One metre frame is anchored at the middle of the layout, and every corner
becomes plain metres east and south. From there the drawing is identical
to the reference: strokes, plot numbers, road names and dimension figures
are all sized on the ground, so zooming makes the same drawing bigger
rather than restyling it. Round-tripping a corner through the frame is
exact to floating-point zero across a half-kilometre site.

Only the visible window is rasterised, at the size it appears on screen —
a single sheet for the whole layout would need ~6800 px at zoom 21 and
double that per step after, which is what turns everything to mush past
the texture cap.

Selecting a plot raises it three metres off its own socket and tilts the
view. The camera turns the map *container*, not the plan, so imagery,
plots and the raised block are one element and cannot drift out of
register. Drag to turn, **360** to orbit, **N** to level off.

## What lives where

```
src/
  config/site.js          the map id, the Maps key, the window budget
  theme/tokens.js         palette, type, and the physical constants the
                          plan is drawn with (all in metres)
  theme/status.js         the five sale states ⇄ PlotData.status strings

  models/PlotData.js      the web twin of models/plot_data.dart
  firebase/mapRepo.js     path resolution + the live subscription
  firebase/plotsRepo.js   status writes, subcollection or embedded array
  firebase/quotationsRepo.js

  data/buildLayout.js     Firestore documents → the drawable plan
  lib/geo.js              the metre frame
  lib/geometry.js         centroid, edge lengths, inradius, fillet runs
  lib/matrix.js           the quad → matrix3d that lands the SVG on the ground
  lib/labels.js           fitted number size

  hooks/useMapLayout      the plan, live, with optimistic status edits
  hooks/usePlanCamera     tilt easing, the 360, container transform
  hooks/usePlanOverlay    the four ground-pinned layers
  hooks/useGoogleMaps     script load state
  hooks/usePlotFilters    search / area / status → a Set of plot numbers

  components/map/         PlanMap, PlanContent, DimensionOverlay, CameraControls
  components/panels/      Toolbar, DetailPanel
  components/modals/      QuotationModal
  components/ui/          Chip, Eyebrow, NumberField
```

## Rules

`firestore.rules` ships open for reads and closed for writes, so the
viewer works and nothing can be edited until you wire up auth. To let
sales staff set statuses, change the plot rule to
`allow update: if request.auth != null;` and deploy:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

## Deploying

```bash
npm run build
firebase deploy --only hosting
```

## Notes on the port

- **Frontage** in the detail panel is the shortest straight side, not the
  longest — the longest is the depth. Fillet chords are excluded from
  both, the same way `buildRuns` already excluded them from the dimension
  overlay.
- **Road names run along the road.** With no CAD label angles in the
  data, a road polygon's longest edge is used as the text direction,
  which is what the original sheet did by hand.
- **The quotation modal reports a failed save** instead of flashing
  "Saved" regardless.
