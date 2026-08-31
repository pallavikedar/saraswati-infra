// models/userModel.js — the Dart UserModel, as plain objects.
//
// Deliberately not a class: these users get JSON-encoded into localStorage
// and decoded again, and a decoded object has no methods. So the role
// checks are standalone functions taking a user, and they behave the same
// on a fresh Firestore read and on a restored session — where a class
// would have silently lost `isAdmin`.

/**
 * Mirrors UserModel.fromMap(data, uid). Note uid comes from the DOCUMENT
 * ID, matching the Dart call sites — the `uid` field inside the doc is
 * written for convenience but is not the source of truth.
 */
export function userFromDoc(data, id) {
  return {
    uid: id,
    email: data.email ?? '',
    name: data.name ?? '',
    groupName: data.groupName ?? '',
    password: data.password ?? '',
    role: data.role ?? 'employee',
    createdDate: parseDate(data.createdDate),
    isAccessGranted: data.isAccessGranted ?? false,
  };
}

/** DateTime.tryParse(…) ?? DateTime.now() */
function parseDate(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();      // in case a Timestamp slips in
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Mirrors toMap() — createdDate goes back out as an ISO string. */
export function userToMap(user) {
  return {
    uid: user.uid,
    email: user.email,
    name: user.name,
    groupName: user.groupName,
    password: user.password,
    role: user.role,
    createdDate: user.createdDate instanceof Date
      ? user.createdDate.toISOString()
      : user.createdDate,
    isAccessGranted: user.isAccessGranted,
  };
}

/** Builds a new employee — the Dart constructor's defaults, in one place. */
export function newEmployee({ uid, email, name, groupName = '', password }) {
  return {
    uid,
    email: email.trim(),
    name: name.trim(),
    groupName: groupName.trim(),
    password: password.trim(),
    role: 'employee',
    createdDate: new Date(),
    isAccessGranted: false,   // blocked until an admin grants access
  };
}

export const isAdmin = (u) => !!u && u.role === 'admin';
export const isGuest = (u) => !!u && u.role === 'guest';
export const isEmployee = (u) => !!u && u.role === 'employee';

/** Admins and guests always pass; employees need the granted flag. */
export const canSignIn = (u) => isAdmin(u) || isGuest(u) || u?.isAccessGranted === true;