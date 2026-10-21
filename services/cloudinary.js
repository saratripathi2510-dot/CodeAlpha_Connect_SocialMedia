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
 * Upload a file buffer to Cloudinary (with fallback to local storage if Cloudinary is not configured)
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - { folder, resource_type, originalname }
 * @returns {Promise<{ url: string, public_id: string|null, resource_type: string }>}
 */
function uploadMedia(buffer, options = {}) {
  const folder = options.folder || 'connect/media';
  const resource_type = options.resource_type || 'auto';

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

  // Graceful fallback for local development if Cloudinary credentials are not provided
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
      // Extract public_id from Cloudinary URL
      // Example: https://res.cloudinary.com/<cloud>/image/upload/v12345/connect/posts/abc123.jpg
      const matches = mediaUrl.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
      if (matches && matches[1]) {
        const publicId = matches[1];
        await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType === 'video' ? 'video' : 'image'
        });
      }
    } else if (mediaUrl.startsWith('/uploads/')) {
      // Local file removal
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
  uploadMedia,
  deleteMedia
};
