const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a single file buffer to Cloudinary.
 * resourceType: 'image' | 'video' | 'raw' | 'auto'
 * folder: e.g. `giftservice/projects/${projectId}/photos`
 */
function uploadBuffer(buffer, folder, resourceType = 'auto') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/**
 * AI-enhance an already-uploaded image using Cloudinary's transformation API.
 * Returns a new enhanced URL (no re-upload needed - Cloudinary applies on the fly via URL transform).
 */
function getEnhancedUrl(publicId, { removeBg = false } = {}) {
  const transformations = ['e_improve', 'e_auto_brightness', 'e_auto_contrast', 'e_sharpen'];
  if (removeBg) transformations.push('e_background_removal');
  return cloudinary.url(publicId, {
    transformation: transformations.map((t) => ({ raw_transformation: t })),
  });
}

function deleteAsset(publicId, resourceType = 'image') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { cloudinary, uploadBuffer, getEnhancedUrl, deleteAsset };
