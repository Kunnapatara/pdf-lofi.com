/**
 * IndexedDB storage bridge for PDF-LoFi.
 * Delegates to DocumentRepository abstraction.
 */
import { LocalDocument } from '../types/pdf';
import { documentRepository } from './documentRepository';

export async function saveDocumentToDB(doc: LocalDocument): Promise<void> {
  return documentRepository.save(doc);
}

export async function getRecentDocumentsFromDB(limit = 10): Promise<LocalDocument[]> {
  return documentRepository.getRecent(limit);
}

export async function getDocumentFromDB(id: string): Promise<LocalDocument | null> {
  return documentRepository.getById(id);
}

export async function deleteDocumentFromDB(id: string): Promise<void> {
  return documentRepository.delete(id);
}

export async function clearAllDocumentsFromDB(): Promise<void> {
  return documentRepository.clear();
}
