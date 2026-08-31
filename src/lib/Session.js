// lib/session.js — the signed-in uid, read straight from localStorage.
//
// authService owns the session; this is the small read-only view of it
// that other modules need. It exists so a component can answer "who is
// signed in?" without waiting on a context that may still be resolving,
// and without importing the whole auth service.
//
// The key must match SESSION_KEY in authService.js.

const SESSION_KEY = 'saraswati_session_user';

/** The stored session object, or null. Never throws on bad JSON. */
export function sessionUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * The signed-in uid, or ''.
 *
 * This is the same string as the user document's id in saraswati_user,
 * because ensureSeedUser and registerEmployee both write `uid: ref.id`.
 * It is what every quotation carries as createdByUid, and what the list
 * query filters on — one value, three places, no translation.
 *
 * Note what this does NOT do: it does not verify the session. A stale
 * localStorage entry still returns a uid here. Verification is
 * loadSession()'s job, which re-reads the document and re-checks
 * canSignIn — this helper is for wiring, not for trust.
 */
export function sessionUid() {
  return sessionUser()?.uid || '';
}