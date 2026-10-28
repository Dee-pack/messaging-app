import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

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