const multer = require('multer');

// Use memoryStorage so file buffer can be uploaded to Cloudinary
const storage = multer.memoryStorage();

// Post media upload (images & videos up to 25MB)
const postUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|webm|quicktime/;
    const mimeMatch = allowed.test(file.mimetype.toLowerCase());
    if (mimeMatch) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpg, png, gif, webp) and videos (mp4, mov, webm) are allowed.'));
    }
  }
});

// Avatar upload (images up to 5MB)
const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, gif, webp) are allowed for avatars.'));
    }
  }
});

// Cover photo upload (images up to 10MB)
const coverUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, gif, webp) are allowed for cover photos.'));
    }
  }
});

module.exports = {
  postUpload,
  avatarUpload,
  coverUpload
};
