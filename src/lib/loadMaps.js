import { GOOGLE_MAP_STYLE_ID } from '../config/site';

/* One script tag, shared across mounts. A styling Map ID, if one is
   configured, is preloaded with the script so mounting the vector map
   never triggers a second fetch. */
let mapsPromise = null;

export function loadMaps(key) {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((res, rej) => {
    if (typeof window === 'undefined') return rej(new Error('No browser window.'));
    if (window.google && window.google.maps) return res(window.google.maps);
    if (!key) {
      return rej(new Error(
        'Add VITE_GOOGLE_MAPS_API_KEY to your .env file, and enable the Maps JavaScript API on that key.',
      ));
    }
    const cb = '__chicholiMapsReady';
    window[cb] = () => res(window.google.maps);
    const s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js'
      + `?key=${encodeURIComponent(key)}`
      + '&v=weekly'
      + (GOOGLE_MAP_STYLE_ID ? `&map_ids=${encodeURIComponent(GOOGLE_MAP_STYLE_ID)}` : '')
      + `&callback=${cb}`;
    s.async = true;
    s.onerror = () => rej(new Error(
      'Google Maps did not load. Check the key, that the Maps JavaScript API is enabled, and that this origin is an allowed referrer.',
    ));
    document.head.appendChild(s);
    return undefined;
  });
  return mapsPromise;
}
