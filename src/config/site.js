// /* ═══════════════════════════════════════════════════════════════
//    Site settings.
//    ═══════════════════════════════════════════════════════════════ */

// /** The Firestore map this viewer opens — the same id the Flutter app
//     (`lotusvencon`, screens/map_viewer_screen.dart) uses. Everything the
//     plan draws comes out of this document and its plots. */
// export const MAP_ID = import.meta.env.VITE_MAP_ID || 'BT1meSHc2TcPf3f0VOrb';

// /** Maps JavaScript API key. Needs the Maps JavaScript API enabled and
//     this origin allowed as an HTTP referrer. */
// export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// /** Optional Cloud-console Map ID, for a custom basemap style. Not needed
//     for turning or tilting — the map container itself is what turns. */
// export const GOOGLE_MAP_STYLE_ID = import.meta.env.VITE_GOOGLE_MAP_STYLE_ID || '';

// /** How far past the plan's edge the drawing window may reach (metres),
//     and the largest texture we will ask a browser for on any one side. */
// export const PAD = 40;
// export const MAX_SHEET = 4096;


/* ═══════════════════════════════════════════════════════════════
   Site settings.
   ═══════════════════════════════════════════════════════════════ */

/** The Firestore map this viewer opens — the same id the Flutter app
    (`lotusvencon`, screens/map_viewer_screen.dart) uses. Everything the
    plan draws comes out of this document and its plots. */
export const MAP_ID = import.meta.env.VITE_MAP_ID || 'BT1meSHc2TcPf3f0VOrb';

/** Where the plots for that map are kept.
 *
 * Discovery still exists in mapRepo, but it costs a round trip per shape
 * and it runs before the real read can start. The Flutter app's current
 * layout is known, so state it: the listener attaches immediately and
 * the probes only run if this comes back empty. Change the schema in
 * Flutter and the first empty snapshot re-discovers it — this is a
 * head start, not a contract.
 *
 * kind: 'collection' → { name }          maps/<id>/<name>
 *       'query'      → { col, field }    <col> where <field> == <id>
 *       'embedded'   → { key }           maps/<id>.<key>[]
 */
export const PLOT_SOURCE = {
  kind: 'collection',
  name: 'plots',
  label: `maps/${MAP_ID}/plots`,
};

/** Where the camera starts, before any plot data has arrived.
 *
 * The map is created the moment the Maps script is ready rather than
 * waiting on Firestore, so it needs a centre up front. The site does not
 * move — these are the Chicholi ground anchors averaged. The view is
 * re-fitted to the real bounds once the layout builds. */
export const HOME_VIEW = {
  center: { lat: 21.190375, lng: 78.983383 },
  zoom: 18,
};

/** Maps JavaScript API key. Needs the Maps JavaScript API enabled and
    this origin allowed as an HTTP referrer. */
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC9IEgzx9X3YXxOSa9jjf2Da2yHioHef-0';

/** Optional Cloud-console Map ID, for a custom basemap style. Not needed
    for turning or tilting — the map container itself is what turns. */
export const GOOGLE_MAP_STYLE_ID = import.meta.env.VITE_GOOGLE_MAP_STYLE_ID || '';

/** How far past the plan's edge the drawing window may reach (metres),
    and the largest texture we will ask a browser for on any one side. */
export const PAD = 40;
export const MAX_SHEET = 4096;

