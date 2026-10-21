const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary from environment variables
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
  });
} else if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Checks if Cloudinary credentials are fully configured.
 */
function isCloudinaryConfigured() {
  const config = cloudinary.config();
  return Boolean(config.cloud_name && config.api_key && config.api_secret);
}

/**
 * Validates Cloudinary configuration on server startup.
 * In production (Render), missing keys throw an immediate fatal error to prevent silent local fallback.
 */
function validateCloudinaryConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
  const hasIndividualKeys = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  if (!hasCloudinaryUrl && !hasIndividualKeys) {
    const missing = [];
    if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
    if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');

    const errorMessage = [
      '\n=================================================================================',
      '🚨 FATAL ERROR: Cloudinary credentials are MISSING in production environment!',
      '---------------------------------------------------------------------------------',
      'Render uses an ephemeral disk — all local uploads (/uploads/*) will be deleted on',
      'every deploy and container restart.',
      '',
      `Missing environment variable(s): ${missing.join(', ')} (or CLOUDINARY_URL)`,
      '',
      'Action required:',
      '1. Open your Render Dashboard -> Select this Web Service -> Environment tab.',
      '2. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      '=================================================================================\n'
    ].join('\n');

    console.error(errorMessage);
    throw new Error(`[Cloudinary Config Error] Missing production environment variables: ${missing.join(', ')}`);
  }
}

// Run validation immediately on module load if in production
validateCloudinaryConfig();

/**
 * Upload a file buffer to Cloudinary.
 * In production, this strictly requires Cloudinary.
 * In development, it falls back to local disk storage if keys are absent.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - { folder, resource_type, originalname }
 * @returns {Promise<{ url: string, public_id: string|null, resource_type: string }>}
 */
function uploadMedia(buffer, options = {}) {
  const folder = options.folder || 'connect/media';
  const resource_type = options.resource_type || 'auto';
  const isProduction = process.env.NODE_ENV === 'production';

  // If Cloudinary is configured, stream upload to Cloudinary
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type,
          transformation: resource_type === 'image' ? [{ quality: 'auto', fetch_format: 'auto' }] : []
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type
          });
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  // In production, NEVER silently fallback to local storage
  if (isProduction) {
    const errorMsg = 'Production upload failed: Cloudinary credentials are not configured.';
    console.error(`🚨 ${errorMsg}`);
    return Promise.reject(new Error(errorMsg));
  }

  // Graceful fallback ONLY for local offline development
  console.warn('⚠️ Cloudinary credentials not detected; falling back to local disk storage in public/uploads.');
  const subFolder = folder.replace(/^connect\/?/, '') || 'misc';
  const localDir = path.join(__dirname, '../public/uploads', subFolder);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const ext = options.originalname ? path.extname(options.originalname) : '.jpg';
  const filename = `${subFolder}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}${ext}`;
  const filePath = path.join(localDir, filename);

  fs.writeFileSync(filePath, buffer);

  return Promise.resolve({
    url: `/uploads/${subFolder}/${filename}`,
    public_id: null,
    resource_type
  });
}

/**
 * Delete a media file from Cloudinary or local storage.
 * @param {string} mediaUrl - The media URL stored in DB
 * @param {string} [resourceType='image'] - 'image' or 'video'
 */
async function deleteMedia(mediaUrl, resourceType = 'image') {
  if (!mediaUrl) return;

  try {
    // If it's a Cloudinary URL
    if (mediaUrl.includes('cloudinary.com') || mediaUrl.includes('res.cloudinary.com')) {
      const matches = mediaUrl.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
      if (matches && matches[1]) {
        const publicId = matches[1];
        await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType === 'video' ? 'video' : 'image'
        });
      }
    } else if (mediaUrl.startsWith('/uploads/')) {
      const localPath = path.join(__dirname, '../public', mediaUrl);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
  } catch (err) {
    console.error('Error deleting media:', err.message);
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  validateCloudinaryConfig,
  uploadMedia,
  deleteMedia
};
