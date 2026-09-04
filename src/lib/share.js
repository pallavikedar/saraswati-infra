// lib/share.js
//
// One place that knows what a shareable map URL looks like. The card
// button, the public route in main.jsx and the Firestore rules all have
// to agree on this shape, so it is written once here rather than three
// times in three files.

export const SHARE_ROOT = '/share/maps';

export const mapShareUrl = (mapId) =>
  `${window.location.origin}${SHARE_ROOT}/${encodeURIComponent(mapId)}`;

/**
 * Hand a map link to whatever the device offers.
 *
 * Native sheet first: on Android Chrome and iOS Safari that lists
 * WhatsApp alongside everything else the customer actually uses, which
 * is better than forcing one app. wa.me is the desktop fallback — with
 * no phone number in the URL it opens WhatsApp's own contact picker,
 * which is what a salesman wants anyway.
 *
 * navigator.share needs HTTPS and a real user gesture, so it will not
 * fire from a timeout, and it is absent on plain http://localhost.
 * Local testing therefore always exercises the wa.me path.
 */
export async function shareMap(map) {
  const url = mapShareUrl(map.id);
  const name = map.name || 'Layout map';
  const text = `${name}\n${url}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: name, text: name, url });
      return 'shared';
    } catch (err) {
      // The customer closing the sheet is not a failure — stop here
      // rather than shoving WhatsApp at them a second time.
      if (err?.name === 'AbortError') return 'cancelled';
      // anything else: fall through
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  return 'whatsapp';
}

/** Fallback for "copy link" affordances; throws if the clipboard is blocked. */
export async function copyMapLink(map) {
  await navigator.clipboard.writeText(mapShareUrl(map.id));
}