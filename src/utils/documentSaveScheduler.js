import DocumentModel from '../models/documents.model.js';
import { getRedisClient } from './redisConnect.js';

const SAVE_INTERVAL = 10000; // 10 seconds
const documentSaveTimers = new Map();

/**
 * Schedule a debounced save to database for a document
 * @param {string} docId - MongoDB document ID
 */
export const scheduleDocumentSave = (docId) => {
  // Clear existing timer if any
  if (documentSaveTimers.has(docId)) {
    clearTimeout(documentSaveTimers.get(docId));
  }

  // Set new timer to save after SAVE_INTERVAL
  const timerId = setTimeout(async () => {
    try {
      const redisClient = getRedisClient();
      const cacheKey = `document:${docId}:content`;

      // Get content from Redis
      const content = await redisClient.get(cacheKey);

      if (content) {
        // Save to database
        await DocumentModel.findByIdAndUpdate(docId, {
          content: JSON.parse(content),
        });
        console.log(`💾 Document ${docId} saved to database`);
      }

      // Clean up timer reference
      documentSaveTimers.delete(docId);
    } catch (error) {
      console.error(`❌ Error saving document ${docId} to database:`, error);
      documentSaveTimers.delete(docId);
    }
  }, SAVE_INTERVAL);

  documentSaveTimers.set(docId, timerId);
};

/**
 * Cancel pending save for a document
 * @param {string} docId - MongoDB document ID
 */
export const cancelScheduledSave = (docId) => {
  if (documentSaveTimers.has(docId)) {
    clearTimeout(documentSaveTimers.get(docId));
    documentSaveTimers.delete(docId);
    console.log(`❌ Cancelled scheduled save for document ${docId}`);
  }
};

/**
 * Force immediate save for a document (bypasses debounce)
 * @param {string} docId - MongoDB document ID
 */
export const forceSaveDocument = async (docId) => {
  // Cancel any pending debounced save
  cancelScheduledSave(docId);

  try {
    const redisClient = getRedisClient();
    const cacheKey = `document:${docId}:content`;

    const content = await redisClient.get(cacheKey);

    if (content) {
      await DocumentModel.findByIdAndUpdate(docId, {
        content: JSON.parse(content),
      });
      console.log(`✅ Document ${docId} force saved immediately`);
      return { success: true };
    }

    return { success: false, message: 'No content found in cache' };
  } catch (error) {
    console.error(`❌ Force save error for ${docId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all pending saves (for debugging)
 */
export const getPendingSaves = () => {
  return Array.from(documentSaveTimers.keys());
};
