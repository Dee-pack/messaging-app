import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
    const [scheme, token] = (req.headers.authorization || "").split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: Number(payload.sub) };
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}