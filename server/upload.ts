/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import multer from 'multer';

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

function createImageUploader(fieldName: string, filePrefix: string, maxSizeBytes: number, allowedMimeTypes: Record<string, string>) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = allowedMimeTypes[file.mimetype] || '';
      const companyId = req.auth?.companyId || 'unknown';
      cb(null, `${filePrefix}-${companyId}-${Date.now()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes[file.mimetype]) {
        cb(new Error('Formato de imagem não suportado. Use PNG, JPG, WEBP ou SVG.'));
        return;
      }
      cb(null, true);
    },
  }).single(fieldName);
}

export const uploadLogo = createImageUploader('logo', 'logo', 2 * 1024 * 1024, ALLOWED_MIME_TYPES);

// Cover photos are full-bleed background images, not icons — no SVG (vector icons don't make good photo
// backgrounds) and a larger size limit since real photos are heavier than a logo.
const COVER_PHOTO_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};
export const uploadCoverPhoto = createImageUploader('coverPhoto', 'cover', 5 * 1024 * 1024, COVER_PHOTO_MIME_TYPES);
