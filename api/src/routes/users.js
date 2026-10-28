import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";
import multer from "multer";
import { EXTENSIONS, uploadImage, deleteImageByUrl } from "../storage.js";

const router = Router();

// Every route in this file requires a logged-in user
router.use(authenticate);

const publicUser = {
    id: true,
    username: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
    lastSeenAt: true, // used for online status later
    createdAt: true,
};

// GET /users?search=ada  ->  everyone except me, optionally filtered
router.get("/", async (req, res, next) => {
    try {
        const search = String(req.query.search || "").trim();

        const users = await prisma.user.findMany({
            where: {
                id: { not: req.user.id },
                ...(search && {
                    OR: [
                        { username: { contains: search, mode: "insensitive" } },
                        { displayName: { contains: search, mode: "insensitive" } },
                    ],
                }),
            },
            select: publicUser,
            orderBy: { username: "asc" },
            take: 50,
        });

        res.json({ users });
    } catch (err) {
        next(err);
    }
});

const profileRules = [
    body("displayName")
        .optional()
        .trim()
        .isLength({ min: 1, max: 40 })
        .withMessage("Display name must be 1-40 characters"),
    body("bio")
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage("Bio can be at most 200 characters"),
    body("avatarUrl")
        .optional({ values: "falsy" })
        .trim()
        .isURL()
        .withMessage("Avatar must be a valid URL"),
];

const upload = multer({
    storage: multer.memoryStorage(), // keeps the file in RAM, fine for small images
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB; the client shrinks images well below this
    fileFilter(req, file, cb) {
        if (!EXTENSIONS[file.mimetype]) return cb(new Error("INVALID_TYPE"));
        cb(null, true);
    },
});

// Turns multer's errors into our usual { errors: [...] } responses
function handleAvatarUpload(req, res, next) {
    upload.single("avatar")(req, res, (err) => {
        if (!err) return next();
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ errors: ["Image must be 2 MB or smaller"] });
        }
        if (err.message === "INVALID_TYPE") {
            return res.status(400).json({ errors: ["Only JPEG, PNG, WebP or GIF images are allowed"] });
        }
        next(err);
    });
}

// POST /users/me/avatar  (multipart form, field name "avatar")
router.post("/me/avatar", handleAvatarUpload, async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ errors: ["No image uploaded"] });
    }

    try {
        const current = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { avatarUrl: true },
        });

        const url = await uploadImage(req.file, `avatars/${req.user.id}`);

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl: url },
            select: { ...publicUser, email: true },
        });

        await deleteImageByUrl(current?.avatarUrl); // clean up the previous upload

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

// PUT /users/me  ->  edit my own profile
// NOTE: this must be defined before "/:id" or "me" would be treated as an id
router.put("/me", profileRules, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
    }

    try {
        const data = {};
        if (req.body.displayName !== undefined) data.displayName = req.body.displayName;
        if (req.body.bio !== undefined) data.bio = req.body.bio || null;
        if (req.body.avatarUrl !== undefined) data.avatarUrl = req.body.avatarUrl || null;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data,
            select: { ...publicUser, email: true },
        });

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

// GET /users/:id  ->  view someone's profile
router.get("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const user = await prisma.user.findUnique({ where: { id }, select: publicUser });
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

export default router;