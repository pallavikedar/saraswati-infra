// Firestore-backed sign-in, plus the session that survives a reload.

import {
  collection, doc, getDoc, getDocs, limit, query, where,
} from 'firebase/firestore';
import { db } from '../firebase/db';

const USERS = 'users';                     // ← your collection name
const SESSION_KEY = 'plotviewer_session';

export function userFromDoc(data, id) {
  return {
    uid: id,
    email: data.email ?? '',
    name: data.name ?? '',
    role: data.role ?? 'viewer',
    isAccessGranted: data.isAccessGranted ?? false,
    maps: Array.isArray(data.maps) ? data.maps : null,   // null = all maps
  };
}

const canSignIn = (u) => u.role === 'admin' || u.isAccessGranted === true;

export async function signIn(email, password) {
  const snap = await getDocs(query(
    collection(db, USERS),
    where('email', '==', email.trim().toLowerCase()),
    where('password', '==', password),
    limit(1),
  ));

  if (snap.empty) throw new Error('That email and password don’t match an account.');

  const user = userFromDoc(snap.docs[0].data(), snap.docs[0].id);
  if (!canSignIn(user)) {
    throw new Error('This account is awaiting approval. Ask your administrator to enable it.');
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: user.uid }));
  return user;
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

/** Re-checks the stored uid against Firestore, so revoked access doesn't linger. */
export async function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  let uid;
  try { uid = JSON.parse(raw).uid; } catch { signOut(); return null; }
  if (!uid) { signOut(); return null; }

  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) { signOut(); return null; }

  const user = userFromDoc(snap.data(), snap.id);
  if (!canSignIn(user)) { signOut(); return null; }
  return user;
}