// services/Galleryservice.js — port of gallery_service.dart
//
// Same shapes on both sides of the app, so a map uploaded from Flutter
// reads correctly here and vice versa:
//   Firestore  maps/{mapId}/gallery/{imageId}
//   Storage    map_gallery/{mapId}/{millis}_{safeName}
//
// The one deliberate difference from the Dart version: the browser
// hands you a File, which already carries a name, a size and a MIME
// type, so there is no Uint8List round-trip and no extension sniffing
// unless the browser declined to guess.

import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';

const galleryCol = (mapId) => collection(db, 'maps', mapId, 'gallery');

/** Firestore doc -> the shape the UI reads. Mirrors GalleryImage. */
export function galleryImageFromDoc(d) {
  /* estimate, not null: a just-uploaded doc comes back from the local
     cache before the server has stamped uploadedAt, and without this
     the newest image renders with a blank date and sorts to the wrong
     end of the list for a second. */
  const m = d.data({ serverTimestamps: 'estimate' }) || {};
  return {
    id: d.id,
    name: m.name || '',
    url: m.url || '',
    storagePath: m.path || '',
    sizeBytes: Number(m.size) || 0,
    uploadedAt: m.uploadedAt?.toDate ? m.uploadedAt.toDate() : null,
    uploadedBy: m.uploadedBy || '',
  };
}

/**
 * Live gallery for one map. Returns the unsubscribe function, so the
 * caller does `useEffect(() => watchGallery(...), [mapId])` and the
 * listener dies with the component.
 */
export function watchGallery(mapId, onData, onError) {
  const q = query(galleryCol(mapId), orderBy('uploadedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(galleryImageFromDoc)),
    (err) => {
      console.error('[gallery]', err);
      if (onError) onError(err);
    },
  );
}

/**
 * Upload one image and record it.
 *
 * Storage first, Firestore second, and only after the URL resolves —
 * so a gallery doc never points at a file that isn't there. The reverse
 * order leaves a broken thumbnail in the list if the upload fails.
 *
 * Returns the created image so the caller can use it immediately
 * instead of waiting for the snapshot to come back around.
 */
export async function uploadGalleryImage({
  mapId, file, uploadedBy, onProgress,
}) {
  const safe = (file.name || 'image').replace(/[^A-Za-z0-9.-]/g, '');
  const path = `map_gallery/${mapId}/${Date.now()}_${safe}`;
  const ref = storageRef(storage, path);

  const task = uploadBytesResumable(ref, file, {
    contentType: file.type || contentTypeFor(safe),
  });

  await new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (s) => {
        if (onProgress && s.totalBytes > 0) {
          onProgress(s.bytesTransferred / s.totalBytes);
        }
      },
      reject,
      resolve,
    );
  });

  const url = await getDownloadURL(ref);

  const created = await addDoc(galleryCol(mapId), {
    name: file.name,
    url,
    path,
    size: file.size,
    uploadedAt: serverTimestamp(),
    uploadedBy,
  });

  return {
    id: created.id,
    name: file.name,
    url,
    storagePath: path,
    sizeBytes: file.size,
    uploadedAt: new Date(),
    uploadedBy,
  };
}

/**
 * Best-effort, same as the Dart version: if the file is already gone
 * the metadata doc still has to go, or the gallery keeps showing a
 * thumbnail that will never load.
 */
export async function deleteGalleryImage(mapId, image) {
  try {
    if (image.storagePath) await deleteObject(storageRef(storage, image.storagePath));
  } catch (err) {
    if (err?.code !== 'storage/object-not-found') {
      console.warn('[gallery] file not removed:', err);
    }
  }
  await deleteDoc(doc(db, 'maps', mapId, 'gallery', image.id));
}

/* Only reached when the browser hands over a File with an empty type,
   which happens with some Android pickers and with drag-and-drop from
   an archive. */
function contentTypeFor(name) {
  const n = name.toLowerCase();
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}