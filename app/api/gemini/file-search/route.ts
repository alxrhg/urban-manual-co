/**
 * Gemini File Search API
 * Endpoints for uploading files, creating stores, and querying with File Search
 */

import { NextRequest } from 'next/server';
import {
  createFileSearchStore,
  uploadFile,
  importFilesToStore,
  searchFiles,
  uploadDestinationGuide,
  queryDestinationInfo,
} from '@/lib/gemini-file-search';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

/**
 * POST /api/gemini/file-search/store
 * Create a new File Search store
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { action, ...params } = await request.json();

  switch (action) {
    case 'create_store': {
      const { displayName } = params;
      if (!displayName) {
        throw createValidationError('displayName is required');
      }

      const store = await createFileSearchStore(displayName);
      return createSuccessResponse({ store });
    }

    case 'upload_file': {
      const { fileData, fileName, mimeType } = params;
      if (!fileData || !fileName || !mimeType) {
        throw createValidationError('fileData, fileName, and mimeType are required');
      }

      // Convert base64 to buffer if needed
      const buffer = Buffer.from(fileData, 'base64');
      const uploadedFile = await uploadFile(buffer, fileName, mimeType);
      return createSuccessResponse({ file: uploadedFile });
    }

    case 'import_files': {
      const { storeName, fileUris } = params;
      if (!storeName || !fileUris || !Array.isArray(fileUris)) {
        throw createValidationError('storeName and fileUris array are required');
      }

      await importFilesToStore(storeName, fileUris);
      return createSuccessResponse({ success: true });
    }

    case 'search': {
      const { storeName, query, maxResults, temperature, maxOutputTokens } = params;
      if (!storeName || !query) {
        throw createValidationError('storeName and query are required');
      }

      const result = await searchFiles(storeName, query, {
        maxResults,
        temperature,
        maxOutputTokens,
      });
      return createSuccessResponse({ result });
    }

    case 'upload_guide': {
      const { storeName, fileData, fileName } = params;
      if (!storeName || !fileData || !fileName) {
        throw createValidationError('storeName, fileData, and fileName are required');
      }

      const buffer = Buffer.from(fileData, 'base64');
      const uploadedFile = await uploadDestinationGuide(storeName, buffer, fileName);
      return createSuccessResponse({ file: uploadedFile });
    }

    case 'query_destination': {
      const { storeName, query } = params;
      if (!storeName || !query) {
        throw createValidationError('storeName and query are required');
      }

      const result = await queryDestinationInfo(storeName, query);
      return createSuccessResponse({ result });
    }

    default:
      throw createValidationError('Invalid action. Valid actions: create_store, upload_file, import_files, search, upload_guide, query_destination');
  }
});

