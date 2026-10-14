const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG, GIF, and WebP images are allowed'));
  }
}

const limits = { fileSize: MAX_FILE_SIZE };

const avatarUpload = multer({ storage, fileFilter, limits }).single('avatar');
const coverUpload = multer({ storage, fileFilter, limits }).single('cover');
const postImageUpload = multer({ storage, fileFilter, limits }).single('image');

module.exports = { avatarUpload, coverUpload, postImageUpload };
