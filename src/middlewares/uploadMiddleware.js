const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createUploadMiddleware = (subDir, filePrefix) => {
    // Ensure upload directories exist
    const uploadDir = `uploads/${subDir}`;
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Configure storage
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            // Generate unique filename: prefix-[timestamp]-[random].[ext]
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `${filePrefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });

    // File filter (Images and Videos)
    const fileFilter = (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh hoặc video!'), false);
        }
    };

    return multer({
        storage: storage,
        limits: {
            fileSize: 2 * 1024 * 1024 // 2MB limit (Max for Video, Images checked in controller)
        },
        fileFilter: fileFilter
    });
};

module.exports = createUploadMiddleware;
