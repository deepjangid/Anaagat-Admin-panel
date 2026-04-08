import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationsRoutes from "./routes/applicationsRoutes.js";

dotenv.config();

const app = express();

const stripWrappingQuotes = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  const doubleQuoted = v.match(/^"(.*)"$/);
  if (doubleQuoted) return String(doubleQuoted[1]).trim();
  const singleQuoted = v.match(/^'(.*)'$/);
  if (singleQuoted) return String(singleQuoted[1]).trim();
  return v;
};

const normalizeOrigin = (value) => {
  const raw = stripWrappingQuotes(value).trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
};

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN
      .split(",")
      .map((o) => normalizeOrigin(o))
      .filter(Boolean)
  : [];
const corsAllowAll = corsOrigins.includes("*");

const corsOptions = {
  origin: (origin, callback) => {
    // Some requests (same-origin / server-to-server) may not include Origin; allow them.
    if (!origin) return callback(null, true);

    // If not configured, allow all (tighten in production via CORS_ORIGIN).
    if (corsAllowAll || corsOrigins.length === 0) return callback(null, true);

    if (corsOrigins.includes(origin)) return callback(null, true);
    console.warn("[cors] blocked origin:", origin, "allowed:", corsOrigins);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

console.log(
  "[cors] allowlist:",
  corsAllowAll ? "*" : corsOrigins.length ? corsOrigins : "(not set - allow all)"
);

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationsRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected", mongoose.connection.name);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("DB connection error:", err);
  }
};

startServer();
