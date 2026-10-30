import multer from "multer";
import { EXTENSIONS } from "../storage.js";

// Accepts one image in the form field `field`, up to maxMB megabytes.
// Rejects other file types and turns multer's errors into our usual JSON shape.
export function imageUpload(field, maxMB) {
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxMB * 1024 * 1024 },
        fileFilter(req, file, cb) {
            if (!EXTENSIONS[file.mimetype]) return cb(new Error("INVALID_TYPE"));
            cb(null, true);
        },
    });

    return (req, res, next) => {
        upload.single(field)(req, res, (err) => {
            if (!err) return next();
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({ errors: [`Image must be ${maxMB} MB or smaller`] });
            }
            if (err.message === "INVALID_TYPE") {
                return res.status(400).json({ errors: ["Only JPEG, PNG, WebP or GIF images are allowed"] });
            }
            next(err);
        });
    };
}