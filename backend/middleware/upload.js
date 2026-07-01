const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a',
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.mov', '.webm',
  '.mp3', '.wav', '.m4a',
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mimeOk = ALLOWED_MIME.includes(file.mimetype);
    // Some browsers/OSes send a generic 'application/octet-stream' MIME type
    // for certain files — fall back to checking the file extension in that case.
    const extFallbackOk = file.mimetype === 'application/octet-stream' && ALLOWED_EXTENSIONS.includes(ext);

    if (mimeOk || extFallbackOk) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype} (${ext || 'no extension'})`));
    }
  },
});

module.exports = upload;