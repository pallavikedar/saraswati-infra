// services/quotationService.js — the data behind the Quotations tab.

import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy,
  query, updateDoc, where,
} from 'firebase/firestore';

import { db } from '../firebase/config';
import { MAP_ID } from '../config/site';
import { fromDoc } from '../lib/Quote';

/**
 * ONE collection, shared with the Flutter app.
 *
 * QuotationService.dart writes to `quotations_saraswati` and keys the
 * employee filter on `createdByUid`. An earlier version of this file read
 * `quotations` on `employeeId`, which is a different dataset — a
 * quotation saved on the phone never appeared on the web and the other
 * way round. Both clients now point at the same place.
 *
 * If there are live records under the old name, they have to be migrated
 * or read separately; changing this constant alone will not find them.
 */
export const QUOTATIONS = 'quotations_saraswati';

const col = () => collection(db, QUOTATIONS);

/** Returns the new document id, like createQuotation in Dart. */
export async function createQuotation(data) {
  const ref = await addDoc(col(), data);
  return ref.id;
}

export function updateQuotation(id, data) {
  return updateDoc(doc(db, QUOTATIONS, id), data);
}

export function deleteQuotation(id) {
  return deleteDoc(doc(db, QUOTATIONS, id));
}

export async function getQuotation(id) {
  const snap = await getDoc(doc(db, QUOTATIONS, id));
  return snap.exists() ? fromDoc(snap.data(), snap.id) : null;
}

/** Every quotation, newest first. Returns the unsubscribe fn. */
export function watchAllQuotations(onChange, onError) {
  return onSnapshot(
    query(col(), orderBy('quotationDate', 'desc')),
    (snap) => onChange(snap.docs.map((d) => fromDoc(d.data(), d.id))),
    onError,
  );
}

/**
 * Live quotations for one employee.
 *
 * The where + orderBy pair needs a composite index on
 * (createdByUid asc, quotationDate desc). Firestore's error message
 * carries a link that creates it; until then this callback only ever
 * fires onError, which is why the sort is not done here in JS —
 * silently degrading would hide the missing index.
 */
export function watchEmployeeQuotations(uid, onChange, onError) {
  return onSnapshot(
    query(col(), where('createdByUid', '==', uid), orderBy('quotationDate', 'desc')),
    (snap) => onChange(snap.docs.map((d) => fromDoc(d.data(), d.id))),
    onError,
  );
}

/**
 * Every enabled map. `isEnabled` is filtered in JS rather than in the
 * query because older map documents predate the field, and a `where`
 * clause would silently drop them — Firestore has no "missing or true".
 */
export async function fetchMaps() {
  const snap = await getDoc(doc(db, 'maps', MAP_ID));
  if (!snap.exists()) return [];
  const map = { id: snap.id, ...snap.data() };
  return map.isEnabled === false ? [] : [map];
}