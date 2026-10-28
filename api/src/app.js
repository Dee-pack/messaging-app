import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

const origins = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
app.use(cors({ origin: origins }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

// routes get mounted here as we build them
// app.use("/auth", authRoutes);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on ${port}`));