import { getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { docAtPath } from './paths';
import { statusDocValue } from '../theme/status';

/**
 * Set a plot's sale status on the document it was read from.
 *
 * Writes only the status, so everything the Flutter app owns — corners,
 * owner, notes, dimensions — is untouched. Embedded plots (stored as an
 * array on the map document) need the whole array rewritten, which is
 * read-modify-write and therefore last-writer-wins; a subcollection is
 * the better shape if two people ever edit at once.
 */
export async function writePlotStatus(plot, statusKey) {
  const status = statusDocValue(statusKey);
  const ref = docAtPath(plot.docPath);

  if (plot.embeddedIndex == null) {
    await updateDoc(ref, { status, updatedAt: serverTimestamp() });
    return;
  }

  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error(`Map document ${plot.docPath} is gone.`);
  const rows = [...(snap.data()[plot.embeddedKey] || [])];
  if (!rows[plot.embeddedIndex]) throw new Error(`Plot ${plot.plotNo} is no longer in the array.`);
  rows[plot.embeddedIndex] = { ...rows[plot.embeddedIndex], status };
  await updateDoc(ref, { [plot.embeddedKey]: rows, updatedAt: serverTimestamp() });
}
