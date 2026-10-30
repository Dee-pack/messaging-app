import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";
import { withPresence } from "../presence.js";
import { imageUpload } from "../middleware/imageUpload.js";
import { uploadImage } from "../storage.js";

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
                participants: c.participants.map((p) => withPresence(p.user)),
                lastMessage: c.messages[0] ?? null,
                updatedAt: c.messages[0]?.createdAt ?? c.createdAt,
            }))
            .sort((a, b) => b.updatedAt - a.updatedAt);

        res.json({ conversations: result });
    } catch (err) {
        next(err);
    }
});

// POST /conversations
//   1-to-1:  { userId }
//   group:   { name, userIds: [...] }   (at least 2 other people)
router.post(
    "/",
    [
        body("userId").optional().isInt({ min: 1 }).withMessage("Invalid userId").toInt(),
        body("userIds")
            .optional()
            .isArray({ min: 2, max: 49 })
            .withMessage("Pick between 2 and 49 people for a group"),
        body("userIds.*").isInt({ min: 1 }).withMessage("Invalid user id").toInt(),
        body("name")
            .optional()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage("Group name must be 1-50 characters"),
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        }

        try {
            const me = req.user.id;

            // ----- Group chat -----
            if (req.body.userIds) {
                const name = req.body.name;
                if (!name) {
                    return res.status(400).json({ errors: ["Give the group a name"] });
                }

                // De-duplicate, and make sure I'm not counted as one of "the others"
                const others = [...new Set(req.body.userIds)].filter((id) => id !== me);
                if (others.length < 2) {
                    return res.status(400).json({ errors: ["A group needs at least 2 other people"] });
                }

                const found = await prisma.user.count({ where: { id: { in: others } } });
                if (found !== others.length) {
                    return res.status(404).json({ errors: ["One or more users were not found"] });
                }

                const group = await prisma.conversation.create({
                    data: {
                        isGroup: true,
                        name,
                        participants: { create: [me, ...others].map((userId) => ({ userId })) },
                    },
                });

                return res.status(201).json({ conversation: { id: group.id } });
            }

            // ----- 1-to-1 chat -----
            const other = req.body.userId;
            if (!other) {
                return res
                    .status(400)
                    .json({ errors: ["Provide userId, or a name and userIds for a group"] });
            }
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
                data: { participants: { create: [{ userId: me }, { userId: other }] } },
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

// POST /conversations/:id/messages
//   JSON:       { content }
//   multipart:  image (file) + optional content (caption)
router.post(
    "/:id/messages",
    requireParticipant, // runs first, so non-members can never upload anything
    imageUpload("image", 3),
    [
        body("content")
            .optional()
            .trim()
            .isLength({ max: 2000 })
            .withMessage("Message can be at most 2000 characters"),
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        }

        const content = (req.body.content || "").trim();
        if (!content && !req.file) {
            return res.status(400).json({ errors: ["Write a message or attach an image"] });
        }

        try {
            const imageUrl = req.file
                ? await uploadImage(req.file, `messages/${req.conversationId}`)
                : null;

            const message = await prisma.message.create({
                data: {
                    content: content || null,
                    imageUrl,
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