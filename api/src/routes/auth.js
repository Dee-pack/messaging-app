import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// Never send passwordHash to the client
const publicUser = {
    id: true,
    username: true,
    email: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
    createdAt: true,
};

const signToken = (userId) =>
    jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: "7d" });

const registerRules = [
    body("username")
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage("Username must be 3-20 characters")
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Username can only contain letters, numbers and underscores"),
    body("email").trim().isEmail().withMessage("Enter a valid email").toLowerCase(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

const loginRules = [
    body("email").trim().isEmail().toLowerCase(),
    body("password").notEmpty(),
];

router.post("/register", registerRules, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
    }

    try {
        const { username, email, password } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: { username, email, passwordHash, displayName: username },
            select: publicUser,
        });

        res.status(201).json({ token: signToken(user.id), user });
    } catch (err) {
        if (err.code === "P2002") {
            return res.status(409).json({ errors: ["Username or email is already taken"] });
        }
        next(err);
    }
});

router.post("/login", loginRules, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: ["Enter your email and password"] });
    }

    try {
        const { email, password } = req.body;
        const found = await prisma.user.findUnique({ where: { email } });

        // Same message for unknown email and wrong password
        const ok = found && (await bcrypt.compare(password, found.passwordHash));
        if (!ok) {
            return res.status(401).json({ errors: ["Invalid email or password"] });
        }

        const user = await prisma.user.findUnique({
            where: { id: found.id },
            select: publicUser,
        });

        res.json({ token: signToken(user.id), user });
    } catch (err) {
        next(err);
    }
});

// Temporary check that the middleware works; profile routes come later
router.get("/me", authenticate, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: publicUser,
        });
        if (!user) return res.status(401).json({ error: "User no longer exists" });
        res.json({ user });
    } catch (err) {
        next(err);
    }
});

export default router;