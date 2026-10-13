// ==============================================================================
// EDGEWFORCE - SUPABASE CLOUD STORAGE SERVICE
// Manages cloud file persistence for photos, receipts, payslips and evidence
// ==============================================================================

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { supabase, supabaseAdmin } from '../config/database.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localUploadDir = path.resolve(__dirname, '../../uploads');
if (!process.env.VERCEL) {
  try { fs.mkdirSync(localUploadDir, { recursive: true }); } catch { /* ignore */ }
}

const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'edgewforce-media';

export const storageService = {
  /**
   * Uploads a file buffer or disk file to Supabase Cloud Storage.
   * @param {Object} file Multer file object ({ buffer, originalname, mimetype, filename })
   * @param {string} folder Target subfolder (e.g. 'payslips', 'delivery_proofs', 'store_photos')
   * @returns {Promise<string>} Public CDN URL of the uploaded file
   */
  async uploadFile(file, folder = 'general') {
    if (!file) return null;
    const storageClient = supabaseAdmin || supabase;
    const requireCloud = Boolean(process.env.VERCEL) || (process.env.NODE_ENV === 'production' && process.env.DATA_BACKEND !== 'local');

    const originalName = file.originalname || 'upload.jpg';
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const uniqueName = `${folder}-${uniqueSuffix}${ext}`;
    const storagePath = `${folder}/${uniqueSuffix}${ext}`;
    const contentType = file.mimetype || 'image/jpeg';

    // 1. Upload to Supabase Storage if configured
    if (storageClient) {
      try {
        const fileData = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
        if (fileData) {
          const { data, error } = await storageClient.storage
            .from(DEFAULT_BUCKET)
            .upload(storagePath, fileData, {
              contentType,
              upsert: true
            });

          if (!error && data) {
            const { data: publicUrlData } = storageClient.storage
              .from(DEFAULT_BUCKET)
              .getPublicUrl(storagePath);

            if (publicUrlData?.publicUrl) {
              logger.info(`Uploaded file to Supabase Storage: ${storagePath}`);
              return publicUrlData.publicUrl;
            }
          } else if (error) {
            if (requireCloud) throw new Error('Cloud file upload failed. Please retry.');
            logger.warn(`Supabase Storage upload error: ${error.message}. Falling back.`);
          }
        }
      } catch (err) {
        if (requireCloud) throw new Error('Cloud file upload failed. Please retry.', { cause: err });
        logger.warn(`Failed uploading to Supabase Storage (${err.message}). Using fallback.`);
      }
    }
    if (requireCloud) throw new Error('Cloud file storage is not configured or the upload has no file data.');

    // 2. Standalone / Local / Test Fallback
    if (file.filename) {
      return `/uploads/${file.filename}`;
    }

    if (file.buffer && !process.env.VERCEL) {
      try {
        const diskPath = path.join(localUploadDir, uniqueName);
        fs.writeFileSync(diskPath, file.buffer);
        return `/uploads/${uniqueName}`;
      } catch {
        // Fall through to data URI
      }
    }

    // Serverless fallback with data URI if no cloud storage is connected
    if (file.buffer) {
      return `data:${contentType};base64,${file.buffer.toString('base64')}`;
    }

    return `/uploads/${uniqueName}`;
  },

  /**
   * Deletes a file from Supabase Storage by its public URL.
   */
  async deleteFile(fileUrl) {
    const storageClient = supabaseAdmin || supabase;
    if (!fileUrl || !storageClient || !fileUrl.includes(DEFAULT_BUCKET)) return false;
    try {
      const parts = fileUrl.split(`${DEFAULT_BUCKET}/`);
      if (parts.length > 1) {
        const filePath = parts[1];
        const { error } = await storageClient.storage.from(DEFAULT_BUCKET).remove([filePath]);
        return !error;
      }
    } catch (err) {
      logger.warn(`Failed deleting file from Supabase Storage: ${err.message}`);
    }
    return false;
  }
};
