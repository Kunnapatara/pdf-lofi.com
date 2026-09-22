/**
 * Local Document Recovery Service for PDF-LoFi.
 * Safely recovers previous session state from IndexedDB when reloading.
 */
import { LocalDocument } from '../types/pdf';
import { documentRepository } from './documentRepository';

export async function recoverLatestDocument(): Promise<LocalDocument | null> {
  try {
    const recent = await documentRepository.getRecent(1);
    if (recent.length > 0) {
      const fullDoc = await documentRepository.getById(recent[0].id);
      if (fullDoc && fullDoc.data) {
        return fullDoc;
      }
    }
  } catch (err) {
    console.warn('Session recovery not possible:', err);
  }
  return null;
}
