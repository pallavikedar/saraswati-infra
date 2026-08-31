import { addDoc, serverTimestamp } from 'firebase/firestore';
import { quotationsCol } from './paths';

/** Save a quotation under the map it belongs to. Returns false when the
    write is refused, so the modal can say so instead of pretending. */
export async function saveQuotation(record) {
  try {
    await addDoc(quotationsCol(), { ...record, createdAt: serverTimestamp() });
    return true;
  } catch (err) {
    console.error('Quotation not saved:', err);
    return false;
  }
}
