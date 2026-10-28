import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
router.use(authenticate);

const userSelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
    lastSeenAt: true,
};

// Blocks anyone who isn't a member of the conversation in :id.
// Returns 404 (not 403) so we don't reveal which conversation ids exist.
async function requireParticipant(req, res, next) {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation id" });
    }

    try {
        const membership = await prisma.participant.findUnique({
            where: { userId_conversationId: { userId: req.user.id, conversationId } },
        });
        if (!membership) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        req.conversationId = conversationId;
        next();
    } catch (err) {
        next(err);
    }
}

// GET /conversations  ->  my inbox, most recent activity first
router.get("/", async (req, res, next) => {
    try {
        const conversations = await prisma.conversation.findMany({
            where: { participants: { some: { userId: req.user.id } } },
            include: {
                participants: { include: { user: { select: userSelect } } },
                messages: {
                    orderBy: { id: "desc" },
                    take: 1,
                    include: { sender: { select: { id: true, username: true, displayName: true } } },
                },
            },
        });

        const result = conversations
            .map((c) => ({
                id: c.id,
                isGroup: c.isGroup,
                name: c.name,
                participants: c.participants.map((p) => p.user),
                lastMessage: c.messages[0] ?? null,
                updatedAt: c.messages[0]?.createdAt ?? c.createdAt,
            }))
            .sort((a, b) => b.updatedAt - a.updatedAt);

        res.json({ conversations: result });
    } catch (err) {
        next(err);
    }
});

// POST /conversations  { userId }  ->  start (or reopen) a 1-to-1 chat
router.post(
    "/",
    [body("userId").isInt({ min: 1 }).withMessage("userId is required").toInt()],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        }

        try {
            const me = req.user.id;
            const other = req.body.userId;

            if (other === me) {
                return res.status(400).json({ errors: ["You can't start a chat with yourself"] });
            }

            const otherUser = await prisma.user.findUnique({ where: { id: other } });
            if (!otherUser) {
                return res.status(404).json({ errors: ["User not found"] });
            }

            // Reuse the existing 1-to-1 conversation if there is one
            const existing = await prisma.conversation.findFirst({
                where: {
                    isGroup: false,
                    AND: [
                        { participants: { some: { userId: me } } },
                        { participants: { some: { userId: other } } },
                    ],
                },
            });
            if (existing) return res.json({ conversation: { id: existing.id } });

            const created = await prisma.conversation.create({
                data: {
                    participants: { create: [{ userId: me }, { userId: other }] },
                },
            });

            res.status(201).json({ conversation: { id: created.id } });
        } catch (err) {
            next(err);
        }
    }
);

// GET /conversations/:id/messages
//   default:     the latest 50 messages, oldest first
//   ?after=<id>: only messages newer than that id (for polling)
router.get("/:id/messages", requireParticipant, async (req, res, next) => {
    try {
        const after = Number(req.query.after);
        const sender = { select: userSelect };

        let messages;
        if (Number.isInteger(after) && after > 0) {
            messages = await prisma.message.findMany({
                where: { conversationId: req.conversationId, id: { gt: after } },
                orderBy: { id: "asc" },
                include: { sender },
            });
        } else {
            messages = await prisma.message.findMany({
                where: { conversationId: req.conversationId },
                orderBy: { id: "desc" },
                take: 50,
                include: { sender },
            });
            messages.reverse();
        }

        res.json({ messages });
    } catch (err) {
        next(err);
    }
});

// POST /conversations/:id/messages  { content }
router.post(
    "/:id/messages",
    requireParticipant,
    [
        body("content")
            .trim()
            .isLength({ min: 1, max: 2000 })
            .withMessage("Message must be 1-2000 characters"),
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        }

        try {
            const message = await prisma.message.create({
                data: {
                    content: req.body.content,
                    senderId: req.user.id, // from the token, never from the request body
                    conversationId: req.conversationId,
                },
                include: { sender: { select: userSelect } },
            });

            res.status(201).json({ message });
        } catch (err) {
            next(err);
        }
    }
);

export default router;