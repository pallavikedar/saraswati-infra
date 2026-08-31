// services/authService.js — port of AuthService.dart
//
// Same collection, same field names, same access gate as the Flutter app,
// so both clients read and write one user store. SharedPreferences becomes
// localStorage; everything else is a one-to-one translation.
//
// NOTE ON PASSWORDS: this keeps the existing scheme, where the password is
// a plain field on the user doc and sign-in is a Firestore query. It only
// holds up if your security rules forbid client reads of `saraswati_user`
// — and a browser can't do that, because the query has to run client-side.
// See the README section "Moving to Firebase Auth" before this goes live.

import {
  collection, doc, getDoc, getDocs, limit, onSnapshot,
  query, setDoc, updateDoc, deleteDoc, where,
} from 'firebase/firestore';

import { db } from '../firebase/config';
import { userFromDoc, userToMap, canSignIn } from '../models/userModel';

const USERS = 'saraswati_user';
const SESSION_KEY = 'saraswati_session_user';

const usersRef = () => collection(db, USERS);

async function findByEmail(email) {
  const snap = await getDocs(
    query(usersRef(), where('email', '==', email.trim()), limit(1)),
  );
  return snap.empty ? null : snap.docs[0];
}

// ─── Admin & Guest bootstrap ────────────────────────────────────────────
export async function ensureAdminExists() {
  await ensureSeedUser({
    email: 'admin@gmail.com',
    password: 'admin@1223',
    name: 'Admin',
    role: 'admin',
  });
  await ensureSeedUser({
    email: 'guest@saraswatiinfra.com',
    password: 'guest@pass',
    name: 'Guest',
    role: 'guest',
  });
}

async function ensureSeedUser({ email, password, name, role }) {
  const existing = await findByEmail(email);
  if (existing) return;
  const ref = doc(usersRef());
  await setDoc(ref, {
    uid: ref.id,
    email,
    password,
    name,
    groupName: '',
    role,
    createdDate: new Date().toISOString(),
    isAccessGranted: true,
  });
}

// ─── Session persistence ────────────────────────────────────────────────
function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(userToMap(user)));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Call once on app start, before rendering the login screen. Re-validates
 * against Firestore so a deleted doc or a revoked employee doesn't stay
 * signed in on the strength of a stale localStorage entry.
 */
export async function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  let uid;
  try {
    uid = JSON.parse(raw).uid;
  } catch {
    clearSession();
    return null;
  }
  if (!uid) {
    clearSession();
    return null;
  }

  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) {
    clearSession();
    return null;
  }

  const user = userFromDoc(snap.data(), snap.id);
  if (!canSignIn(user)) {
    clearSession();
    return null;
  }
  return user;
}

// ─── Sign in ────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const snap = await getDocs(query(
    usersRef(),
    where('email', '==', email.trim()),
    where('password', '==', password.trim()),
    limit(1),
  ));

  if (snap.empty) throw new Error('Invalid email or password.');

  const user = userFromDoc(snap.docs[0].data(), snap.docs[0].id);
  if (!canSignIn(user)) {
    throw new Error('Access not granted. Please contact your administrator.');
  }

  saveSession(user);
  return user;
}

// ─── Register employee ──────────────────────────────────────────────────
export async function registerEmployee({ email, name, groupName = '', password }) {
  if (await findByEmail(email)) throw new Error('Email already registered.');

  const ref = doc(usersRef());
  const user = {
    uid: ref.id,
    email: email.trim(),
    name: name.trim(),
    groupName: groupName.trim(),
    password: password.trim(),
    role: 'employee',
    createdDate: new Date().toISOString(),
    isAccessGranted: false, // blocked until an admin grants access
  };

  await setDoc(ref, user);
  return user;
}

// ─── Admin actions ──────────────────────────────────────────────────────
export function setEmployeeAccess(uid, granted) {
  return updateDoc(doc(db, USERS, uid), { isAccessGranted: granted });
}

export function deleteEmployee(uid) {
  return deleteDoc(doc(db, USERS, uid));
}

export function signOut() {
  clearSession();
}

/**
 * Live employee list for the admin table — the StreamBuilder equivalent.
 * Returns the unsubscribe function, so call it from a useEffect cleanup.
 */
export function watchEmployees(onChange, onError) {
  return onSnapshot(
    query(usersRef(), where('role', '==', 'employee')),
    (snap) => onChange(snap.docs.map((d) => userFromDoc(d.data(), d.id))),
    onError,
  );
}